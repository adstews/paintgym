"use client";

// Public Training Floor pricing. "Buy" routes to signup (real Stripe checkout is
// logged-in / in-app, unchanged); back returns to the landing.
import { useRouter } from "next/navigation";
import { Pricing } from "@/components/tf/marketing";

export function TfPricing() {
  const router = useRouter();
  return (
    <div className="pg-stage">
      <div className="pg-phone">
        <div className="pg-screen">
          <Pricing
            credits={0}
            reason=""
            onBuy={() => router.push("/signup")}
            onBack={() => router.push("/")}
          />
        </div>
      </div>
    </div>
  );
}
