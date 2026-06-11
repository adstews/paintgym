import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  absUrl,
  DEFAULT_OG_IMAGE,
} from "./site";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absUrl(DEFAULT_OG_IMAGE),
    description: DEFAULT_DESCRIPTION,
    sameAs: ["https://x.com/paintgym"],
  };
}

export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description:
      "AI ad creative generator. Paste a product link and Paintgym writes custom briefs for 49 proven ad concepts, then renders them with Gemini or GPT image models and a built-in quality-control review.",
    offers: {
      "@type": "Offer",
      price: "39",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "120",
    },
  };
}

export function faqSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

export function productSchema(
  packs: { n: string; c: number; p: number; blurb: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${SITE_NAME} Credit Packs`,
    description:
      "Credit packs for generating AI ad creatives. No subscription, credits never expire.",
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: packs.map((pk) => ({
      "@type": "Offer",
      name: `${pk.n} pack`,
      description: `${pk.c} ad credits. ${pk.blurb}.`,
      price: String(pk.p),
      priceCurrency: "USD",
      url: absUrl("/pricing"),
      availability: "https://schema.org/InStock",
    })),
  };
}

export function articleSchema(post: {
  title: string;
  description: string;
  slug: string;
  author: string;
  publishedAt: string;
  ogImage?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: absUrl(post.ogImage ?? DEFAULT_OG_IMAGE),
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: { "@type": "Organization", name: post.author },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: absUrl(DEFAULT_OG_IMAGE) },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absUrl(`/blog/${post.slug}`),
    },
  };
}

export function toolSchema(input: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: input.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: absUrl(input.path),
    description: input.description,
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absUrl(it.path),
    })),
  };
}
