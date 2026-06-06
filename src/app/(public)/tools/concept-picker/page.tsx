import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { JsonLd } from "@/components/marketing/json-ld";
import { toolSchema, breadcrumbSchema } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/site";
import { ConceptPickerTool } from "@/components/marketing/tools/concept-picker";

export const metadata: Metadata = pageMetadata({
  title: "Free Ad Concept Picker",
  description:
    "Answer five quick questions and get the five static ad concepts most likely to convert for your product. Free, no login, from a library of 35 frameworks.",
  path: "/tools/concept-picker",
  keywords: [
    "ad concept picker",
    "static ad ideas",
    "which ad format",
    "Meta ad concepts",
  ],
});

export default function ConceptPickerPage() {
  return (
    <MarketingShell active="/tools/concept-picker">
      <JsonLd
        data={[
          toolSchema({
            name: "Free Ad Concept Picker",
            description:
              "A quiz that recommends the five best static ad concepts for your product.",
            path: "/tools/concept-picker",
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Concept Picker", path: "/tools/concept-picker" },
          ]),
        ]}
      />
      <header className="pg-hero">
        <div className="kick">free tool · no login</div>
        <h1>
          CONCEPT <span className="lime">PICKER</span>
        </h1>
        <p className="sub">
          Five questions, five concepts. Find the static ad frameworks most
          likely to work for your product, drawn from the full library of 35.
        </p>
      </header>
      <ConceptPickerTool />
    </MarketingShell>
  );
}
