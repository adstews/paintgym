import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBriefsSchema } from "@/lib/validators/schemas";
import { generateBriefForConcept } from "@/lib/anthropic/generate-brief";
import { DEFAULT_STYLE_SETTINGS } from "@/lib/types";
import type { Concept, Project, StyleSettings } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

interface BriefOut {
  id: string;
  project_id: string;
  concept_id: string;
  brief_text: string;
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

  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", project_id)
    .single();
  if (projErr || !project || project.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const fullProject = {
    ...(project as Project),
    style_settings:
      ((project as Project).style_settings as StyleSettings | null) ??
      DEFAULT_STYLE_SETTINGS,
  };

  const { data: concepts, error: cErr } = await supabase
    .from("concepts")
    .select("*")
    .in("id", concept_ids);
  if (cErr || !concepts || concepts.length === 0) {
    return NextResponse.json({ error: "concepts_not_found" }, { status: 404 });
  }

  const settled = await Promise.allSettled(
    (concepts as Concept[]).map((concept) =>
      generateBriefForConcept({ project: fullProject, concept }).then(
        (brief_text) => ({ concept, brief_text }),
      ),
    ),
  );

  const successes: { concept: Concept; brief_text: string }[] = [];
  const failures: { concept_id: string; message: string }[] = [];
  for (let i = 0; i < settled.length; i++) {
    const item = settled[i];
    if (item.status === "fulfilled") {
      successes.push(item.value);
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
  if (successes.length > 0) {
    const rows = successes.map((s) => ({
      project_id,
      concept_id: s.concept.id,
      brief_text: s.brief_text,
      updated_at: new Date().toISOString(),
    }));
    const { data: upserted, error: upErr } = await supabase
      .from("briefs")
      .upsert(rows, { onConflict: "project_id,concept_id" })
      .select("*");
    if (upErr) {
      return NextResponse.json(
        { error: "save_failed", message: upErr.message },
        { status: 500 },
      );
    }
    for (const row of upserted as BriefOut[]) briefs.push(row);
  }

  return NextResponse.json({ briefs, failures });
}
