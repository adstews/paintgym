import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { addCredits } from "@/lib/credits";
import type Stripe from "stripe";

export const runtime = "nodejs";

// The webhook needs the raw bytes for signature verification, so we read the
// request as text and pass that to Stripe.

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not set" },
      { status: 500 },
    );
  }
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json(
      {
        error: "invalid_signature",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 400 },
    );
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.metadata?.user_id;
  const creditsStr = session.metadata?.credits;
  const amount = session.amount_total ?? 0;
  if (!userId || !creditsStr) {
    return NextResponse.json({ received: true });
  }
  const credits = Number.parseInt(creditsStr, 10);
  if (!Number.isFinite(credits) || credits <= 0) {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();
  // Idempotency: unique stripe_session_id ensures a replayed webhook is a noop.
  const { error: insErr } = await admin.from("credit_purchases").insert({
    user_id: userId,
    credits,
    amount_paid_cents: amount,
    stripe_session_id: session.id,
  });
  if (insErr) {
    if (insErr.code === "23505") {
      // Already processed.
      return NextResponse.json({ received: true });
    }
    return NextResponse.json(
      { error: "insert_failed", message: insErr.message },
      { status: 500 },
    );
  }

  await addCredits(userId, credits);
  return NextResponse.json({ received: true });
}
