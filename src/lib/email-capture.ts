import { createAdminClient } from "@/lib/supabase/admin";

// Store an email captured by one of the public free tools. No-ops gracefully
// when the service role is not configured (local dev) so the tools still work.
export async function captureEmail(
  email: string,
  source: string,
  payload?: Record<string, unknown>,
): Promise<boolean> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("email_captures")
      .insert({ email, source, payload: payload ?? null });
    return !error;
  } catch {
    return false;
  }
}
