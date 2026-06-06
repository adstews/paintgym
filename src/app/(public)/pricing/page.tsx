import type { Metadata } from "next";
import { TfPricing } from "@/components/tf/tf-pricing";
import { CREDIT_PACKS } from "@/content/credit-packs";
import { JsonLd } from "@/components/marketing/json-ld";
import { productSchema } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "Simple credit packs, no subscription. Write briefs free and spend a credit only when you generate an image. Credits never expire. Packs from $39.",
  path: "/pricing",
  keywords: [
    "Paintgym pricing",
    "AI ad creative pricing",
    "ad generator cost",
    "credit packs",
  ],
});

export default function PricingPage() {
  return (
    <>
      <JsonLd data={productSchema(CREDIT_PACKS)} />
      <TfPricing />
    </>
  );
}
