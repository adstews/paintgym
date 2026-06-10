import { NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { kickQueueWorker } from "@/lib/queue/drain";
import type { Job } from "@/lib/types";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ projectId: string }>;
}

// If pending jobs exist, nothing is processing, and no job has shown activity
// (claim, completion, requeue, or fresh enqueue) for this long, the server
// chain is dead — restart it.
const STRANDED_AFTER_MS = 90 * 1000;
// A 'generating' card older than this with no live job will never finish on
// its own; kick the worker so its settle pass recovers or fails it.
const GHOST_AGE_MS = 15 * 60 * 1000;

// Lightweight queue status for the progress UI. Deliberately omits image data
// and prompt text (those arrive via the process-queue tick responses), so this
// can be polled every couple of seconds cheaply. Doubles as a watchdog: a
// stranded queue (dead worker chain) or a ghost 'generating' card gets the
// worker kicked here, so merely looking at the project heals a stalled batch.
export async function GET(request: Request, ctx: Ctx) {
  const { projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .single();
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // RLS (jobs_owner_select) scopes this to the caller's projects.
  const { data: jobRows } = await supabase
    .from("jobs")
    .select(
      "id, generation_id, concept_id, concept_variant, type, status, attempts, max_attempts, error, created_at, started_at, completed_at, next_run_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  const jobs = (jobRows ?? []) as Partial<Job>[];

  const counts = { pending: 0, processing: 0, completed: 0, failed: 0, total: jobs.length };
  for (const j of jobs) {
    if (j.status && j.status in counts) {
      counts[j.status as "pending" | "processing" | "completed" | "failed"] += 1;
    }
  }

  const origin = new URL(request.url).origin;

  if (counts.pending > 0 && counts.processing === 0) {
    // next_run_at counts as activity: it is set to now() on enqueue and to
    // claim-time + backoff on every requeue, so a live chain never looks
    // stranded just because a backoff gate is closed.
    let lastActivity = 0;
    for (const j of jobs) {
      for (const t of [j.started_at, j.completed_at, j.next_run_at, j.created_at]) {
        if (t) lastActivity = Math.max(lastActivity, new Date(t).getTime());
      }
    }
    if (Date.now() - lastActivity > STRANDED_AFTER_MS) {
      after(() => kickQueueWorker(origin, projectId));
    }
  } else if (counts.pending === 0 && counts.processing === 0) {
    // No queue work at all — but a ghost 'generating' card (e.g. a crashed
    // single-image render that never had a job) still needs the settle pass.
    // Cheap head-count served by the generations_generating_idx partial index.
    const admin = createAdminClient();
    const { count: ghosts } = await admin
      .from("generations")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "generating")
      .lt("created_at", new Date(Date.now() - GHOST_AGE_MS).toISOString());
    if ((ghosts ?? 0) > 0) {
      after(() => kickQueueWorker(origin, projectId));
    }
  }

  return NextResponse.json({
    counts,
    active: counts.pending + counts.processing,
    jobs,
  });
}
