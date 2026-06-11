import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRequestSchema } from "@/lib/validators/schemas";
import { collectReferenceImages } from "@/lib/gemini/reference-images";
import { generateWithModel, singleModel, modelPreference } from "@/lib/image-gen/router";
import { renderConceptToDataUrl } from "@/lib/html-render/render";
import { htmlRenderTypeForConcept } from "@/lib/html-render/types";
import {
  checkGenerationCredits,
  consumeRegenBudget,
  deductCredits,
  generationCreditCost,
} from "@/lib/credits";
import { DEFAULT_STYLE_SETTINGS } from "@/lib/types";
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

  // HTML-rendered concept: screenshot it server-side, free, no credit check.
  if (concept_id) {
    const { data: conceptRow } = await supabase
      .from("concepts")
      .select("name")
      .eq("id", concept_id)
      .single();
    const htmlType = htmlRenderTypeForConcept(
      conceptRow?.name as string | undefined,
    );
    if (htmlType) {
      const { data: brief } = await supabase
        .from("briefs")
        .select("render_content")
        .eq("project_id", project_id)
        .eq("concept_id", concept_id)
        .eq("variant", concept_variant ?? "A")
        .eq("model_target", "gemini")
        .maybeSingle();
      const renderContent = brief?.render_content as
        | Record<string, unknown>
        | null
        | undefined;
      if (!renderContent) {
        return NextResponse.json(
          { error: "no_render_content", message: "Generate the brief first." },
          { status: 422 },
        );
      }
      const { data: row, error: insErr } = await supabase
        .from("generations")
        .insert({
          project_id,
          concept_id,
          concept_variant: concept_variant ?? null,
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
      try {
        const productImageUrl =
          (project.product_data as ProductData | null)?.images?.[0] ?? null;
        const imageDataUrl = await renderConceptToDataUrl(
          htmlType,
          renderContent,
          productImageUrl,
        );
        const { data: updated, error: updErr } = await supabase
          .from("generations")
          .update({ status: "completed", image_url: imageDataUrl, qa_status: "passed" })
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
        });
      } catch (err) {
        await supabase
          .from("generations")
          .update({ status: "failed" })
          .eq("id", row.id);
        return NextResponse.json(
          {
            error: "generation_failed",
            message: err instanceof Error ? err.message : "render failed",
            id: row.id,
          },
          { status: 502 },
        );
      }
    }
  }
  // version > 1 means this concept already had an image, so it's a regeneration.
  // Regenerations spend the project's free regen budget before paid credits, so a
  // regen with budget left is free. The budget is actually spent post-render
  // (mirrors how credits deduct only on success).
  const isRegen = version > 1;
  let willUseBudget = false;
  if (isRegen) {
    // Tolerant read of the free-regen budget. Selected separately (not in the
    // main project select) so a deploy that predates the regen_budget migration
    // resolves to 0 here instead of erroring the whole generate path.
    const { data: pb } = await supabase
      .from("projects")
      .select("regen_budget")
      .eq("id", project_id)
      .maybeSingle();
    willUseBudget = ((pb?.regen_budget as number | undefined) ?? 0) > 0;
  }
  const cost = willUseBudget ? 0 : generationCreditCost(version);

  if (!willUseBudget) {
    const tier = await checkGenerationCredits(user.id, cost);
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
  }

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

    // Fund the render only after it succeeds so a failed generation never spends
    // a free regen or a credit. A budget-funded regen spends one unit of the
    // project's regen_budget; everything else deducts credits.
    let newBalance: number | undefined;
    let regenRemaining: number | undefined;
    if (willUseBudget) {
      const spent = await consumeRegenBudget(project_id);
      regenRemaining = spent.remaining;
    } else {
      const deducted = await deductCredits(user.id, cost);
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
      newBalance = deducted.new_balance;
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
      ...(typeof newBalance === "number" ? { new_balance: newBalance } : {}),
      ...(typeof regenRemaining === "number" ? { regen_budget: regenRemaining } : {}),
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
