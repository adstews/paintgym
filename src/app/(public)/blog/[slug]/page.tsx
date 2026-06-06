import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { JsonLd } from "@/components/marketing/json-ld";
import { ShareButtons } from "@/components/marketing/share-buttons";
import { articleSchema, breadcrumbSchema } from "@/lib/seo/schema";
import { pageMetadata, absUrl } from "@/lib/seo/site";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import {
  renderMarkdown,
  extractToc,
  readingTimeMinutes,
} from "@/lib/markdown";

// Re-query the blog_posts table hourly so DB edits appear without a redeploy.
export const revalidate = 3600;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post not found" };
  return pageMetadata({
    title: post.metaTitle ?? post.title,
    description: post.metaDescription ?? post.description,
    path: `/blog/${post.slug}`,
    type: "article",
    publishedTime: post.publishedAt,
    ogImage: post.ogImage,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const html = renderMarkdown(post.content);
  const toc = extractToc(post.content);
  const minutes = readingTimeMinutes(post.content);
  const url = absUrl(`/blog/${post.slug}`);

  const all = await getAllPosts();
  const related = all.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <MarketingShell active="/blog">
      <JsonLd
        data={[
          articleSchema(post),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
        ]}
      />

      <header className="pg-hero" style={{ paddingBottom: 0 }}>
        <Link href="/blog" className="pg-backlink">
          ← Back to blog
        </Link>
        <h1 className="pg-articletitle" style={{ marginTop: 16 }}>
          {post.title}
        </h1>
        <div className="pg-readmeta">
          <span>
            By <b>{post.author}</b>
          </span>
          <span className="dot" />
          <span>{formatDate(post.publishedAt)}</span>
          <span className="dot" />
          <span>{minutes} min read</span>
        </div>
        <div style={{ marginTop: 14 }}>
          <ShareButtons url={url} title={post.title} />
        </div>
      </header>

      <section className="pg-section">
        <div className="pg-article-grid">
          {toc.length > 0 && (
            <aside className="pg-toc-wrap">
              <div className="pg-toc">
                <div className="toc-k">On this page</div>
                <ul>
                  {toc.map((t) => (
                    <li key={t.id} className={`lvl-${t.level}`}>
                      <a href={`#${t.id}`}>{t.text}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}
          <article
            className="pg-prose"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </section>

      {related.length > 0 && (
        <section className="pg-section">
          <div className="pg-section-k">
            <b>Keep reading</b>
          </div>
          <div className="pg-related">
            {related.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`}>
                <div className="t">{p.title}</div>
                <div className="m">{readingTimeMinutes(p.content)} min read</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="pg-land-cta">
        <h3>Generate ads for your product</h3>
        <div className="pg-cta-row">
          <Link href="/signup" className="pg-btn pg-btn--pop pg-btn--md">
            Start free
          </Link>
          <Link
            href="/how-it-works"
            className="pg-btn pg-btn--outline pg-btn--md"
          >
            How it works
          </Link>
        </div>
      </div>
    </MarketingShell>
  );
}
