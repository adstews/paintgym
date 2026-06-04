import type { SupabaseClient } from "@supabase/supabase-js";
import { reviewImage } from "@/lib/anthropic/review-image";
import { rewriteBriefAfterFailure } from "@/lib/anthropic/rewrite-brief";
import { generateWithModel } from "@/lib/image-gen/router";
import { DEFAULT_STYLE_SETTINGS } from "@/lib/types";
import type {
  Concept,
  Generation,
  ImageModel,
  Project,
  StyleSettings,
} from "@/lib/types";

// Claude QA on a generation, with the bounded auto-rewrite walk. Extracted from
// the /api/review-image route so the background queue worker can run the exact
// same logic with a service-role client. Works with any Supabase client; the
// caller passes the owning user id so ownership is verified the same way whether
// RLS is in force (user session) or bypassed (service role).

const MAX_AUTO_REWRITES = 2;

export interface ReviewOutcome {
  generations: Generation[];
  rewrite_error?: string;
  error?: string;
  not_found?: boolean;
  missing_image?: boolean;
  // The Claude review call itself errored (a best-effort minor fallback was
  // saved). The queue worker uses this to decide whether to retry the job.
  review_failed?: boolean;
}

interface LoadResult {
  generation: Generation;
  project: Project;
  concept: Concept | null;
}

async function loadGenerationWithContext(
  supabase: SupabaseClient,
  generationId: string,
  userId: string,
): Promise<LoadResult | null> {
  const { data: gen } = await supabase
    .from("generations")
    .select("*")
    .eq("id", generationId)
    .single();
  if (!gen) return null;
  const generation = gen as Generation;

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", generation.project_id)
    .single();
  if (!project || (project as Project).user_id !== userId) return null;

  let concept: Concept | null = null;
  if (generation.concept_id) {
    const { data } = await supabase
      .from("concepts")
      .select("*")
      .eq("id", generation.concept_id)
      .single();
    concept = (data as Concept | null) ?? null;
    if (!concept) return null;
  }

  const projectRow = project as Project;
  return {
    generation,
    project: {
      ...projectRow,
      style_settings:
        (projectRow.style_settings as StyleSettings | null) ??
        DEFAULT_STYLE_SETTINGS,
    },
    concept,
  };
}

async function markReviewing(
  supabase: SupabaseClient,
  generationId: string,
): Promise<void> {
  await supabase
    .from("generations")
    .update({ qa_status: "reviewing" })
    .eq("id", generationId);
}

async function saveReviewResult(
  supabase: SupabaseClient,
  generationId: string,
  result: { passed: boolean; issues: string[]; severity: "none" | "minor" | "major" },
): Promise<Generation | null> {
  const qa_status = result.passed
    ? "passed"
    : result.severity === "major"
      ? "major"
      : "minor";
  const qa_severity = result.passed ? null : result.severity;
  const { data, error } = await supabase
    .from("generations")
    .update({
      qa_status,
      qa_severity,
      qa_issues: result.issues,
    })
    .eq("id", generationId)
    .select("*")
    .single();
  if (error || !data) return null;
  return data as Generation;
}

async function saveReviewFailed(
  supabase: SupabaseClient,
  generationId: string,
  message: string,
): Promise<Generation | null> {
  const { data } = await supabase
    .from("generations")
    .update({
      qa_status: "minor",
      qa_severity: "minor",
      qa_issues: [`QA review error: ${message}`],
    })
    .eq("id", generationId)
    .select("*")
    .single();
  return (data ?? null) as Generation | null;
}

async function insertAutoRewriteRow(
  supabase: SupabaseClient,
  base: {
    project_id: string;
    concept_id: string;
    concept_variant: string | null;
    prompt_text: string;
    image_url: string;
    version: number;
    auto_rewrite_count: number;
    model_used: ImageModel;
  },
): Promise<Generation | null> {
  // Auto-rewrites are QA-driven retries on a generation the user already paid
  // for, so they do not deduct credits and the resulting row is unlocked.
  const { data, error } = await supabase
    .from("generations")
    .insert({
      project_id: base.project_id,
      concept_id: base.concept_id,
      concept_variant: base.concept_variant,
      prompt_text: base.prompt_text,
      image_url: base.image_url,
      status: "completed",
      version: base.version,
      model_used: base.model_used,
      qa_status: "pending",
      qa_issues: [],
      auto_rewrite_count: base.auto_rewrite_count,
      is_auto_rewrite: true,
      is_unlocked: true,
    })
    .select("*")
    .single();
  if (error || !data) return null;
  return data as Generation;
}

async function nextVersion(
  supabase: SupabaseClient,
  projectId: string,
  conceptId: string,
  conceptVariant: string | null,
): Promise<number> {
  let q = supabase
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("concept_id", conceptId);
  if (conceptVariant) {
    q = q.eq("concept_variant", conceptVariant);
  }
  const { count } = await q;
  return (count ?? 0) + 1;
}

export async function reviewGeneration(
  supabase: SupabaseClient,
  generationId: string,
  userId: string,
): Promise<ReviewOutcome> {
  const ctx = await loadGenerationWithContext(supabase, generationId, userId);
  if (!ctx) return { generations: [], not_found: true };
  const { project, concept } = ctx;
  let { generation } = ctx;

  const touched: Generation[] = [];

  // Walk: review -> if major + concept + budget, rewrite + regen -> review again.
  // Recreation generations (concept=null) are reviewed but never auto-rewritten;
  // the rewrite path is concept-bound.
  for (let step = 0; step < MAX_AUTO_REWRITES + 1; step++) {
    const currentImage = generation.image_url;
    if (!currentImage) {
      console.error(
        `[qa] generation ${generation.id} has no image_url to review ` +
          `(model=${generation.model_used ?? "gemini"})`,
      );
      return { generations: touched, missing_image: true };
    }
    await markReviewing(supabase, generation.id);

    let result;
    try {
      result = await reviewImage({
        imageDataUrl: currentImage,
        briefText: generation.prompt_text,
        productReferenceUrl: project.product_data?.images?.[0] ?? null,
        logoReferenceUrl: project.logo_url,
      });
    } catch (err) {
      // Previously this swallowed the error into a "minor" fallback with no log,
      // so a model-specific review failure (e.g. an oversized OpenAI image) was
      // invisible. Log with model context so the next one is diagnosable.
      console.error(
        `[qa] review call failed for generation ${generation.id} ` +
          `(model=${generation.model_used ?? "gemini"}):`,
        err instanceof Error ? err.message : err,
      );
      const fallback = await saveReviewFailed(
        supabase,
        generation.id,
        err instanceof Error ? err.message : "unknown",
      );
      if (fallback) touched.push(fallback);
      return { generations: touched, review_failed: true };
    }

    const saved = await saveReviewResult(supabase, generation.id, result);
    if (saved) {
      touched.push(saved);
      generation = saved;
    }

    const canRewrite =
      !result.passed &&
      result.severity === "major" &&
      concept !== null &&
      generation.concept_id !== null &&
      generation.auto_rewrite_count < MAX_AUTO_REWRITES;
    if (!canRewrite) break;

    // Fresh-start rewrite path. The previous row keeps qa_status='major' as a
    // visible failed attempt; we create a new row for the rewrite.
    let newBrief: string;
    try {
      newBrief = await rewriteBriefAfterFailure({
        project,
        concept,
        originalBrief: generation.prompt_text,
        failedImageDataUrl: currentImage,
        issues: result.issues,
      });
    } catch (err) {
      return {
        generations: touched,
        rewrite_error: err instanceof Error ? err.message : "rewrite_failed",
      };
    }

    // Rewrite on the same model that produced the failed image.
    const model: ImageModel = generation.model_used ?? "gemini";
    let newImage;
    try {
      newImage = await generateWithModel(model, {
        prompt: newBrief,
        platform: project.style_settings.platform,
      });
    } catch (err) {
      return {
        generations: touched,
        rewrite_error:
          err instanceof Error ? err.message : "image_regeneration_failed",
      };
    }

    const conceptId = generation.concept_id;
    if (!conceptId) break; // safety: cannot happen given canRewrite above
    const conceptVariant = generation.concept_variant ?? null;
    const nextV = await nextVersion(
      supabase,
      generation.project_id,
      conceptId,
      conceptVariant,
    );

    const inserted = await insertAutoRewriteRow(supabase, {
      project_id: generation.project_id,
      concept_id: conceptId,
      concept_variant: conceptVariant,
      prompt_text: newBrief,
      image_url: newImage.imageDataUrl,
      version: nextV,
      auto_rewrite_count: generation.auto_rewrite_count + 1,
      model_used: model,
    });
    if (!inserted) {
      return { generations: touched, error: "rewrite_save_failed" };
    }
    touched.push(inserted);
    generation = inserted;
  }

  return { generations: touched };
}
