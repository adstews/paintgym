import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { getAllPosts } from "@/lib/blog";

// Refresh hourly so newly published posts enter the sitemap without a redeploy.
export const revalidate = 3600;

type Freq = MetadataRoute.Sitemap[number]["changeFrequency"];

const STATIC_ROUTES: { path: string; changeFrequency: Freq; priority: number }[] =
  [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/how-it-works", changeFrequency: "monthly", priority: 0.9 },
    { path: "/pricing", changeFrequency: "monthly", priority: 0.9 },
    { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
    { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
    { path: "/signup", changeFrequency: "monthly", priority: 0.6 },
    { path: "/login", changeFrequency: "yearly", priority: 0.3 },
    { path: "/tools/hook-generator", changeFrequency: "monthly", priority: 0.7 },
    { path: "/tools/concept-picker", changeFrequency: "monthly", priority: 0.7 },
    { path: "/tools/url-scraper", changeFrequency: "monthly", priority: 0.7 },
    { path: "/tools/brief-preview", changeFrequency: "monthly", priority: 0.7 },
  ];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const posts = await getAllPosts();
  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.publishedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...postEntries];
}
