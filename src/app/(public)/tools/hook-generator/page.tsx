import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { JsonLd } from "@/components/marketing/json-ld";
import { toolSchema, breadcrumbSchema } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/site";
import { HookGeneratorTool } from "@/components/marketing/tools/hook-generator";

export const metadata: Metadata = pageMetadata({
  title: "Free Ad Hook Generator",
  description:
    "Generate proven ad hooks for any product category, free and with no login. Pick a category and get five scroll-stopping hooks filled in, from a bank of 20.",
  path: "/tools/hook-generator",
  keywords: [
    "ad hook generator",
    "free hook generator",
    "ad copy hooks",
    "Facebook ad hooks",
    "TikTok hooks",
  ],
});

export default function HookGeneratorPage() {
  return (
    <MarketingShell active="/tools/hook-generator">
      <JsonLd
        data={[
          toolSchema({
            name: "Free Ad Hook Generator",
            description:
              "Generate proven ad hooks for any product category, free.",
            path: "/tools/hook-generator",
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Free Hook Generator", path: "/tools/hook-generator" },
          ]),
        ]}
      />
      <header className="pg-hero">
        <div className="kick">free tool · no login</div>
        <h1>
          AD HOOK <span className="lime">GENERATOR</span>
        </h1>
        <p className="sub">
          Pick a product category and get five proven hooks, filled in and ready
          to test. Reshuffle for more from the bank of 20.
        </p>
      </header>
      <HookGeneratorTool />
    </MarketingShell>
  );
}
