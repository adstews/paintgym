import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processQueueSchema } from "@/lib/validators/schemas";
import { grantRegenBudget } from "@/lib/credits";
import { htmlRenderTypeForConcept } from "@/lib/html-render/types";
import { JOB_MAX_ATTEMPTS, REGEN_FREE_BUDGET } from "@/lib/types";
import type { Generation, ImageModel } from "@/lib/types";

export const runtime = "nodejs";

// Called by the client once a batch drain finishes. Two responsibilities:
//   1. Auto-recovery — every generation that failed or never produced an image
//      is re-enqueued exactly ONE more time. The recovery_attempted flag guards
//      the loop so a row that keeps failing is never retried endlessly.
//   2. When nothing is left to recover the batch is truly settled, so the
//      project's free regeneration budget resets to its full allotment.
// After a requeue (> 0) the client re-drains and calls finalize again; the
// second pass finds recovery_attempted=true rows, returns requeued=0, and the
// loop ends. A permanently failed row stays failed and gets a manual Retry
// button in the gallery.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = processQueueSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { project_id } = parsed.data;

  const { data: project } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", project_id)
    .single();
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const admin = createAdminClient();

  // Concept-bound generations that failed or never rendered an image and have
  // not yet been auto-recovered. Scoped to concept rows (the batch path) so a
  // brief is always available to re-render from.
  const { data: stuckRows } = await admin
    .from("generations")
    .select("id, concept_id, concept_variant, prompt_text, version, model_used")
    .eq("project_id", project_id)
    .eq("recovery_attempted", false)
    .not("concept_id", "is", null)
    .or("status.eq.failed,image_url.is.null");
  const stuck = (stuckRows ?? []) as Generation[];

  // Never double-queue a generation that still has an in-flight generate job.
  const { data: activeJobs } = await admin
    .from("jobs")
    .select("generation_id")
    .eq("project_id", project_id)
    .eq("type", "generate")
    .in("status", ["pending", "processing"]);
  const activeGenIds = new Set(
    (activeJobs ?? []).map((j) => j.generation_id as string),
  );
  const recoverable = stuck.filter((g) => !activeGenIds.has(g.id));

  let requeued = 0;
  if (recoverable.length > 0) {
    // Concept names so we can route HTML-rendered concepts back through the free
    // server-side screenshot path with their stored render_content.
    const conceptIds = [
      ...new Set(recoverable.map((g) => g.concept_id as string)),
    ];
    const { data: conceptRows } = await admin
      .from("concepts")
      .select("id, name")
      .in("id", conceptIds);
    const conceptName = new Map<string, string>(
      (conceptRows ?? []).map((c) => [c.id as string, c.name as string]),
    );

    const { data: briefRows } = await admin
      .from("briefs")
      .select("concept_id, variant, render_content")
      .eq("project_id", project_id);
    const renderContentFor = new Map<string, Record<string, unknown> | null>();
    for (const b of briefRows ?? []) {
      renderContentFor.set(
        `${b.concept_id}:${b.variant}`,
        (b.render_content as Record<string, unknown> | null) ?? null,
      );
    }

    for (const g of recoverable) {
      // Flag the row first so a generation we cannot rebuild (missing brief) is
      // marked recovered and never swept again, rather than retried forever.
      await admin
        .from("generations")
        .update({ recovery_attempted: true, status: "generating" })
        .eq("id", g.id);

      const model: ImageModel = g.model_used ?? "gemini";
      const variant = g.concept_variant ?? "A";
      const htmlType = htmlRenderTypeForConcept(
        conceptName.get(g.concept_id as string),
      );

      let payload: Record<string, unknown>;
      if (htmlType) {
        const rc = renderContentFor.get(`${g.concept_id}:${variant}`);
        if (!rc) {
          await admin
            .from("generations")
            .update({ status: "failed" })
            .eq("id", g.id);
          continue;
        }
        payload = {
          render_type: htmlType,
          render_content: rc,
          model,
          version: g.version,
        };
      } else {
        if (!g.prompt_text) {
          await admin
            .from("generations")
            .update({ status: "failed" })
            .eq("id", g.id);
          continue;
        }
        payload = { prompt_text: g.prompt_text, model, version: g.version };
      }

      const { error: jobErr } = await admin.from("jobs").insert({
        project_id,
        generation_id: g.id,
        concept_id: g.concept_id,
        concept_variant: variant,
        type: "generate",
        status: "pending",
        max_attempts: JOB_MAX_ATTEMPTS.generate,
        payload,
      });
      if (jobErr) {
        await admin
          .from("generations")
          .update({ status: "failed" })
          .eq("id", g.id);
        continue;
      }
      requeued += 1;
    }
  }

  if (requeued > 0) {
    return NextResponse.json({ requeued });
  }

  // Nothing left to recover: the batch is fully settled. Reset the free regen
  // budget, but only if the batch produced at least one usable image (no point
  // handing out free regens for a batch that rendered nothing).
  const { count: completedCount } = await admin
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project_id)
    .eq("status", "completed")
    .not("image_url", "is", null);

  let regen_budget: number | undefined;
  if ((completedCount ?? 0) > 0) {
    regen_budget = await grantRegenBudget(project_id, REGEN_FREE_BUDGET);
  }

  return NextResponse.json({
    requeued: 0,
    batch_complete: true,
    ...(typeof regen_budget === "number" ? { regen_budget } : {}),
  });
}
