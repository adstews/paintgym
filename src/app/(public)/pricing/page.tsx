import type { Metadata } from "next";
import { TfPricing } from "@/components/tf/tf-pricing";

export const metadata: Metadata = { title: "Pricing — paintgym" };

export default function PricingPage() {
  return <TfPricing />;
}
