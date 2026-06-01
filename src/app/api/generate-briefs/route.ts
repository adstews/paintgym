import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBriefsSchema } from "@/lib/validators/schemas";
import { generateBriefsForConcept } from "@/lib/anthropic/generate-brief";
import { loadFewShotExamples } from "@/lib/anthropic/few-shot";
import { DEFAULT_STYLE_SETTINGS } from "@/lib/types";
import type { Concept, Project, StyleSettings } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;

interface BriefOut {
  id: string;
  project_id: string;
  concept_id: string;
  variant: "A" | "B" | "C";
  brief_text: string;
  summary: string | null;
  key_points: string[];
  created_at: string;
  updated_at: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = generateBriefsSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { project_id, concept_ids } = parsed.data;

  const { data: projectRow, error: projErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", project_id)
    .single();
  if (projErr || !projectRow || (projectRow as Project).user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const fullProject: Project = {
    ...(projectRow as Project),
    style_settings:
      ((projectRow as Project).style_settings as StyleSettings | null) ??
      DEFAULT_STYLE_SETTINGS,
  };

  const { data: concepts, error: cErr } = await supabase
    .from("concepts")
    .select("*")
    .in("id", concept_ids);
  if (cErr || !concepts || concepts.length === 0) {
    return NextResponse.json({ error: "concepts_not_found" }, { status: 404 });
  }

  const fewShotByConcept = new Map<string, number>();
  const settled = await Promise.allSettled(
    (concepts as Concept[]).map(async (concept) => {
      const examples = await loadFewShotExamples({
        userId: user.id,
        conceptId: concept.id,
      });
      fewShotByConcept.set(concept.id, examples.length);
      const variants = await generateBriefsForConcept({
        project: fullProject,
        concept,
        fewShotExamples: examples,
      });
      return { concept, variants };
    }),
  );

  const rows: {
    project_id: string;
    concept_id: string;
    variant: "A" | "B" | "C";
    brief_text: string;
    summary: string;
    key_points: string[];
    updated_at: string;
  }[] = [];
  const failures: { concept_id: string; message: string }[] = [];
  for (let i = 0; i < settled.length; i++) {
    const item = settled[i];
    if (item.status === "fulfilled") {
      for (const v of item.value.variants) {
        rows.push({
          project_id,
          concept_id: item.value.concept.id,
          variant: v.variant,
          brief_text: v.brief_text,
          summary: v.summary,
          key_points: v.key_points,
          updated_at: new Date().toISOString(),
        });
      }
    } else {
      failures.push({
        concept_id: (concepts as Concept[])[i].id,
        message:
          item.reason instanceof Error
            ? item.reason.message
            : "Brief generation failed",
      });
    }
  }

  const briefs: BriefOut[] = [];
  if (rows.length > 0) {
    const { data: upserted, error: upErr } = await supabase
      .from("briefs")
      .upsert(rows, { onConflict: "project_id,concept_id,variant" })
      .select("*");
    if (upErr) {
      return NextResponse.json(
        { error: "save_failed", message: upErr.message },
        { status: 500 },
      );
    }
    for (const row of upserted as BriefOut[]) briefs.push(row);
  }

  const informed_by: Record<string, number> = {};
  for (const [conceptId, count] of fewShotByConcept) {
    informed_by[conceptId] = count;
  }

  return NextResponse.json({ briefs, failures, informed_by });
}
