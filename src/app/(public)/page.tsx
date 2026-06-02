import type { Metadata } from "next";
import { TfLanding } from "@/components/tf/tf-landing";

export const metadata: Metadata = {
  title: "paintgym — build ad volume",
  description:
    "Paste a product link and train a whole wall of ad concepts across 35 proven frameworks. Rate, refine, ship your PRs.",
};

export default function LandingPage() {
  return <TfLanding />;
}
