import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { regenerateSettingsSchema } from "@/lib/validators/schemas";
import { generateBriefsForConcept } from "@/lib/anthropic/generate-brief";
import { reviewImage } from "@/lib/anthropic/review-image";
import { loadPrimaryProductImage, collectReferenceImages } from "@/lib/gemini/reference-images";
import { generateWithModel, modelPreference, singleModel } from "@/lib/image-gen/router";
import {
  checkGenerationCredits,
  deductCredits,
  generationCreditCost,
} from "@/lib/credits";
import { DEFAULT_STYLE_SETTINGS } from "@/lib/types";
import type {
  Concept,
  Generation,
  ImageModel,
  Project,
  StyleSettings,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

// Regenerate an existing concept image with different creative settings. We
// rewrite the brief for the chosen aggressiveness/tone (same concept, same
// product), then render and QA a fresh image. Always a regeneration, so it is
// version > 1 and costs the reduced credit.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = regenerateSettingsSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { generation_id, aggressiveness, tone } = parsed.data;

  const { data: sourceRow } = await supabase
    .from("generations")
    .select("*")
    .eq("id", generation_id)
    .single();
  if (!sourceRow) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const source = sourceRow as Generation;
  if (!source.concept_id) {
    return NextResponse.json(
      { error: "not_supported", message: "Only concept images support settings regeneration" },
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
  const baseStyle =
    ((projectRow as Project).style_settings as StyleSettings | null) ??
    DEFAULT_STYLE_SETTINGS;
  // Project with the requested settings applied, used only for this rewrite.
  const project: Project = {
    ...(projectRow as Project),
    style_settings: { ...baseStyle, aggressiveness, tone },
  };

  const { data: conceptRow } = await supabase
    .from("concepts")
    .select("*")
    .eq("id", source.concept_id)
    .single();
  if (!conceptRow) {
    return NextResponse.json({ error: "concept_not_found" }, { status: 404 });
  }
  const concept = conceptRow as Concept;

  // Same model that produced the source image so a comparison stays consistent.
  const model: ImageModel =
    source.model_used ?? singleModel(modelPreference(project.style_settings));

  // Version + cost (always a regeneration here, but compute from version so the
  // math matches everywhere else).
  const { count } = await supabase
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("project_id", source.project_id)
    .eq("concept_id", source.concept_id)
    .eq("concept_variant", source.concept_variant ?? "A");
  const version = (count ?? 0) + 1;
  const cost = generationCreditCost(version);

  const tier = await checkGenerationCredits(user.id, cost);
  if (!tier.allowed) {
    return NextResponse.json(
      { error: "paywall", message: tier.reason, balance: tier.balance, required: tier.required },
      { status: 402 },
    );
  }

  // Rewrite the brief with the new settings (Claude sees the real product).
  let newBrief: string;
  try {
    const productImage = await loadPrimaryProductImage(
      project.product_data?.images ?? null,
    );
    const variants = await generateBriefsForConcept({
      project,
      concept,
      productImage,
    });
    newBrief = variants[0]?.brief_text ?? "";
    if (!newBrief) throw new Error("empty brief");
  } catch (err) {
    return NextResponse.json(
      {
        error: "rewrite_failed",
        message: err instanceof Error ? err.message : "Brief rewrite failed",
      },
      { status: 502 },
    );
  }

  const { data: inserted, error: insErr } = await supabase
    .from("generations")
    .insert({
      project_id: source.project_id,
      concept_id: source.concept_id,
      concept_variant: source.concept_variant,
      prompt_text: newBrief,
      status: "generating",
      version,
      model_used: model,
      qa_status: "pending",
      qa_issues: [],
      is_unlocked: true,
      refined_from: source.id,
      refinement_feedback: `New settings — aggressiveness: ${aggressiveness}, tone: ${tone}`,
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

  const referenceImages = await collectReferenceImages(
    (project.product_data as { images?: string[] } | null)?.images,
  );

  let imageDataUrl: string;
  try {
    const result = await generateWithModel(model, {
      prompt: newBrief,
      platform: project.style_settings.platform,
      referenceImages,
    });
    imageDataUrl = result.imageDataUrl;
  } catch (err) {
    await supabase.from("generations").update({ status: "failed" }).eq("id", row.id);
    return NextResponse.json(
      {
        error: "generation_failed",
        message: err instanceof Error ? err.message : "Image generation failed",
        id: row.id,
      },
      { status: 502 },
    );
  }

  const deducted = await deductCredits(user.id, cost);
  if (!deducted.ok) {
    await supabase.from("generations").update({ status: "failed" }).eq("id", row.id);
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

  // Inline QA (no auto-rewrite chain, matching /api/refine).
  try {
    const review = await reviewImage({
      imageDataUrl,
      briefText: newBrief,
      logoReferenceUrl: project.logo_url,
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
  } catch {
    const { data: qaUpdated } = await supabase
      .from("generations")
      .update({ qa_status: "minor", qa_severity: "minor", qa_issues: [] })
      .eq("id", current.id)
      .select("*")
      .single();
    if (qaUpdated) current = qaUpdated as Generation;
  }

  return NextResponse.json({ generation: current, new_balance: deducted.new_balance });
}
