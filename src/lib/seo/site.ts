// Central SEO constants. Every public page builds its metadata from these so the
// canonical host, OG defaults, and titles stay consistent across the site.

export const SITE_URL = "https://www.paintgym.com";
export const SITE_NAME = "Paintgym";
export const SITE_TAGLINE = "AI ad creatives in minutes";
export const DEFAULT_OG_IMAGE = "/og-default.png";
export const TWITTER_HANDLE = "@paintgym";

export const DEFAULT_DESCRIPTION =
  "Paintgym turns one product link into a wall of paid-social ad creative. " +
  "Claude writes custom briefs for 49 proven ad concepts, then Gemini or GPT image models render them with built-in quality control.";

/** Resolve a path to an absolute URL on the canonical host. */
export function absUrl(path = "/"): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

type PageMetaInput = {
  title: string;
  /** When true, ignore the "%s | Paintgym" template and use the title as-is. */
  titleAbsolute?: boolean;
  description?: string;
  path: string;
  keywords?: string[];
  ogImage?: string;
  type?: "website" | "article";
  publishedTime?: string;
  noIndex?: boolean;
};

/**
 * Build a Next Metadata object for a public page. Sets the canonical URL,
 * OpenGraph and Twitter cards from one set of inputs.
 */
export function pageMetadata(input: PageMetaInput) {
  const description = input.description ?? DEFAULT_DESCRIPTION;
  const image = input.ogImage ?? DEFAULT_OG_IMAGE;
  return {
    title: input.titleAbsolute ? { absolute: input.title } : input.title,
    description,
    keywords: input.keywords,
    alternates: { canonical: input.path },
    robots: input.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: input.title,
      description,
      url: absUrl(input.path),
      siteName: SITE_NAME,
      type: input.type ?? "website",
      images: [{ url: image, width: 1200, height: 630, alt: input.title }],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image" as const,
      title: input.title,
      description,
      images: [image],
    },
  };
}
