import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recreateRequestSchema } from "@/lib/validators/schemas";
import { recreateFromExample } from "@/lib/anthropic/recreate-from-example";
import { generateImage } from "@/lib/gemini/generate-image";
import { DEFAULT_STYLE_SETTINGS, VARIANT_LABELS } from "@/lib/types";
import type {
  Generation,
  Project,
  Recreation,
  StyleSettings,
  VariantLabel,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

interface VariantResult {
  label: VariantLabel;
  brief_text: string;
  status: "completed" | "failed";
  generation: Generation | null;
  error?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = recreateRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { project_id, source_image_url } = parsed.data;

  const { data: projectRow, error: projErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", project_id)
    .single();
  if (projErr || !projectRow || (projectRow as Project).user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const project: Project = {
    ...(projectRow as Project),
    style_settings:
      ((projectRow as Project).style_settings as StyleSettings | null) ??
      DEFAULT_STYLE_SETTINGS,
  };

  // 1) Analyze + write five briefs (one Claude vision call).
  let recreateResult;
  try {
    recreateResult = await recreateFromExample({
      project,
      exampleImageUrl: source_image_url,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "recreate_failed",
        message:
          err instanceof Error ? err.message : "Failed to write recreation briefs",
      },
      { status: 502 },
    );
  }

  // 2) Persist the recreation row.
  const { data: recreationRow, error: recErr } = await supabase
    .from("recreations")
    .insert({
      project_id,
      source_image_url,
      analysis: recreateResult.analysis,
    })
    .select("*")
    .single();
  if (recErr || !recreationRow) {
    return NextResponse.json(
      { error: "save_failed", message: recErr?.message },
      { status: 500 },
    );
  }
  const recreation = recreationRow as Recreation;

  // 3) Generate all five images in parallel via Gemini.
  const briefByLabel = new Map(
    recreateResult.briefs.map((b) => [b.label, b.brief_text]),
  );

  const settled = await Promise.allSettled(
    VARIANT_LABELS.map(async (label, index): Promise<VariantResult> => {
      const brief_text = briefByLabel.get(label);
      if (!brief_text) {
        return {
          label,
          brief_text: "",
          status: "failed",
          generation: null,
          error: "missing_brief",
        };
      }
      try {
        const { imageDataUrl } = await generateImage({ prompt: brief_text });
        const { data: gen, error: insErr } = await supabase
          .from("generations")
          .insert({
            project_id,
            concept_id: null,
            recreation_id: recreation.id,
            variant_label: label,
            prompt_text: brief_text,
            image_url: imageDataUrl,
            status: "completed",
            version: index + 1,
            qa_status: "pending",
            qa_issues: [],
          })
          .select("*")
          .single();
        if (insErr || !gen) {
          throw new Error(insErr?.message ?? "insert_failed");
        }
        return {
          label,
          brief_text,
          status: "completed",
          generation: gen as Generation,
        };
      } catch (err) {
        return {
          label,
          brief_text,
          status: "failed",
          generation: null,
          error: err instanceof Error ? err.message : "unknown",
        };
      }
    }),
  );

  const generations: Generation[] = [];
  const failures: { label: VariantLabel; brief_text: string; message: string }[] =
    [];
  for (const item of settled) {
    if (item.status === "fulfilled") {
      const r = item.value;
      if (r.status === "completed" && r.generation) {
        generations.push(r.generation);
      } else {
        failures.push({
          label: r.label,
          brief_text: r.brief_text,
          message: r.error ?? "unknown",
        });
      }
    }
  }

  return NextResponse.json({
    recreation,
    analysis: recreation.analysis,
    generations,
    failures,
  });
}
