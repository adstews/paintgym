import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { JsonLd } from "@/components/marketing/json-ld";
import { toolSchema, breadcrumbSchema } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/site";
import { UrlScraperTool } from "@/components/marketing/tools/url-scraper";

export const metadata: Metadata = pageMetadata({
  title: "Free Product URL Scraper",
  description:
    "Paste any product URL and see what Paintgym extracts: product name, price, description, images, and brand colors. Free, no login, 3 scrapes per day.",
  path: "/tools/url-scraper",
  keywords: [
    "product URL scraper",
    "product data extractor",
    "scrape product page",
    "brand color extractor",
  ],
});

export default function UrlScraperPage() {
  return (
    <MarketingShell active="/tools/url-scraper">
      <JsonLd
        data={[
          toolSchema({
            name: "Free Product URL Scraper",
            description:
              "Extract product name, price, description, images, and brand colors from any URL.",
            path: "/tools/url-scraper",
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "URL Scraper", path: "/tools/url-scraper" },
          ]),
        ]}
      />
      <header className="pg-hero">
        <div className="kick">free tool · no login</div>
        <h1>
          URL <span className="lime">SCRAPER</span>
        </h1>
        <p className="sub">
          Paste a product link and see exactly what Paintgym pulls before it
          writes a single brief: name, price, description, images, brand colors.
        </p>
      </header>
      <UrlScraperTool />
    </MarketingShell>
  );
}
