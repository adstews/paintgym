import { createAdminClient } from "@/lib/supabase/admin";
import { collectReferenceImages } from "@/lib/gemini/reference-images";
import { generateWithModel, singleModel, modelPreference } from "@/lib/image-gen/router";
import { reviewGeneration } from "@/lib/qa/review-generation";
import { checkGenerationCredits, deductCredits } from "@/lib/credits";
import {
  DEFAULT_STYLE_SETTINGS,
  GENERATION_CREDIT_COST,
  JOB_MAX_ATTEMPTS,
} from "@/lib/types";
import type {
  Generation,
  ImageModel,
  Job,
  ProductData,
  Project,
  StyleSettings,
} from "@/lib/types";

type AdminClient = ReturnType<typeof createAdminClient>;

export interface ProcessResult {
  // No runnable job was claimed this tick (queue idle or all jobs backing off).
  done: boolean;
  job?: { id: string; type: Job["type"]; status: Job["status"] };
  // Rows touched this tick, returned so the client can merge images/QA into state
  // without re-fetching every base64 data URL on each progress poll.
  generations: Generation[];
  remaining_pending: number;
  remaining_processing: number;
  // Set when a generate job deducted a credit, so the client can update the
  // credits panel without a refetch.
  new_balance?: number;
  error?: string;
}

// Capped exponential backoff. attempts has already been incremented by
// claim_next_job, so the first failure (attempts=1) waits ~4s.
function backoffSeconds(attempts: number): number {
  return Math.min(60, 4 * 2 ** Math.max(0, attempts - 1));
}

async function requeue(
  admin: AdminClient,
  job: Job,
  message: string,
): Promise<void> {
  const delay = backoffSeconds(job.attempts);
  await admin
    .from("jobs")
    .update({
      status: "pending",
      started_at: null,
      error: message,
      next_run_at: new Date(Date.now() + delay * 1000).toISOString(),
    })
    .eq("id", job.id);
}

async function failJob(
  admin: AdminClient,
  job: Job,
  message: string,
): Promise<void> {
  await admin
    .from("jobs")
    .update({
      status: "failed",
      error: message,
      completed_at: new Date().toISOString(),
    })
    .eq("id", job.id);
}

async function completeJob(admin: AdminClient, job: Job): Promise<void> {
  await admin
    .from("jobs")
    .update({ status: "completed", error: null, completed_at: new Date().toISOString() })
    .eq("id", job.id);
}

// generate: render the image for an already-created generation row, deduct one
// credit on success, then enqueue a review job. A failure requeues with backoff
// until max_attempts is hit, at which point the generation is marked failed.
async function processGenerate(
  admin: AdminClient,
  job: Job,
  project: Project,
): Promise<{ generations: Generation[]; newBalance?: number }> {
  if (!job.generation_id) {
    await failJob(admin, job, "generate job missing generation_id");
    return { generations: [] };
  }
  const prompt = String(job.payload?.prompt_text ?? "");
  if (!prompt) {
    await failJob(admin, job, "generate job missing prompt_text");
    await admin.from("generations").update({ status: "failed" }).eq("id", job.generation_id);
    return { generations: [] };
  }

  const credits = await checkGenerationCredits(project.user_id, 1);
  if (!credits.allowed) {
    // Out of credits is terminal — retrying won't help. Surface it on the job.
    await failJob(admin, job, credits.reason ?? "Insufficient credits");
    await admin.from("generations").update({ status: "failed" }).eq("id", job.generation_id);
    return { generations: [] };
  }

  const style =
    (project.style_settings as StyleSettings | null) ?? DEFAULT_STYLE_SETTINGS;
  const referenceImages = await collectReferenceImages(
    (project.product_data as ProductData | null)?.images,
  );

  // The model is pinned on the job payload at enqueue time (so "both"/alternating
  // routing is decided once); fall back to the project preference for older jobs.
  const model: ImageModel =
    (job.payload?.model as ImageModel | undefined) ??
    singleModel(modelPreference(style));

  let imageDataUrl: string;
  try {
    const out = await generateWithModel(model, {
      prompt,
      platform: style.platform,
      referenceImages,
    });
    imageDataUrl = out.imageDataUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : "generation_failed";
    if (job.attempts < job.max_attempts) {
      await requeue(admin, job, message);
    } else {
      await failJob(admin, job, message);
      await admin.from("generations").update({ status: "failed" }).eq("id", job.generation_id);
    }
    return { generations: [] };
  }

  // Deduct only after a successful render so failed generations never burn a
  // credit (mirrors /api/generate).
  const deducted = await deductCredits(project.user_id, GENERATION_CREDIT_COST);
  if (!deducted.ok) {
    await failJob(admin, job, deducted.reason ?? "Insufficient credits");
    await admin.from("generations").update({ status: "failed" }).eq("id", job.generation_id);
    return { generations: [] };
  }

  const { data: updated } = await admin
    .from("generations")
    .update({
      status: "completed",
      image_url: imageDataUrl,
      model_used: model,
      qa_status: "reviewing",
    })
    .eq("id", job.generation_id)
    .select("*")
    .single();

  // Chain a QA review job. Review is best-effort: the image is usable regardless.
  await admin.from("jobs").insert({
    project_id: job.project_id,
    generation_id: job.generation_id,
    concept_id: job.concept_id,
    concept_variant: job.concept_variant,
    type: "review",
    status: "pending",
    max_attempts: JOB_MAX_ATTEMPTS.review,
    payload: {},
  });

  await completeJob(admin, job);
  return {
    generations: updated ? [updated as Generation] : [],
    newBalance: deducted.new_balance,
  };
}

// review: Claude QA + bounded auto-rewrite walk. Retries only when the review
// call itself errored; on exhaustion the best-effort minor fallback stands.
async function processReview(
  admin: AdminClient,
  job: Job,
  project: Project,
): Promise<Generation[]> {
  if (!job.generation_id) {
    await failJob(admin, job, "review job missing generation_id");
    return [];
  }
  const outcome = await reviewGeneration(admin, job.generation_id, project.user_id);
  if (outcome.not_found) {
    await failJob(admin, job, "generation not found");
    return [];
  }
  if (outcome.review_failed && job.attempts < job.max_attempts) {
    await requeue(admin, job, "QA review error");
    return outcome.generations;
  }
  await completeJob(admin, job);
  return outcome.generations;
}

async function countRemaining(
  admin: AdminClient,
  projectId: string,
): Promise<{ pending: number; processing: number }> {
  const [{ count: pending }, { count: processing }] = await Promise.all([
    admin
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "pending"),
    admin
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "processing"),
  ]);
  return { pending: pending ?? 0, processing: processing ?? 0 };
}

// Claim and process exactly one job for a project. Callers tick this repeatedly
// (with bounded concurrency) until remaining_pending + remaining_processing is 0.
export async function processNextJob(projectId: string): Promise<ProcessResult> {
  const admin = createAdminClient();

  const { data: claimed, error: claimErr } = await admin.rpc("claim_next_job", {
    p_project_id: projectId,
  });
  if (claimErr) {
    const remaining = await countRemaining(admin, projectId);
    return {
      done: true,
      generations: [],
      remaining_pending: remaining.pending,
      remaining_processing: remaining.processing,
      error: claimErr.message,
    };
  }

  const job = (Array.isArray(claimed) ? claimed[0] : claimed) as Job | undefined;
  if (!job) {
    const remaining = await countRemaining(admin, projectId);
    return {
      done: true,
      generations: [],
      remaining_pending: remaining.pending,
      remaining_processing: remaining.processing,
    };
  }

  const { data: projectRow } = await admin
    .from("projects")
    .select("*")
    .eq("id", job.project_id)
    .single();
  if (!projectRow) {
    await failJob(admin, job, "project not found");
    const remaining = await countRemaining(admin, projectId);
    return {
      done: false,
      job: { id: job.id, type: job.type, status: "failed" },
      generations: [],
      remaining_pending: remaining.pending,
      remaining_processing: remaining.processing,
    };
  }
  const project = projectRow as Project;

  let generations: Generation[] = [];
  let newBalance: number | undefined;
  try {
    if (job.type === "generate") {
      const r = await processGenerate(admin, job, project);
      generations = r.generations;
      newBalance = r.newBalance;
    } else {
      // review (and the reserved rewrite type) both run the QA walk.
      generations = await processReview(admin, job, project);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "job_failed";
    if (job.attempts < job.max_attempts) {
      await requeue(admin, job, message);
    } else {
      await failJob(admin, job, message);
    }
  }

  const remaining = await countRemaining(admin, projectId);
  return {
    done: false,
    job: { id: job.id, type: job.type, status: job.status },
    generations,
    remaining_pending: remaining.pending,
    remaining_processing: remaining.processing,
    ...(typeof newBalance === "number" ? { new_balance: newBalance } : {}),
  };
}
