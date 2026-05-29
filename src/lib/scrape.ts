import type { ProductData } from "./types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.6 Safari/605.1.15";

function pickMeta(html: string, names: string[]): string | undefined {
  for (const n of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*?content=["']([^"']+)["']`,
      "i",
    );
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1]).trim();
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*?(?:property|name)=["']${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
      "i",
    );
    const m2 = html.match(re2);
    if (m2?.[1]) return decodeEntities(m2[1]).trim();
  }
  return undefined;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function extractTitle(html: string): string | undefined {
  const og = pickMeta(html, ["og:title", "twitter:title"]);
  if (og) return og;
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1] ? decodeEntities(m[1]).trim() : undefined;
}

function extractDescription(html: string): string | undefined {
  return pickMeta(html, [
    "og:description",
    "twitter:description",
    "description",
  ]);
}

function extractPrice(html: string): string | undefined {
  const meta = pickMeta(html, [
    "product:price:amount",
    "og:price:amount",
    "twitter:data1",
  ]);
  if (meta) return meta;
  const m = html.match(
    /["'](?:price|product_price)["']\s*:\s*["']?([\d.,]+)["']?/i,
  );
  if (m?.[1]) return m[1];
  const visible = html.match(/(?:\$|USD\s*)(\d{1,4}(?:[.,]\d{2})?)/);
  return visible?.[1] ? `$${visible[1]}` : undefined;
}

function extractImage(html: string, baseUrl: string): string | undefined {
  const og = pickMeta(html, ["og:image", "twitter:image"]);
  if (og) return resolveUrl(og, baseUrl);
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ? resolveUrl(m[1], baseUrl) : undefined;
}

function resolveUrl(src: string, base: string): string {
  try {
    return new URL(src, base).toString();
  } catch {
    return src;
  }
}

function extractJsonLdProduct(html: string): Partial<ProductData> {
  const blocks = [
    ...html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  for (const b of blocks) {
    try {
      const json = JSON.parse(b[1].trim());
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        const node = unwrapGraph(item, "Product");
        if (node) {
          const out: Partial<ProductData> = {};
          if (typeof node.name === "string") out.name = node.name;
          if (typeof node.description === "string")
            out.description = node.description;
          const offers = node.offers as
            | { price?: unknown }
            | { price?: unknown }[]
            | undefined;
          if (offers) {
            const price = Array.isArray(offers)
              ? offers[0]?.price
              : offers.price;
            if (price) out.price = String(price);
          }
          if (Array.isArray(node.image)) out.images = node.image as string[];
          else if (typeof node.image === "string") out.images = [node.image];
          return out;
        }
      }
    } catch {
      // ignore invalid JSON-LD blocks
    }
  }
  return {};
}

type LdNode = Record<string, unknown>;
function unwrapGraph(item: unknown, type: string): LdNode | null {
  if (!item || typeof item !== "object") return null;
  const obj = item as LdNode;
  const t = obj["@type"];
  if (t === type || (Array.isArray(t) && t.includes(type))) return obj;
  const graph = obj["@graph"];
  if (Array.isArray(graph)) {
    for (const g of graph) {
      const found = unwrapGraph(g, type);
      if (found) return found;
    }
  }
  return null;
}

export async function scrapeProduct(url: string): Promise<ProductData> {
  const res = await fetch(url, {
    headers: {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const html = await res.text();

  const fromLd = extractJsonLdProduct(html);
  const name = fromLd.name ?? extractTitle(html);
  const description = fromLd.description
    ? stripTags(fromLd.description)
    : extractDescription(html);
  const price = fromLd.price ?? extractPrice(html);
  const image = extractImage(html, url);
  const images = [
    ...(fromLd.images?.map((s) => resolveUrl(s, url)) ?? []),
    ...(image ? [image] : []),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const featureMatches = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((m) => stripTags(m[1]))
    .filter((s) => s.length > 4 && s.length < 200);
  const features = featureMatches.slice(0, 8);

  return {
    name,
    description,
    price,
    images,
    features,
    url,
  };
}
