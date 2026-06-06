import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { JsonLd } from "@/components/marketing/json-ld";
import { toolSchema, breadcrumbSchema } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/site";
import { BriefPreviewTool } from "@/components/marketing/tools/brief-preview";

export const metadata: Metadata = pageMetadata({
  title: "Free AI Ad Brief Generator",
  description:
    "Enter your product and get a real AI-written ad creative brief for the Bold Claim concept. Free, no login, written by Claude. One brief per day.",
  path: "/tools/brief-preview",
  keywords: [
    "ad brief generator",
    "AI creative brief",
    "ad concept brief",
    "free ad copy generator",
  ],
});

export default function BriefPreviewPage() {
  return (
    <MarketingShell active="/tools/brief-preview">
      <JsonLd
        data={[
          toolSchema({
            name: "Free AI Ad Brief Generator",
            description:
              "Get a real AI-written ad creative brief for your product.",
            path: "/tools/brief-preview",
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Brief Preview", path: "/tools/brief-preview" },
          ]),
        ]}
      />
      <header className="pg-hero">
        <div className="kick">free tool · no login</div>
        <h1>
          BRIEF <span className="lime">PREVIEW</span>
        </h1>
        <p className="sub">
          See the kind of brief Paintgym writes. Give us a product and three
          lines, and Claude writes a real Bold Claim ad brief, free.
        </p>
      </header>
      <BriefPreviewTool />
    </MarketingShell>
  );
}
