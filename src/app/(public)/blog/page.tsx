import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { JsonLd } from "@/components/marketing/json-ld";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/site";
import { getAllPosts } from "@/lib/blog";
import { readingTimeMinutes } from "@/lib/markdown";

// Re-query the blog_posts table hourly so DB edits and new posts appear
// without a redeploy.
export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Blog",
  description:
    "Guides on AI ad creative, static ad concepts, Meta ad frameworks, and AI UGC. Practical, no-fluff writing from the Paintgym team.",
  path: "/blog",
  keywords: [
    "AI ad creative blog",
    "static ad concepts",
    "Meta ad frameworks",
    "AI UGC ads",
  ],
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function BlogIndexPage() {
  const posts = await getAllPosts();
  return (
    <MarketingShell active="/blog">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
        ])}
      />

      <header className="pg-hero">
        <div className="kick">field notes</div>
        <h1>
          THE <span className="lime">PLAYBOOK</span>
        </h1>
        <p className="sub">
          How to make ad creative that actually performs. Concepts, hooks, tools,
          and the cost math behind AI ads.
        </p>
      </header>

      <section className="pg-section">
        <div className="pg-blog-list">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="pg-blog-card">
              <div className="t">{p.title}</div>
              <div className="d">{p.description}</div>
              <div className="m">
                <span>{formatDate(p.publishedAt)}</span>
                <span className="dot" />
                <span>{readingTimeMinutes(p.content)} min read</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="pg-land-cta">
        <h3>Stop reading, start training</h3>
        <div className="pg-cta-row">
          <Link href="/signup" className="pg-btn pg-btn--pop pg-btn--md">
            Start free
          </Link>
        </div>
      </div>
    </MarketingShell>
  );
}
