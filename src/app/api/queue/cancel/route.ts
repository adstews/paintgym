import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelQueueSchema } from "@/lib/validators/schemas";

export const runtime = "nodejs";

// Stop an in-flight batch (item 12). Cancels every job that has not started yet
// (status 'pending') for the project and marks its placeholder generation row
// failed so the gallery stops showing a spinner. Jobs already 'processing' are
// left to finish — a long generate cannot be cleanly aborted mid-request, and we
// keep its image if it lands. Credits are only deducted after a successful
// render (see queue/process.ts), so pending jobs never charged a credit and
// there is nothing to refund.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = cancelQueueSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { project_id } = parsed.data;

  const { data: project } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", project_id)
    .single();
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const admin = createAdminClient();

  // Generation rows attached to pending jobs — captured before we cancel so we
  // can flip their placeholders to failed.
  const { data: pendingJobs } = await admin
    .from("jobs")
    .select("id, generation_id")
    .eq("project_id", project_id)
    .eq("status", "pending");
  const pending = pendingJobs ?? [];
  const genIds = pending
    .map((j) => j.generation_id as string | null)
    .filter((id): id is string => Boolean(id));

  const cancelledAt = new Date().toISOString();
  await admin
    .from("jobs")
    .update({
      status: "failed",
      error: "cancelled by user",
      completed_at: cancelledAt,
    })
    .eq("project_id", project_id)
    .eq("status", "pending");

  if (genIds.length > 0) {
    await admin
      .from("generations")
      .update({ status: "failed" })
      .in("id", genIds)
      .eq("status", "generating");
  }

  // Counts for the "X of Y images completed" message.
  const { count: completed } = await admin
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project_id)
    .eq("type", "generate")
    .eq("status", "completed");
  const { count: total } = await admin
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project_id)
    .eq("type", "generate");

  return NextResponse.json({
    cancelled: pending.length,
    cancelled_generation_ids: genIds,
    completed: completed ?? 0,
    total: total ?? 0,
  });
}
