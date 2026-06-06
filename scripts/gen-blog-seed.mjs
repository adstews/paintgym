// Generates supabase/migrations/0021_seed_blog_posts.sql from the in-repo blog
// content (the single source of truth). Run with:
//   node scripts/gen-blog-seed.mjs
// Each post module only has a type-only import, which Node strips, so importing
// the .ts files directly works without a build step.
import { writeFileSync } from "node:fs";
import { post as p1 } from "../src/content/blog/posts/best-ai-ad-creative-tools-2026.ts";
import { post as p2 } from "../src/content/blog/posts/35-static-ad-concepts-that-convert-on-meta.ts";
import { post as p3 } from "../src/content/blog/posts/how-to-create-ad-creatives-with-ai-in-30-minutes.ts";
import { post as p4 } from "../src/content/blog/posts/ai-ads-vs-human-made-ads.ts";
import { post as p5 } from "../src/content/blog/posts/complete-guide-to-ai-ugc-ads-2026.ts";

const posts = [p1, p2, p3, p4, p5];

const q = (v) => (v == null ? "null" : `'${String(v).replace(/'/g, "''")}'`);

const rows = posts
  .map((p) => {
    const cols = [
      q(p.slug),
      q(p.title),
      q(p.description),
      q(p.content),
      q(p.author),
      `'${p.publishedAt}T12:00:00Z'`,
      "true",
      q(p.metaTitle ?? p.title),
      q(p.metaDescription ?? p.description),
      q(p.ogImage ?? null),
    ];
    return `  (${cols.join(",\n   ")})`;
  })
  .join(",\n");

const sql = `-- Seed the blog_posts table with the launch set of 5 posts.
-- Generated from src/content/blog by scripts/gen-blog-seed.mjs. Do not edit by hand;
-- edit the content modules and re-run the generator.
-- Idempotent: re-running upserts on slug.

insert into public.blog_posts
  (slug, title, description, content, author, published_at, is_published, meta_title, meta_description, og_image_url)
values
${rows}
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  content = excluded.content,
  author = excluded.author,
  published_at = excluded.published_at,
  is_published = excluded.is_published,
  meta_title = excluded.meta_title,
  meta_description = excluded.meta_description,
  og_image_url = excluded.og_image_url,
  updated_at = now();
`;

const out = new URL(
  "../supabase/migrations/0021_seed_blog_posts.sql",
  import.meta.url,
);
writeFileSync(out, sql);
console.log(
  `Wrote 0021_seed_blog_posts.sql (${posts.length} posts, ${sql.length} bytes)`,
);
