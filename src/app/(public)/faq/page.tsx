import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { JsonLd } from "@/components/marketing/json-ld";
import { faqSchema, breadcrumbSchema } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = pageMetadata({
  title: "FAQ",
  description:
    "Answers to common questions about Paintgym: how it generates ad images, the 49 concepts, pricing, image models, the QA review, credits, regeneration, and formats.",
  path: "/faq",
  keywords: ["Paintgym FAQ", "AI ad generator questions", "how Paintgym works"],
});

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is Paintgym?",
    a: "Paintgym is an AI ad creative generator for paid social. You paste a product link, and it writes custom creative briefs for 49 proven ad concepts, then renders finished static ads with built-in quality control. It is built to give DTC brands and performance marketers ad volume across many angles, not just one polished hero.",
  },
  {
    q: "How does Paintgym generate ad images?",
    a: "First a Claude model reads your product data and writes a detailed image-generation brief for each concept: the composition, the on-image copy, the layout, and the color palette. That brief is then sent to an image model that renders the ad. A separate review agent checks the result before it reaches you. Eleven of the concepts skip image generation entirely and render as pixel-perfect HTML screenshots.",
  },
  {
    q: "What are the 49 ad concept frameworks?",
    a: "They are 49 distinct static ad structures, each suited to a different buyer and stage: hero shots, three-benefit layouts, before and after, comparison charts, social proof walls, founder notes, bold typographic claims, and native screenshot formats like iMessage, Reddit threads, and a Notes app list. Each one has a reason it works and niches it fits. You can read the full breakdown in our guide to 49 static ad concepts.",
  },
  {
    q: "How much does Paintgym cost?",
    a: "Pricing is credit based with no subscription. Writing briefs is free, and you spend one credit only when you generate an image. Credit packs start at $39 for 50 credits and scale down to about $0.40 per ad on larger packs. Credits never expire. See the pricing page for the current packs.",
  },
  {
    q: "What image models does Paintgym use?",
    a: "Two. You can render with Gemini (also called Nano Banana Pro) or a GPT image model, and you can run both side by side on the same concept to compare. Different models win for different products, so having both in one place saves you the cross-tool shuffle.",
  },
  {
    q: "Can I use the images for Meta and Facebook ads?",
    a: "Yes. Every concept is built in the 4:5 (1080x1350) format that performs on Meta and Instagram feeds, and you export high-resolution files ready to upload. The native screenshot concepts are especially strong for cold prospecting because they do not look like ads.",
  },
  {
    q: "What is the QA review process?",
    a: "After an image is generated, a separate model reviews it for the common failure modes: garbled or misspelled text, the wrong product, and broken or unbalanced layouts. Weak renders get flagged or regenerated instead of landing in your export folder. This is what keeps the cheap, fast ads from becoming expensive mistakes.",
  },
  {
    q: "How do credits work?",
    a: "One credit generates one image. Writing briefs costs nothing, and the eleven HTML screenshot concepts render free. Refining or making a new version of an ad also uses one credit. You buy a pack once, top up whenever, and the credits do not expire.",
  },
  {
    q: "Can I regenerate images?",
    a: "Yes. If an ad is close but not quite right, you can refine it with a short note (for example, make the headline bigger or use your brand navy) and Paintgym generates a new version. You can also regenerate a concept outright or render it with the other image model to compare.",
  },
  {
    q: "What formats does Paintgym support?",
    a: "Paintgym is static-first and focused on the 4:5 (1080x1350) format that wins on Meta and Instagram. Images export as high-resolution PNG files, with bulk export for a whole set. Video features live alongside the static engine for teams building a full testing layer.",
  },
];

export default function FaqPage() {
  return (
    <MarketingShell active="/faq">
      <JsonLd
        data={[
          faqSchema(FAQS),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "FAQ", path: "/faq" },
          ]),
        ]}
      />

      <header className="pg-hero">
        <div className="kick">questions, answered</div>
        <h1>
          PAINTGYM <span className="lime">FAQ</span>
        </h1>
        <p className="sub">
          The short answers to what people ask most. Still stuck? The{" "}
          <Link href="/how-it-works" style={{ color: "var(--ink)" }}>
            how it works
          </Link>{" "}
          page walks through the whole flow.
        </p>
      </header>

      <section className="pg-section">
        <div className="pg-faq">
          {FAQS.map((f) => (
            <div className="pg-faq-row" key={f.q}>
              <div className="q">{f.q}</div>
              <div className="a">{f.a}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="pg-land-cta">
        <h3>Ready to build ad volume?</h3>
        <div className="pg-cta-row">
          <Link href="/signup" className="pg-btn pg-btn--pop pg-btn--md">
            Start free
          </Link>
          <Link
            href="/tools/brief-preview"
            className="pg-btn pg-btn--outline pg-btn--md"
          >
            Preview a brief
          </Link>
        </div>
      </div>
    </MarketingShell>
  );
}
