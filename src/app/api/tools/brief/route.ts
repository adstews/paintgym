import { NextResponse } from "next/server";
import { z } from "zod";
import { generatePublicBoldClaimBrief } from "@/lib/anthropic/public-brief";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  productName: z.string().min(1).max(120),
  whatItDoes: z.string().min(3).max(400),
  keyBenefit: z.string().min(3).max(300),
});

// Public, unauthenticated brief demo for /tools/brief-preview. Writes one Bold
// Claim brief. Rate limited to 1 brief per IP per day.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const ip = getClientIp(request);
  const rl = await checkRateLimit(ip, "brief", 1);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message:
          "You have used your free brief for today. Sign up to write briefs for all 35 concepts.",
      },
      { status: 429 },
    );
  }

  try {
    const brief = await generatePublicBoldClaimBrief(parsed.data);
    return NextResponse.json({ brief, remaining: rl.remaining });
  } catch (err) {
    return NextResponse.json(
      {
        error: "brief_failed",
        message:
          err instanceof Error ? err.message : "Could not write the brief.",
      },
      { status: 502 },
    );
  }
}
