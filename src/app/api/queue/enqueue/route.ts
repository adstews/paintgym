import { NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { kickQueueWorker } from "@/lib/queue/drain";
import { enqueueImagesSchema } from "@/lib/validators/schemas";
import {
  getMissingRequiredFields,
  missingFieldsMessage,
} from "@/lib/validators/required-fields";
import { modelPreference, modelsForConcept } from "@/lib/image-gen/router";
import { htmlRenderTypeForConcept } from "@/lib/html-render/types";
import { JOB_MAX_ATTEMPTS } from "@/lib/types";
import type { Brief, Generation, ImageModel, Project, StyleSettings } from "@/lib/types";

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
    .select("*")
    .eq("id", project_id)
    .single();
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Hard requirement: core inputs (incl. price) must be set before any image.
  const missing = getMissingRequiredFields(project as Project);
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "missing_fields",
        message: missingFieldsMessage(missing),
        missing_fields: missing.map((f) => f.key),
      },
      { status: 422 },
    );
  }

  const pref = modelPreference(
    (project as Project).style_settings as StyleSettings | null,
  );

  const admin = createAdminClient();

  // Concept names, so we can detect the eight HTML-rendered concepts (matched by
  // name) and route them to the free screenshot renderer instead of a model.
  const conceptIds = [...new Set(items.map((it) => it.concept_id))];
  const { data: conceptRows } = await admin
    .from("concepts")
    .select("id, name")
    .in("id", conceptIds);
  const conceptName = new Map<string, string>(
    (conceptRows ?? []).map((c) => [c.id as string, c.name as string]),
  );

  const { data: briefRows } = await admin
    .from("briefs")
    .select("*")
    .eq("project_id", project_id);
  const briefs = (briefRows ?? []) as Brief[];
  // Keyed by model_target so the Gemini and GPT sets stay separate. Each image
  // job picks the brief written for its own model, falling back to the Gemini
  // brief if a GPT-specific one hasn't been written yet.
  const briefByModelKey = new Map<string, Brief>();
  for (const b of briefs) {
    briefByModelKey.set(
      `${b.concept_id}:${b.variant}:${b.model_target ?? "gemini"}`,
      b,
    );
  }
  const briefFor = (
    conceptId: string,
    variant: string,
    model: ImageModel,
  ): Brief | undefined =>
    briefByModelKey.get(`${conceptId}:${variant}:${model}`) ??
    briefByModelKey.get(`${conceptId}:${variant}:gemini`);

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
    const htmlType = htmlRenderTypeForConcept(conceptName.get(item.concept_id));
    if (htmlType) {
      // HTML-rendered concept: one free screenshot job, model-agnostic. We pin
      // the active gallery's model on the row so the card shows up where the
      // user clicked, but no image model actually runs and no credit is charged.
      index += 1;
      const brief = briefFor(item.concept_id, item.concept_variant, "gemini");
      const renderContent = (brief as Brief | undefined)?.render_content;
      if (!brief || !renderContent) {
        skipped += 1;
        continue;
      }
      const model: ImageModel =
        forcedModel ?? modelsForConcept(pref, index - 1)[0];
      if (activeKeys.has(activeKey(item.concept_id, item.concept_variant, "html"))) {
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
          prompt_text: (brief as Brief).brief_text,
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
        payload: { render_type: htmlType, render_content: renderContent, model, version },
      });
      if (jobErr) {
        await admin.from("generations").delete().eq("id", (gen as Generation).id);
        skipped += 1;
        continue;
      }
      activeKeys.add(activeKey(item.concept_id, item.concept_variant, "html"));
      created.push(gen as Generation);
      continue;
    }

    // One render per resolved model — "both" yields two rows + two jobs.
    // A forced model (the GPT button) overrides the project preference and
    // renders every concept with that single model.
    const models = forcedModel ? [forcedModel] : modelsForConcept(pref, index);
    for (const model of models) {
      const brief = briefFor(item.concept_id, item.concept_variant, model);
      if (!brief) {
        skipped += 1;
        continue;
      }
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
        // version drives the credit cost in the worker (>1 = regeneration).
        payload: { prompt_text: brief.brief_text, model, version },
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

  // Kick the server-side worker chain so the batch processes even if the user
  // closes the tab right after clicking Generate. The browser's own tick loop
  // still runs while the page is open; the two share the queue via atomic
  // claims.
  if (created.length > 0) {
    const origin = new URL(request.url).origin;
    after(() => kickQueueWorker(origin, project_id));
  }

  return NextResponse.json({
    generations: created,
    queued: created.length,
    skipped,
  });
}
