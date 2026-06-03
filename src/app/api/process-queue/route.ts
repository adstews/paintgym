import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processQueueSchema } from "@/lib/validators/schemas";
import { processNextJob } from "@/lib/queue/process";

export const runtime = "nodejs";
// One generate job can run Gemini plus internal retries; give it the same
// headroom as /api/generate so the platform never kills it mid-retry.
export const maxDuration = 300;

// Claim and process a single queued job for the caller's project. The client
// ticks this repeatedly (bounded concurrency) until the queue drains. State is
// entirely in the DB, so a closed tab just pauses ticking — nothing is lost.
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

  // Ownership gate — claim_next_job is scoped to this project, so a user can
  // only ever process jobs for projects they own.
  const { data: project } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", parsed.data.project_id)
    .single();
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const result = await processNextJob(parsed.data.project_id);
  return NextResponse.json(result);
}
