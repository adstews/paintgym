import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Generation, Project } from "@/lib/types";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: gen } = await supabase
    .from("generations")
    .select("*")
    .eq("id", id)
    .single();
  if (!gen) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const generation = gen as Generation;
  const { data: project } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", generation.project_id)
    .single();
  if (!project || (project as Pick<Project, "user_id">).user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("generations")
    .update({ qa_status: "overridden" })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ generation: data });
}
