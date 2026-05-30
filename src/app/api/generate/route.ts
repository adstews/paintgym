import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRequestSchema } from "@/lib/validators/schemas";
import { generateImage } from "@/lib/gemini/generate-image";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  const { project_id, concept_id, recreation_id, variant_label, prompt_text } =
    parsed.data;

  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", project_id)
    .single();
  if (projErr || !project || project.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Version counter is scoped to either concept or (recreation + variant).
  const baseQuery = supabase
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project_id);
  const versionQuery = concept_id
    ? baseQuery.eq("concept_id", concept_id)
    : baseQuery
        .eq("recreation_id", recreation_id ?? "")
        .eq("variant_label", variant_label ?? "");
  const { count } = await versionQuery;
  const version = (count ?? 0) + 1;

  const { data: row, error: insErr } = await supabase
    .from("generations")
    .insert({
      project_id,
      concept_id: concept_id ?? null,
      recreation_id: recreation_id ?? null,
      variant_label: variant_label ?? null,
      prompt_text,
      status: "generating",
      version,
      qa_status: "pending",
      qa_issues: [],
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
    const { imageDataUrl } = await generateImage({ prompt: prompt_text });
    const { data: updated, error: updErr } = await supabase
      .from("generations")
      .update({ status: "completed", image_url: imageDataUrl })
      .eq("id", row.id)
      .select("*")
      .single();
    if (updErr || !updated) throw updErr ?? new Error("update_failed");
    return NextResponse.json({
      id: updated.id,
      image_url: updated.image_url,
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
        message: err instanceof Error ? err.message : "unknown",
        id: row.id,
      },
      { status: 502 },
    );
  }
}
