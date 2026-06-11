import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { JsonLd } from "@/components/marketing/json-ld";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = pageMetadata({
  title: "How It Works",
  description:
    "See how Paintgym turns one product link into 49 finished ad creatives: scrape your product, write briefs with Claude, render with Gemini or GPT, review with a QA agent, then download.",
  path: "/how-it-works",
  keywords: [
    "how Paintgym works",
    "AI ad creation process",
    "generate ad creatives with AI",
  ],
});

const STEPS = [
  {
    n: 1,
    h: "Enter your product details",
    p: "Paste a product URL and Paintgym pulls your product name, price, description, images, and brand colors automatically. No URL handy? Type the details in by hand. The sharper the input, the sharper the ads.",
    link: { href: "/tools/url-scraper", label: "Try the URL scraper" },
  },
  {
    n: 2,
    h: "Claude writes custom briefs",
    p: "A Claude model reads your product and writes a tailored creative brief for each of 49 proven ad concepts. Every brief names your real benefits and never invents a claim, a price, or a testimonial.",
    link: { href: "/tools/brief-preview", label: "Preview a real brief" },
  },
  {
    n: 3,
    h: "Choose your image model",
    p: "Render with Gemini (Nano Banana Pro) or a GPT image model, or run both side by side to compare. Eleven screenshot concepts, like iMessage and Reddit threads, render as real HTML and cost nothing.",
    link: {
      href: "/blog/35-static-ad-concepts-that-convert-on-meta",
      label: "See all 49 concepts",
    },
  },
  {
    n: 4,
    h: "AI generates with built-in QA",
    p: "Each image is generated and then reviewed by a separate quality-control agent that catches the common failures: garbled text, the wrong product, a broken layout. Weak renders get flagged or regenerated before you see them.",
    link: null,
  },
  {
    n: 5,
    h: "Review, rate, refine, download",
    p: "Rate the strongest ads, refine the close ones with a quick note, and export high-resolution 1080x1350 files sized for Meta. Bulk export pulls the whole set at once.",
    link: { href: "/pricing", label: "See pricing" },
  },
];

export default function HowItWorksPage() {
  return (
    <MarketingShell active="/how-it-works">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "How it works", path: "/how-it-works" },
        ])}
      />

      <header className="pg-hero">
        <div className="kick">the five reps</div>
        <h1>
          HOW <span className="lime">PAINTGYM</span> WORKS
        </h1>
        <p className="sub">
          One product link in, a wall of ad creative out. Here is the whole flow,
          from a URL to finished images you can ship to Meta, in about thirty
          minutes.
        </p>
      </header>

      <section className="pg-section">
        <div className="pg-section-k">
          <b>The process</b> · five steps
        </div>
        <div className="pg-steps">
          {STEPS.map((s) => (
            <div className="pg-step" key={s.n}>
              <div className="num">{s.n}</div>
              <div>
                <h4>{s.h}</h4>
                <p>{s.p}</p>
                {s.link && (
                  <p style={{ marginTop: 10 }}>
                    <Link
                      href={s.link.href}
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        color: "var(--ink)",
                        letterSpacing: ".04em",
                      }}
                    >
                      {s.link.label} →
                    </Link>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="pg-statband">
        <div className="big">49</div>
        <p>
          proven ad concepts written and rendered from a single product URL, with
          two image models and a quality-control pass on every one.
        </p>
      </div>

      <section className="pg-section">
        <div className="pg-section-k">
          <b>What you can do for free</b>
        </div>
        <div className="pg-grid-cards">
          <ToolCard
            href="/tools/hook-generator"
            title="Hook generator"
            desc="See proven ad hooks filled in for your product category."
          />
          <ToolCard
            href="/tools/concept-picker"
            title="Concept picker"
            desc="Answer five questions and get the five concepts that fit your product."
          />
          <ToolCard
            href="/tools/url-scraper"
            title="URL scraper"
            desc="Paste a product link and see exactly what Paintgym extracts."
          />
          <ToolCard
            href="/tools/brief-preview"
            title="Brief preview"
            desc="Read a real creative brief written for your product."
          />
        </div>
      </section>

      <div className="pg-land-cta">
        <h3>Build your first wall of ads</h3>
        <div className="pg-cta-row">
          <Link href="/signup" className="pg-btn pg-btn--pop pg-btn--md">
            Start free
          </Link>
          <Link href="/pricing" className="pg-btn pg-btn--outline pg-btn--md">
            See pricing
          </Link>
        </div>
      </div>
    </MarketingShell>
  );
}

function ToolCard({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href} className="pg-conceptcard" style={{ display: "block" }}>
      <div className="t">{title}</div>
      <div className="d">{desc}</div>
    </Link>
  );
}
