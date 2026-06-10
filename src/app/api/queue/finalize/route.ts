import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processQueueSchema } from "@/lib/validators/schemas";
import { finalizeProject } from "@/lib/queue/finalize";

export const runtime = "nodejs";

// Called by the client once a batch drain finishes. The settle logic lives in
// lib/queue/finalize so the server-side drain (which runs with no tab open)
// shares it: auto-recovery with a bounded retry counter, an orphan sweep so no
// card spins forever, and the free-regen-budget reset once the batch is truly
// done. After a requeue (> 0) the client re-drains and calls finalize again.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = processQueueSchema.safeParse(
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

  let result;
  try {
    result = await finalizeProject(project_id);
  } catch (err) {
    return NextResponse.json(
      {
        error: "finalize_failed",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }
  if (result.requeued > 0) {
    return NextResponse.json({ requeued: result.requeued });
  }
  return NextResponse.json({
    requeued: 0,
    batch_complete: result.batch_complete,
    skipped_young: result.skipped_young,
    ...(typeof result.regen_budget === "number"
      ? { regen_budget: result.regen_budget }
      : {}),
  });
}
