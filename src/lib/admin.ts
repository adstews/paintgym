// Admin allowlist driven by the ADMIN_EMAILS env var (comma-separated).
// This runs in server code only; ADMIN_EMAILS must NOT be NEXT_PUBLIC.

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}
