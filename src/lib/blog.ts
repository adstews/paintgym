import { createAdminClient } from "@/lib/supabase/admin";
import { LOCAL_POSTS, localPostBySlug, type BlogPost } from "@/content/blog";

// Read blog posts from the database (the blog_posts table) when it is available,
// and fall back to the in-repo content otherwise. This keeps the blog rendering
// for crawlers even before the seed migration runs, and lets it work locally
// without service-role credentials.

interface BlogRow {
  slug: string;
  title: string;
  description: string | null;
  content: string;
  author: string | null;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
}

function rowToPost(r: BlogRow): BlogPost {
  return {
    slug: r.slug,
    title: r.title,
    description: r.description ?? "",
    content: r.content,
    author: r.author ?? "Paintgym Team",
    publishedAt: (r.published_at ?? new Date().toISOString()).slice(0, 10),
    metaTitle: r.meta_title ?? undefined,
    metaDescription: r.meta_description ?? undefined,
    ogImage: r.og_image_url ?? undefined,
  };
}

function dbConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export async function getAllPosts(): Promise<BlogPost[]> {
  if (!dbConfigured()) return LOCAL_POSTS;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("blog_posts")
      .select(
        "slug, title, description, content, author, published_at, meta_title, meta_description, og_image_url",
      )
      .eq("is_published", true)
      .order("published_at", { ascending: false });
    if (error || !data || data.length === 0) return LOCAL_POSTS;
    return (data as BlogRow[]).map(rowToPost);
  } catch {
    return LOCAL_POSTS;
  }
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (dbConfigured()) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from("blog_posts")
        .select(
          "slug, title, description, content, author, published_at, meta_title, meta_description, og_image_url",
        )
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (data) return rowToPost(data as BlogRow);
    } catch {
      // fall through to local
    }
  }
  return localPostBySlug(slug) ?? null;
}
