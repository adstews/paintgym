import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueImagesSchema } from "@/lib/validators/schemas";
import { modelPreference, modelsForConcept } from "@/lib/image-gen/router";
import { JOB_MAX_ATTEMPTS } from "@/lib/types";
import type { Brief, Generation, StyleSettings } from "@/lib/types";

export const runtime = "nodejs";

// Queue a batch of image generations. For each requested concept we create the
// generation row (status 'generating', a durable resumable placeholder) plus a
// 'generate' job. Concepts that already have an in-flight generate job are
// skipped so a double-click cannot enqueue duplicates.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = enqueueImagesSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { project_id, items, model: forcedModel } = parsed.data;

  const { data: project } = await supabase
    .from("projects")
    .select("id, user_id, style_settings")
    .eq("id", project_id)
    .single();
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const pref = modelPreference(project.style_settings as StyleSettings | null);

  const admin = createAdminClient();

  const { data: briefRows } = await admin
    .from("briefs")
    .select("*")
    .eq("project_id", project_id);
  const briefs = (briefRows ?? []) as Brief[];
  const briefByKey = new Map<string, Brief>();
  for (const b of briefs) briefByKey.set(`${b.concept_id}:${b.variant}`, b);

  // (concept, variant, model) tuples with an already-active generate job — never
  // enqueue the same one twice. Keyed by model too so "both" mode can run a
  // Gemini and an OpenAI job for the same concept without one blocking the other.
  const { data: activeJobs } = await admin
    .from("jobs")
    .select("concept_id, concept_variant, payload")
    .eq("project_id", project_id)
    .eq("type", "generate")
    .in("status", ["pending", "processing"]);
  const activeKey = (
    conceptId: string,
    variant: string,
    model: string,
  ): string => `${conceptId}:${variant}:${model}`;
  const activeKeys = new Set(
    (activeJobs ?? []).map((j) => {
      const model =
        ((j.payload as { model?: string } | null)?.model as string) ?? "gemini";
      return activeKey(
        j.concept_id as string,
        (j.concept_variant as string) ?? "A",
        model,
      );
    }),
  );

  const created: Generation[] = [];
  let skipped = 0;

  // Index over items drives "alternating" mode (1st concept Gemini, 2nd OpenAI…).
  let index = 0;
  for (const item of items) {
    const brief = briefByKey.get(`${item.concept_id}:${item.concept_variant}`);
    if (!brief) {
      skipped += 1;
      index += 1;
      continue;
    }

    // One render per resolved model — "both" yields two rows + two jobs.
    // A forced model (the GPT button) overrides the project preference and
    // renders every concept with that single model.
    const models = forcedModel ? [forcedModel] : modelsForConcept(pref, index);
    for (const model of models) {
      if (activeKeys.has(activeKey(item.concept_id, item.concept_variant, model))) {
        skipped += 1;
        continue;
      }

      const { count } = await admin
        .from("generations")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project_id)
        .eq("concept_id", item.concept_id)
        .eq("concept_variant", item.concept_variant);
      const version = (count ?? 0) + 1;

      const { data: gen } = await admin
        .from("generations")
        .insert({
          project_id,
          concept_id: item.concept_id,
          concept_variant: item.concept_variant,
          prompt_text: brief.brief_text,
          status: "generating",
          version,
          model_used: model,
          qa_status: "pending",
          qa_issues: [],
          is_unlocked: true,
        })
        .select("*")
        .single();
      if (!gen) {
        skipped += 1;
        continue;
      }

      const { error: jobErr } = await admin.from("jobs").insert({
        project_id,
        generation_id: (gen as Generation).id,
        concept_id: item.concept_id,
        concept_variant: item.concept_variant,
        type: "generate",
        status: "pending",
        max_attempts: JOB_MAX_ATTEMPTS.generate,
        payload: { prompt_text: brief.brief_text, model },
      });
      if (jobErr) {
        // Roll the placeholder back so we don't leave an orphan stuck on
        // 'generating' with no job to drive it.
        await admin.from("generations").delete().eq("id", (gen as Generation).id);
        skipped += 1;
        continue;
      }

      activeKeys.add(activeKey(item.concept_id, item.concept_variant, model));
      created.push(gen as Generation);
    }
    index += 1;
  }

  return NextResponse.json({
    generations: created,
    queued: created.length,
    skipped,
  });
}
