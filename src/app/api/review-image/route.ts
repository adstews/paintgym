import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reviewImageSchema } from "@/lib/validators/schemas";
import { reviewImage } from "@/lib/anthropic/review-image";
import { rewriteBriefAfterFailure } from "@/lib/anthropic/rewrite-brief";
import { generateImage } from "@/lib/gemini/generate-image";
import { DEFAULT_STYLE_SETTINGS } from "@/lib/types";
import type {
  Concept,
  Generation,
  Project,
  StyleSettings,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_AUTO_REWRITES = 2;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

interface LoadResult {
  generation: Generation;
  project: Project;
  // null for recreations; the auto-rewrite chain is skipped in that case
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

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = reviewImageSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const ctx = await loadGenerationWithContext(
    supabase,
    parsed.data.generation_id,
    user.id,
  );
  if (!ctx) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { project, concept } = ctx;
  let { generation } = ctx;

  const touched: Generation[] = [];

  // Walk: review -> if major + concept + budget, rewrite + regen -> review again.
  // Recreation generations (concept=null) are reviewed but never auto-rewritten;
  // the rewrite path is concept-bound.
  for (let step = 0; step < MAX_AUTO_REWRITES + 1; step++) {
    const currentImage = generation.image_url;
    if (!currentImage) {
      return NextResponse.json(
        { error: "missing_image", generations: touched },
        { status: 422 },
      );
    }
    await markReviewing(supabase, generation.id);

    let result;
    try {
      result = await reviewImage({
        imageDataUrl: currentImage,
        briefText: generation.prompt_text,
        logoReferenceUrl: project.logo_url,
      });
    } catch (err) {
      const fallback = await saveReviewFailed(
        supabase,
        generation.id,
        err instanceof Error ? err.message : "unknown",
      );
      if (fallback) touched.push(fallback);
      return NextResponse.json({ generations: touched });
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
      return NextResponse.json({
        generations: touched,
        rewrite_error: err instanceof Error ? err.message : "rewrite_failed",
      });
    }

    let newImage;
    try {
      newImage = await generateImage({
        prompt: newBrief,
        platform: project.style_settings.platform,
      });
    } catch (err) {
      return NextResponse.json({
        generations: touched,
        rewrite_error:
          err instanceof Error ? err.message : "image_regeneration_failed",
      });
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
    });
    if (!inserted) {
      return NextResponse.json(
        { generations: touched, error: "rewrite_save_failed" },
        { status: 500 },
      );
    }
    touched.push(inserted);
    generation = inserted;
  }

  return NextResponse.json({ generations: touched });
}
