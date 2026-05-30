import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deductCredits, ensureProfile } from "@/lib/credits";
import type { Generation, Project } from "@/lib/types";

export const runtime = "nodejs";

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

  if (generation.is_unlocked) {
    const profile = await ensureProfile(user.id);
    return NextResponse.json({ generation, profile });
  }

  const deducted = await deductCredits(user.id, 1);
  if (!deducted.ok) {
    return NextResponse.json(
      { error: "insufficient_credits", message: deducted.reason },
      { status: 402 },
    );
  }

  const admin = createAdminClient();
  const { data: updated, error: updErr } = await admin
    .from("generations")
    .update({ is_unlocked: true })
    .eq("id", id)
    .select("*")
    .single();
  if (updErr || !updated) {
    return NextResponse.json(
      { error: "update_failed", message: updErr?.message },
      { status: 500 },
    );
  }

  const profile = await ensureProfile(user.id);
  return NextResponse.json({ generation: updated, profile });
}
