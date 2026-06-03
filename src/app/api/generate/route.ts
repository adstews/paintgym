import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRequestSchema } from "@/lib/validators/schemas";
import { collectReferenceImages } from "@/lib/gemini/reference-images";
import { generateWithModel, singleModel, modelPreference } from "@/lib/image-gen/router";
import { checkGenerationCredits, deductCredits } from "@/lib/credits";
import {
  DEFAULT_STYLE_SETTINGS,
  GENERATION_CREDIT_COST,
} from "@/lib/types";
import type { ProductData, StyleSettings } from "@/lib/types";

export const runtime = "nodejs";
// Long enough for the in-call timeout + retries in generateImage to run without
// the platform killing the function mid-retry.
export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    project_id,
    concept_id,
    concept_variant,
    recreation_id,
    variant_label,
    prompt_text,
  } = parsed.data;

  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, user_id, style_settings, product_data, logo_url")
    .eq("id", project_id)
    .single();
  if (projErr || !project || project.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const style =
    (project.style_settings as StyleSettings | null) ?? DEFAULT_STYLE_SETTINGS;
  // A single render produces one image, so "both" collapses to Gemini here; the
  // batch path is where side-by-side comparison happens.
  const model = singleModel(modelPreference(style));

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

  // Version counter is scoped to (concept + variant) or (recreation + variant_label).
  let versionQuery = supabase
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project_id);
  if (concept_id) {
    versionQuery = versionQuery.eq("concept_id", concept_id);
    if (concept_variant) {
      versionQuery = versionQuery.eq("concept_variant", concept_variant);
    }
  } else if (recreation_id) {
    versionQuery = versionQuery
      .eq("recreation_id", recreation_id)
      .eq("variant_label", variant_label ?? "");
  }
  const { count } = await versionQuery;
  const version = (count ?? 0) + 1;

  const { data: row, error: insErr } = await supabase
    .from("generations")
    .insert({
      project_id,
      concept_id: concept_id ?? null,
      concept_variant: concept_variant ?? null,
      recreation_id: recreation_id ?? null,
      variant_label: variant_label ?? null,
      prompt_text,
      status: "generating",
      version,
      model_used: model,
      qa_status: "pending",
      qa_issues: [],
      is_unlocked: true,
    })
    .select("*")
    .single();
  if (insErr || !row) {
    return NextResponse.json(
      { error: "create_failed", message: insErr?.message },
      { status: 500 },
    );
  }

  const referenceImages = await collectReferenceImages(
    (project.product_data as ProductData | null)?.images,
  );

  try {
    const { imageDataUrl } = await generateWithModel(model, {
      prompt: prompt_text,
      platform: style.platform,
      referenceImages,
    });

    // Only deduct after a successful render so failed generations
    // don't burn a credit.
    const deducted = await deductCredits(user.id, GENERATION_CREDIT_COST);
    if (!deducted.ok) {
      await supabase
        .from("generations")
        .update({ status: "failed" })
        .eq("id", row.id);
      return NextResponse.json(
        {
          error: "paywall",
          message: deducted.reason ?? "Insufficient credits",
        },
        { status: 402 },
      );
    }

    const { data: updated, error: updErr } = await supabase
      .from("generations")
      .update({
        status: "completed",
        image_url: imageDataUrl,
      })
      .eq("id", row.id)
      .select("*")
      .single();
    if (updErr || !updated) throw updErr ?? new Error("update_failed");
    return NextResponse.json({
      id: updated.id,
      image_url: updated.image_url,
      watermarked_url: updated.watermarked_url,
      is_unlocked: updated.is_unlocked,
      status: "completed",
      version,
      generation: updated,
      new_balance: deducted.new_balance,
    });
  } catch (err) {
    await supabase
      .from("generations")
      .update({ status: "failed" })
      .eq("id", row.id);
    return NextResponse.json(
      {
        error: "generation_failed",
        message: err instanceof Error ? err.message : "unknown",
        id: row.id,
      },
      { status: 502 },
    );
  }
}
