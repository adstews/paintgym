export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  author: string;
  /** ISO date string, e.g. "2026-06-06". */
  publishedAt: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  /** Markdown body. */
  content: string;
}
