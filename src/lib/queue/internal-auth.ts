import { createHash, timingSafeEqual } from "crypto";

// Shared secret for server-to-server queue calls (the self-chaining worker and
// the cron sweep). Prefers an explicit env var; otherwise derives a stable
// secret from the service-role key so no new env var is strictly required.
// The secret only ever travels in requests to our own origin.
export function internalQueueSecret(): string {
  const explicit =
    process.env.QUEUE_WORKER_SECRET || process.env.CRON_SECRET;
  if (explicit) return explicit;
  const seed = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHash("sha256").update(`paintgym-queue:${seed}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// True when the request carries the internal queue secret (x-queue-secret) or
// the Vercel cron bearer token (Authorization: Bearer $CRON_SECRET).
export function isInternalQueueRequest(request: Request): boolean {
  const header = request.headers.get("x-queue-secret");
  if (header && safeEqual(header, internalQueueSecret())) return true;

  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (cronSecret && auth && safeEqual(auth, `Bearer ${cronSecret}`)) {
    return true;
  }
  return false;
}
