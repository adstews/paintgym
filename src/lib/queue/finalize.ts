import { createAdminClient } from "@/lib/supabase/admin";
import { grantRegenBudget } from "@/lib/credits";
import { htmlRenderTypeForConcept } from "@/lib/html-render/types";
import {
  JOB_MAX_ATTEMPTS,
  MAX_RECOVERY_ATTEMPTS,
  REGEN_FREE_BUDGET,
} from "@/lib/types";
import type { Generation, ImageModel } from "@/lib/types";

// Settle a project's batch: auto-recover failed/stuck generations, fail
// unrecoverable orphans so no card spins forever, clear stuck QA badges, and
// reset the free regen budget once everything is truly done. Shared by the
// /api/queue/finalize route (client-called) and the server-side drain (runs
// with no tab open).
//
// Recovery rules:
// - A row qualifies when it failed or never produced an image, was created in
//   the last 24h (older junk stays on its manual Retry button rather than
//   silently burning credits), and recovery_attempts < MAX_RECOVERY_ATTEMPTS.
// - Age guards are status-aware. A 'failed' row only needs to be 60s old (its
//   render provably ended). A 'generating'/image-less row must be older than
//   the synchronous render ceiling (/api/generate|regenerate|refine run up to
//   300s in-process with NO jobs row) — recovering it sooner would duplicate
//   an in-flight render and double-charge credits.
// - The recovery_attempts bump uses an optimistic .eq() on the old value, and
//   the jobs_live_generate_per_gen_idx unique index (migration 0023) makes
//   double-enqueue impossible even if two settlers race past it.
// - Cancelled placeholders carry recovery_attempts = RECOVERY_BLOCKED and are
//   never resurrected.

export interface FinalizeResult {
  requeued: number;
  batch_complete: boolean;
  // Rows that qualify for recovery but are still inside an age guard. The
  // server drain waits out the short guard and settles again; the batch is not
  // complete while these exist.
  skipped_young: number;
  regen_budget?: number;
}

const RECOVERY_WINDOW_MS = 24 * 60 * 60 * 1000;
// 'failed' rows: nothing is running anymore; only avoid racing a row that
// enqueue is creating this instant.
const FAILED_MIN_AGE_MS = 60 * 1000;
// 'generating'/image-less rows: could be a synchronous in-process render
// (maxDuration 300s on those routes). Must exceed that ceiling.
const SYNC_GRACE_MS = 6 * 60 * 1000;
// A 'generating' row this old with no live job is an orphan: nothing will ever
// finish it, so flip it to failed (-> manual Retry) instead of spinning forever.
const ORPHAN_AGE_MS = 15 * 60 * 1000;
// Completed rows whose QA badge is still spinning after this long with no live
// review job get a terminal 'minor' fallback so the card's buttons re-enable.
const QA_ORPHAN_AGE_MS = 15 * 60 * 1000;

type Admin = ReturnType<typeof createAdminClient>;

async function liveGenIds(
  admin: Admin,
  projectId: string,
  types: string[],
): Promise<Set<string>> {
  const { data, error } = await admin
    .from("jobs")
    .select("generation_id")
    .eq("project_id", projectId)
    .in("type", types)
    .in("status", ["pending", "processing"]);
  if (error) throw new Error(`live jobs select failed: ${error.message}`);
  return new Set(
    (data ?? [])
      .map((j) => j.generation_id as string | null)
      .filter((id): id is string => Boolean(id)),
  );
}

function isUniqueViolation(err: { code?: string } | null): boolean {
  return !!err && err.code === "23505";
}

export async function finalizeProject(
  projectId: string,
): Promise<FinalizeResult> {
  const admin = createAdminClient();
  const now = Date.now();

  const activeGenIds = await liveGenIds(admin, projectId, ["generate"]);

  // 1. Ancient orphans: 'generating' rows past the recovery window with no job
  // behind them can never complete — fail them so the card shows Retry.
  const { data: oldOrphanRows, error: oldOrphanErr } = await admin
    .from("generations")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "generating")
    .lt("created_at", new Date(now - RECOVERY_WINDOW_MS).toISOString());
  if (oldOrphanErr) {
    throw new Error(`orphan select failed: ${oldOrphanErr.message}`);
  }
  const oldOrphanIds = (oldOrphanRows ?? [])
    .map((r) => r.id as string)
    .filter((id) => !activeGenIds.has(id));
  if (oldOrphanIds.length > 0) {
    await admin
      .from("generations")
      .update({ status: "failed" })
      .in("id", oldOrphanIds)
      .eq("status", "generating");
  }

  // 2. Recovery: rows that failed or never rendered, with attempts left.
  // Includes recreation/refine rows (concept_id null) — anything with a prompt
  // or stored render_content can re-render.
  const { data: stuckRows, error: stuckErr } = await admin
    .from("generations")
    .select(
      "id, concept_id, concept_variant, prompt_text, version, model_used, status, created_at, recovery_attempts",
    )
    .eq("project_id", projectId)
    .lt("recovery_attempts", MAX_RECOVERY_ATTEMPTS)
    .gte("created_at", new Date(now - RECOVERY_WINDOW_MS).toISOString())
    .or("status.eq.failed,image_url.is.null");
  if (stuckErr) {
    // Never let a DB error masquerade as a settled batch.
    throw new Error(`recovery select failed: ${stuckErr.message}`);
  }
  const stuck = ((stuckRows ?? []) as Generation[]).filter(
    (g) => !activeGenIds.has(g.id),
  );

  const oldEnough = (g: Generation): boolean => {
    const age = now - new Date(g.created_at).getTime();
    return g.status === "failed"
      ? age >= FAILED_MIN_AGE_MS
      : age >= SYNC_GRACE_MS;
  };
  const recoverable = stuck.filter(oldEnough);
  const skippedYoung = stuck.length - recoverable.length;

  // Snapshot for the ghost sweep below: a counter that moved means another
  // settler claimed the row mid-run and its job insert may be in flight.
  const counterSnapshot = new Map<string, number>(
    stuck.map((g) => [g.id, g.recovery_attempts ?? 0]),
  );

  let requeued = 0;
  if (recoverable.length > 0) {
    const conceptIds = [
      ...new Set(
        recoverable
          .map((g) => g.concept_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const conceptName = new Map<string, string>();
    if (conceptIds.length > 0) {
      const { data: conceptRows } = await admin
        .from("concepts")
        .select("id, name")
        .in("id", conceptIds);
      for (const c of conceptRows ?? []) {
        conceptName.set(c.id as string, c.name as string);
      }
    }

    const { data: briefRows } = await admin
      .from("briefs")
      .select("concept_id, variant, render_content")
      .eq("project_id", projectId);
    const renderContentFor = new Map<string, Record<string, unknown> | null>();
    for (const b of briefRows ?? []) {
      renderContentFor.set(
        `${b.concept_id}:${b.variant}`,
        (b.render_content as Record<string, unknown> | null) ?? null,
      );
    }

    for (const g of recoverable) {
      // Optimistic claim: bump the counter only if nobody else already did.
      const { data: claimed } = await admin
        .from("generations")
        .update({
          recovery_attempts: (g.recovery_attempts ?? 0) + 1,
          recovery_attempted: true,
          status: "generating",
        })
        .eq("id", g.id)
        .eq("recovery_attempts", g.recovery_attempts ?? 0)
        .select("id");
      if (!claimed || claimed.length === 0) continue;

      const model: ImageModel = g.model_used ?? "gemini";
      const variant = g.concept_variant ?? "A";
      const htmlType = g.concept_id
        ? htmlRenderTypeForConcept(conceptName.get(g.concept_id))
        : null;

      let payload: Record<string, unknown>;
      if (htmlType) {
        const rc = renderContentFor.get(`${g.concept_id}:${variant}`);
        if (!rc) {
          await admin
            .from("generations")
            .update({ status: "failed" })
            .eq("id", g.id);
          continue;
        }
        payload = {
          render_type: htmlType,
          render_content: rc,
          model,
          version: g.version,
        };
      } else {
        if (!g.prompt_text) {
          await admin
            .from("generations")
            .update({ status: "failed" })
            .eq("id", g.id);
          continue;
        }
        payload = { prompt_text: g.prompt_text, model, version: g.version };
      }

      const { error: jobErr } = await admin.from("jobs").insert({
        project_id: projectId,
        generation_id: g.id,
        concept_id: g.concept_id,
        concept_variant: variant,
        type: "generate",
        status: "pending",
        max_attempts: JOB_MAX_ATTEMPTS.generate,
        payload,
      });
      if (jobErr) {
        if (isUniqueViolation(jobErr)) {
          // Another settler already owns a live job for this row — fine.
          continue;
        }
        await admin
          .from("generations")
          .update({ status: "failed" })
          .eq("id", g.id);
        continue;
      }
      requeued += 1;
    }
  }

  if (requeued > 0) {
    return { requeued, batch_complete: false, skipped_young: skippedYoung };
  }

  // Recovery enqueued nothing — but if another settler's recovery jobs are in
  // flight, the batch is NOT complete. Report them so callers keep draining.
  const liveNow = await liveGenIds(admin, projectId, ["generate"]);
  if (liveNow.size > 0) {
    return {
      requeued: liveNow.size,
      batch_complete: false,
      skipped_young: skippedYoung,
    };
  }

  // 3. Recent ghosts: 'generating' rows recovery could not rebuild would spin
  // forever — fail them. Skip rows whose recovery counter moved mid-run
  // (another settler claimed them; their job insert may be landing right now).
  const { data: recentGhostRows } = await admin
    .from("generations")
    .select("id, recovery_attempts")
    .eq("project_id", projectId)
    .eq("status", "generating")
    .lt("created_at", new Date(now - ORPHAN_AGE_MS).toISOString());
  const ghostIds = (recentGhostRows ?? [])
    .filter((r) => {
      const id = r.id as string;
      if (liveNow.has(id)) return false;
      const snap = counterSnapshot.get(id);
      const current = (r.recovery_attempts as number) ?? 0;
      if (snap !== undefined && snap !== current) return false;
      return true;
    })
    .map((r) => r.id as string);
  if (ghostIds.length > 0) {
    await admin
      .from("generations")
      .update({ status: "failed" })
      .in("id", ghostIds)
      .eq("status", "generating");
  }

  // 4. QA orphans: completed images whose QA badge is still spinning with no
  // live review job. The image is usable — mirror the client's best-effort
  // 'minor' fallback so the card's buttons re-enable.
  const liveReviewIds = await liveGenIds(admin, projectId, [
    "review",
    "rewrite",
  ]);
  const { data: qaStuckRows } = await admin
    .from("generations")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "completed")
    .in("qa_status", ["pending", "reviewing", "rewriting"])
    .not("image_url", "is", null)
    .lt("created_at", new Date(now - QA_ORPHAN_AGE_MS).toISOString());
  const qaOrphanIds = (qaStuckRows ?? [])
    .map((r) => r.id as string)
    .filter((id) => !liveReviewIds.has(id));
  if (qaOrphanIds.length > 0) {
    await admin
      .from("generations")
      .update({
        qa_status: "minor",
        qa_severity: "minor",
        qa_issues: ["QA review never completed — image is usable as-is"],
      })
      .in("id", qaOrphanIds)
      .in("qa_status", ["pending", "reviewing", "rewriting"]);
  }

  if (skippedYoung > 0) {
    // Young rows are still inside an age guard; the server drain waits and
    // settles again. Don't declare the batch done or touch the budget yet.
    return { requeued: 0, batch_complete: false, skipped_young: skippedYoung };
  }

  // 5. Batch fully settled. Reset the free regen budget only when a generate
  // job actually finished recently — an idle settle (cron kick, watchdog kick
  // on a long-quiet project) must not refill a partially-spent budget.
  const { count: recentlyCompleted } = await admin
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("type", "generate")
    .eq("status", "completed")
    .gte("completed_at", new Date(now - 15 * 60 * 1000).toISOString());

  let regen_budget: number | undefined;
  if ((recentlyCompleted ?? 0) > 0) {
    const { count: completedCount } = await admin
      .from("generations")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "completed")
      .not("image_url", "is", null);
    if ((completedCount ?? 0) > 0) {
      regen_budget = await grantRegenBudget(projectId, REGEN_FREE_BUDGET);
    }
  }

  return {
    requeued: 0,
    batch_complete: true,
    skipped_young: 0,
    ...(typeof regen_budget === "number" ? { regen_budget } : {}),
  };
}
