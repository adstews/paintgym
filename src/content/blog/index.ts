import type { BlogPost } from "./types";
import { post as bestTools } from "./posts/best-ai-ad-creative-tools-2026";
import { post as concepts35 } from "./posts/35-static-ad-concepts-that-convert-on-meta";
import { post as how30min } from "./posts/how-to-create-ad-creatives-with-ai-in-30-minutes";
import { post as aiVsHuman } from "./posts/ai-ads-vs-human-made-ads";
import { post as ugcGuide } from "./posts/complete-guide-to-ai-ugc-ads-2026";

export type { BlogPost } from "./types";

// In-repo source of truth for blog content. The blog pages and sitemap read
// from the database first (the blog_posts table) and fall back to this list so
// the site renders even before the seed migration is applied.
export const LOCAL_POSTS: BlogPost[] = [
  bestTools,
  concepts35,
  how30min,
  aiVsHuman,
  ugcGuide,
].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

export function localPostBySlug(slug: string): BlogPost | undefined {
  return LOCAL_POSTS.find((p) => p.slug === slug);
}
