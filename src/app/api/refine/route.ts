import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refineRequestSchema } from "@/lib/validators/schemas";
import { refineBriefFromFeedback } from "@/lib/anthropic/refine-brief";
import { reviewImage } from "@/lib/anthropic/review-image";
import { generateImage } from "@/lib/gemini/generate-image";
import { checkGenerationCredits, deductCredits } from "@/lib/credits";
import {
  DEFAULT_STYLE_SETTINGS,
  GENERATION_CREDIT_COST,
} from "@/lib/types";
import type {
  Concept,
  Generation,
  Project,
  StyleSettings,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = refineRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { generation_id, user_feedback } = parsed.data;

  const { data: sourceRow } = await supabase
    .from("generations")
    .select("*")
    .eq("id", generation_id)
    .single();
  if (!sourceRow) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const source = sourceRow as Generation;
  if (!source.image_url) {
    return NextResponse.json(
      { error: "missing_image", message: "Source image is not ready" },
      { status: 422 },
    );
  }

  const { data: projectRow } = await supabase
    .from("projects")
    .select("*")
    .eq("id", source.project_id)
    .single();
  if (!projectRow || (projectRow as Project).user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const project: Project = {
    ...(projectRow as Project),
    style_settings:
      ((projectRow as Project).style_settings as StyleSettings | null) ??
      DEFAULT_STYLE_SETTINGS,
  };

  let concept: Concept | null = null;
  if (source.concept_id) {
    const { data } = await supabase
      .from("concepts")
      .select("*")
      .eq("id", source.concept_id)
      .single();
    concept = (data as Concept | null) ?? null;
  }

  const tier = await checkGenerationCredits(user.id, 1);
  if (!tier.allowed) {
    return NextResponse.json(
      {
        error: "paywall",
        message: tier.reason,
        balance: tier.balance,
        required: tier.required,
      },
      { status: 402 },
    );
  }

  let refinedBrief: string;
  try {
    refinedBrief = await refineBriefFromFeedback({
      project,
      concept,
      originalBrief: source.prompt_text,
      sourceImageDataUrl: source.image_url,
      feedback: user_feedback,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "refine_failed",
        message: err instanceof Error ? err.message : "Claude refine failed",
      },
      { status: 502 },
    );
  }

  // Version counter scoped the same way /api/generate scopes it.
  let versionQuery = supabase
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("project_id", source.project_id);
  if (source.concept_id) {
    versionQuery = versionQuery.eq("concept_id", source.concept_id);
    if (source.concept_variant) {
      versionQuery = versionQuery.eq("concept_variant", source.concept_variant);
    }
  } else if (source.recreation_id) {
    versionQuery = versionQuery
      .eq("recreation_id", source.recreation_id)
      .eq("variant_label", source.variant_label ?? "");
  }
  const { count } = await versionQuery;
  const version = (count ?? 0) + 1;

  const { data: inserted, error: insErr } = await supabase
    .from("generations")
    .insert({
      project_id: source.project_id,
      concept_id: source.concept_id,
      concept_variant: source.concept_variant,
      recreation_id: source.recreation_id,
      variant_label: source.variant_label,
      prompt_text: refinedBrief,
      status: "generating",
      version,
      qa_status: "pending",
      qa_issues: [],
      is_unlocked: true,
      refined_from: source.id,
      refinement_feedback: user_feedback,
    })
    .select("*")
    .single();
  if (insErr || !inserted) {
    return NextResponse.json(
      { error: "create_failed", message: insErr?.message },
      { status: 500 },
    );
  }
  const row = inserted as Generation;

  let imageDataUrl: string;
  try {
    const result = await generateImage({ prompt: refinedBrief });
    imageDataUrl = result.imageDataUrl;
  } catch (err) {
    await supabase
      .from("generations")
      .update({ status: "failed" })
      .eq("id", row.id);
    return NextResponse.json(
      {
        error: "generation_failed",
        message: err instanceof Error ? err.message : "Gemini failed",
        id: row.id,
      },
      { status: 502 },
    );
  }

  const deducted = await deductCredits(user.id, GENERATION_CREDIT_COST);
  if (!deducted.ok) {
    await supabase
      .from("generations")
      .update({ status: "failed" })
      .eq("id", row.id);
    return NextResponse.json(
      { error: "paywall", message: deducted.reason ?? "Insufficient credits" },
      { status: 402 },
    );
  }

  const { data: updated } = await supabase
    .from("generations")
    .update({ status: "completed", image_url: imageDataUrl })
    .eq("id", row.id)
    .select("*")
    .single();
  let current = (updated as Generation | null) ?? row;

  // Inline QA review so the new row lands in the same readable state as a
  // first-pass generation: passed, minor, or major. We skip the auto-rewrite
  // chain that /api/review-image runs; user-driven refinements should not
  // silently spend more credits.
  try {
    const review = await reviewImage({
      imageDataUrl,
      briefText: refinedBrief,
    });
    const qa_status = review.passed
      ? "passed"
      : review.severity === "major"
        ? "major"
        : "minor";
    const { data: qaUpdated } = await supabase
      .from("generations")
      .update({
        qa_status,
        qa_severity: review.passed ? null : review.severity,
        qa_issues: review.issues,
      })
      .eq("id", current.id)
      .select("*")
      .single();
    if (qaUpdated) current = qaUpdated as Generation;
  } catch (err) {
    const { data: qaUpdated } = await supabase
      .from("generations")
      .update({
        qa_status: "minor",
        qa_severity: "minor",
        qa_issues: [
          `QA review error: ${err instanceof Error ? err.message : "unknown"}`,
        ],
      })
      .eq("id", current.id)
      .select("*")
      .single();
    if (qaUpdated) current = qaUpdated as Generation;
  }

  return NextResponse.json({
    generation: current,
    new_balance: deducted.new_balance,
  });
}
