import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe";
import { stripeCheckoutSchema } from "@/lib/validators/schemas";
import { findPack, ensureProfile } from "@/lib/credits";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = stripeCheckoutSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const pack = findPack(parsed.data.pack);
  if (!pack) {
    return NextResponse.json({ error: "unknown_pack" }, { status: 400 });
  }

  const stripe = getStripeClient();
  const profile = await ensureProfile(user.id);

  let customerId = profile.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    const admin = createAdminClient();
    await admin
      .from("user_profiles")
      .update({
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    request.headers.get("origin") ??
    "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    success_url: `${origin}/dashboard?purchase=success`,
    cancel_url: `${origin}/dashboard?purchase=cancelled`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: pack.amount_cents,
          product_data: {
            name: `Paintgym ${pack.label} pack`,
            description: `${pack.credits} image unlock credits`,
          },
        },
      },
    ],
    metadata: {
      user_id: user.id,
      pack_id: pack.id,
      credits: String(pack.credits),
    },
  });

  return NextResponse.json({ url: session.url });
}
