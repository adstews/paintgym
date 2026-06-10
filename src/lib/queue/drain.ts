import { countRemaining, processNextJob } from "@/lib/queue/process";
import { finalizeProject } from "@/lib/queue/finalize";
import { internalQueueSecret } from "@/lib/queue/internal-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Server-side queue drain. This is what makes generation run with the tab
// closed: enqueue (and the progress poll, and the daily sweep) kick
// /api/queue/worker, whose after() callback runs this loop. It claims and
// processes jobs with bounded concurrency until the queue is empty, and when
// the serverless time budget runs low it re-invokes the worker route to
// continue in a fresh invocation (the "chain"). When the queue empties it
// settles the batch server-side (auto-recovery + regen budget) and chains
// again if recovery re-enqueued anything.
//
// The browser's tick loop (project-workspace) still runs when the page is open
// — claims are atomic (FOR UPDATE SKIP LOCKED), so the two drains simply share
// the queue and the batch finishes faster.

const DRAIN_CONCURRENCY = 3;
// Stop CLAIMING new jobs this long after the drain starts. The function budget
// is 300s (worker route maxDuration). The worst single job is an image
// generate (~230s of model retries), so the claim window must stay small; the
// heartbeat below covers the case where a late claim still overruns.
const CLAIM_WINDOW_MS = 60_000;
// If the platform kills this invocation mid-job, the chain would die silently.
// A pre-armed re-kick fires shortly before the kill so a successor invocation
// always exists; claim_next_job's stale reset hands it the orphaned job.
const HEARTBEAT_MS = 270_000;
// When nothing is claimable, wait this long before re-checking (a backoff gate
// may open, or an in-flight generate may enqueue a review job).
const IDLE_RECHECK_MS = 2_000;
// Give up waiting when nothing is claimable and nothing is pending for this
// many consecutive checks — any still-processing jobs belong to another
// invocation, which will settle the batch itself.
const MAX_IDLE_CHECKS = 6;
// Consecutive claim_next_job ERRORS (not idle results) before bailing out. A
// broken RPC must not produce an infinite self-kicking chain.
const MAX_CLAIM_ERRORS = 3;
// After settle reports young rows still inside an age guard, wait this long
// and settle once more (covers fast-failed batches whose rows were <60s old).
const YOUNG_ROW_WAIT_MS = 65_000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface DrainSummary {
  processed: number;
  chained: boolean;
  settled: boolean;
}

// Fire-and-forget kick of the worker route. The worker responds 202
// immediately (its drain runs in after()), so awaiting this is cheap. One
// retry so a transient blip can't silently kill the chain.
export async function kickQueueWorker(
  origin: string,
  projectId: string,
): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${origin}/api/queue/worker`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-queue-secret": internalQueueSecret(),
        },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (res.ok) return;
    } catch {
      // fall through to retry
    }
    await sleep(1_000);
  }
  // Best-effort: the progress poll or the daily sweep re-kicks a dead chain.
}

export async function drainProject(
  projectId: string,
  origin: string,
): Promise<DrainSummary> {
  const cutoff = Date.now() + CLAIM_WINDOW_MS;
  let processed = 0;
  let claimErrors = 0;

  // Insurance against a platform kill mid-job: pre-arm a successor.
  const heartbeat = setTimeout(() => {
    void kickQueueWorker(origin, projectId);
  }, HEARTBEAT_MS);

  async function worker(): Promise<void> {
    let idleChecks = 0;
    while (Date.now() < cutoff) {
      const r = await processNextJob(projectId);
      if (r.error && !r.job) {
        claimErrors += 1;
        if (claimErrors >= MAX_CLAIM_ERRORS) {
          console.error("queue drain: claim_next_job failing", r.error);
          return;
        }
        await sleep(IDLE_RECHECK_MS);
        continue;
      }
      if (r.job) {
        processed += 1;
        claimErrors = 0;
        idleChecks = 0;
        continue;
      }
      // Nothing claimable right now.
      if (r.remaining_pending === 0 && r.remaining_processing === 0) return;
      if (r.remaining_pending === 0) {
        // Only in-flight work elsewhere — bail after a grace period.
        idleChecks += 1;
        if (idleChecks >= MAX_IDLE_CHECKS) return;
      }
      await sleep(IDLE_RECHECK_MS);
    }
  }

  try {
    await Promise.all(
      Array.from({ length: DRAIN_CONCURRENCY }, () => worker()),
    );

    if (claimErrors >= MAX_CLAIM_ERRORS) {
      // DB problem: do NOT chain (it would loop forever). The progress poll or
      // sweep retries once the DB recovers.
      return { processed, chained: false, settled: false };
    }

    // Claim window exhausted with work left, or another invocation still busy:
    // hand off to a fresh invocation. Count fresh — worker-loop snapshots can
    // be stale by the time all three loops have returned. Require evidence of
    // progress (we processed something, or something is actively processing)
    // so a wedged queue can't self-kick forever.
    const remaining = await countRemaining(createAdminClient(), projectId);
    if (remaining.pending > 0 || remaining.processing > 0) {
      if (processed > 0 || remaining.processing > 0) {
        await kickQueueWorker(origin, projectId);
        return { processed, chained: true, settled: false };
      }
      // No progress and nothing in flight: leave it to the watchdog/sweep.
      return { processed, chained: false, settled: false };
    }

    // Queue is empty: settle the batch (auto-recovery, orphan + QA sweeps,
    // budget). Wait out the age guard once for fast-failed young rows.
    let fin = await finalizeProject(projectId);
    if (fin.requeued === 0 && fin.skipped_young > 0) {
      await sleep(YOUNG_ROW_WAIT_MS);
      fin = await finalizeProject(projectId);
    }
    if (fin.requeued > 0) {
      await kickQueueWorker(origin, projectId);
      return { processed, chained: true, settled: false };
    }
    return { processed, chained: false, settled: fin.batch_complete };
  } finally {
    clearTimeout(heartbeat);
  }
}
