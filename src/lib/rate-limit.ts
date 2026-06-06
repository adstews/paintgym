import { createAdminClient } from "@/lib/supabase/admin";

// Lightweight per-IP, per-day rate limiting for the public demo tools, backed by
// the tool_usage table. This is best-effort (a rare race can let one extra
// request through), which is acceptable for free demo endpoints.

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

export async function checkRateLimit(
  ip: string,
  tool: string,
  limit: number,
): Promise<RateLimitResult> {
  // If the service role is not configured (e.g. local dev), do not block.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { allowed: true, remaining: limit, limit };
  }
  const day = new Date().toISOString().slice(0, 10);
  const idKey = `${ip}:${tool}:${day}`;
  const admin = createAdminClient();

  try {
    const { data } = await admin
      .from("tool_usage")
      .select("count")
      .eq("id_key", idKey)
      .maybeSingle();
    const current: number = data?.count ?? 0;
    if (current >= limit) {
      return { allowed: false, remaining: 0, limit };
    }
    await admin.from("tool_usage").upsert(
      {
        id_key: idKey,
        ip,
        tool,
        day,
        count: current + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id_key" },
    );
    return { allowed: true, remaining: limit - (current + 1), limit };
  } catch {
    // On any storage error, fail open rather than blocking a demo.
    return { allowed: true, remaining: limit, limit };
  }
}
