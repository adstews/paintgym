import { NextResponse } from "next/server";
import { z } from "zod";
import { captureEmail } from "@/lib/email-capture";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  source: z.string().min(1).max(60),
  payload: z.record(z.string(), z.unknown()).optional(),
});

// Public email capture for the free tools. Stored via the service role.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  await captureEmail(parsed.data.email, parsed.data.source, parsed.data.payload);
  // Always return ok: a capture failure should not block the user's flow.
  return NextResponse.json({ ok: true });
}
