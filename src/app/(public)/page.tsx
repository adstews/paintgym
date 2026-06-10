import type { Metadata } from "next";
import { MarketingHome } from "@/components/marketing/home";
import { JsonLd } from "@/components/marketing/json-ld";
import {
  organizationSchema,
  softwareApplicationSchema,
} from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = pageMetadata({
  title: "Paintgym — AI Ad Creatives in Minutes",
  titleAbsolute: true,
  description:
    "Paste one product link and Paintgym builds a wall of static ad creative across 35 proven concepts. Claude writes the briefs, Gemini and GPT render the images, and a QA agent reviews every one.",
  path: "/",
  keywords: [
    "AI ad creative",
    "AI ad generator",
    "static ad maker",
    "Meta ad creative tool",
    "Facebook ad generator",
    "ad concept generator",
  ],
});

export default function LandingPage() {
  return (
    <>
      <JsonLd data={[organizationSchema(), softwareApplicationSchema()]} />
      <MarketingHome />
    </>
  );
}
