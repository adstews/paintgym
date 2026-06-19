// Shared classifier for transient image-generation failures: provider overload
// (503 "high demand"), gateway errors, rate limits, deadline/timeouts, dropped
// connections, and the occasional empty (text-only / safety-deflected) response.
//
// ONE definition is used in two places that MUST agree:
//   1. Each model generator's internal retry loop (gemini + openai).
//   2. The queue worker's last-resort failover gate — it only fails a job over
//      to the other model when the failure was transient. If the two used
//      different lists, the worker could fail over on an error the generator
//      treated as permanent (wasting an OpenAI call), or skip failover on an
//      overload the generator kept retrying. Sharing the list rules that out.
export function isTransientImageError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("no image data") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("overloaded") ||
    msg.includes("unavailable") ||
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit") ||
    msg.includes("quota") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("deadline") ||
    msg.includes("aborted") ||
    msg.includes("econnreset") ||
    msg.includes("fetch failed") ||
    msg.includes("network")
  );
}
