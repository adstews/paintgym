import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeUnlockAllCost,
  deductCredits,
  ensureProfile,
} from "@/lib/credits";

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

  const { data: project } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", id)
    .single();
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: locked } = await admin
    .from("generations")
    .select("id")
    .eq("project_id", id)
    .eq("is_unlocked", false)
    .eq("status", "completed");
  const lockedIds = (locked ?? []).map((r) => r.id as string);
  if (lockedIds.length === 0) {
    const profile = await ensureProfile(user.id);
    return NextResponse.json({ unlocked_count: 0, generations: [], profile });
  }

  const cost = computeUnlockAllCost(lockedIds.length);
  const deducted = await deductCredits(user.id, cost);
  if (!deducted.ok) {
    return NextResponse.json(
      {
        error: "insufficient_credits",
        message: `Need ${cost} credits to unlock all (${lockedIds.length} images at a bulk rate).`,
      },
      { status: 402 },
    );
  }

  const { data: updated, error: updErr } = await admin
    .from("generations")
    .update({ is_unlocked: true })
    .in("id", lockedIds)
    .select("*");
  if (updErr) {
    return NextResponse.json(
      { error: "update_failed", message: updErr.message },
      { status: 500 },
    );
  }

  const profile = await ensureProfile(user.id);
  return NextResponse.json({
    unlocked_count: lockedIds.length,
    spent_credits: cost,
    generations: updated ?? [],
    profile,
  });
}
