import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { kickQueueWorker } from "@/lib/queue/drain";
import { isInternalQueueRequest } from "@/lib/queue/internal-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Last-resort janitor (daily Vercel cron, see vercel.json). Finds every project
// with stranded queue work — claimable jobs nobody is processing, processing
// jobs whose worker died, or generations stuck on 'generating' — and kicks the
// server worker for each. The worker drains the queue and its settle pass
// (finalizeProject) recovers or fails anything stuck, so no card ever spins
// forever even if the user never reopens the project.
//
// Auth: the internal queue secret, or the Vercel cron bearer (CRON_SECRET), or
// Vercel's own x-vercel-cron header (set by the platform on cron invocations;
// stripped from external traffic). The route only re-kicks stuck queues, so a
// spurious call is harmless and idempotent.
export async function GET(request: Request) {
  const isInternal = isInternalQueueRequest(request);
  const isCron = request.headers.get("x-vercel-cron") !== null;
  if (!isInternal && !isCron) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const fiveMinAgo = new Date(now - 5 * 60 * 1000).toISOString();
  const tenMinAgo = new Date(now - 10 * 60 * 1000).toISOString();
  const fifteenMinAgo = new Date(now - 15 * 60 * 1000).toISOString();

  const [stranded, dead, ghosts] = await Promise.all([
    // Claimable for 5+ minutes with nobody claiming: the chain died.
    admin
      .from("jobs")
      .select("project_id")
      .eq("status", "pending")
      .lte("next_run_at", fiveMinAgo)
      .limit(500),
    // Processing for 10+ minutes: the function was killed mid-job.
    admin
      .from("jobs")
      .select("project_id")
      .eq("status", "processing")
      .lt("started_at", tenMinAgo)
      .limit(500),
    // Spinner cards with nothing driving them.
    admin
      .from("generations")
      .select("project_id")
      .eq("status", "generating")
      .lt("created_at", fifteenMinAgo)
      .limit(500),
  ]);

  // A project with a live processing job has a live chain — don't pile a
  // second drain lineage onto it from here.
  const { data: liveRows } = await admin
    .from("jobs")
    .select("project_id")
    .eq("status", "processing")
    .gte("started_at", tenMinAgo)
    .limit(500);
  const liveProjects = new Set(
    (liveRows ?? []).map((r) => r.project_id as string),
  );

  const projectIds = new Set<string>();
  for (const rows of [stranded.data, dead.data, ghosts.data]) {
    for (const r of rows ?? []) projectIds.add(r.project_id as string);
  }
  for (const id of liveProjects) projectIds.delete(id);

  const origin = new URL(request.url).origin;
  const kicked: string[] = [];
  for (const projectId of [...projectIds].slice(0, 25)) {
    await kickQueueWorker(origin, projectId);
    kicked.push(projectId);
  }

  // Project UUIDs only go to strongly-authenticated callers.
  return NextResponse.json({
    kicked: kicked.length,
    ...(isInternal ? { project_ids: kicked } : {}),
  });
}
