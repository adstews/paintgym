// Loads project product/logo images (public bucket URLs) into inline image
// data so they can be attached to Gemini generateContent calls as the exact
// visual reference for the product. Without this the model invents a product.

export interface InlineImage {
  mimeType: string;
  data: string;
}

const MAX_PRODUCT_REFS = 3;

async function urlToInline(url: string): Promise<InlineImage | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) return null;
    return { mimeType: contentType, data: buffer.toString("base64") };
  } catch {
    return null;
  }
}

/**
 * Fetches a project's product images (first few) and logo as inline reference
 * images. Failed/unreachable URLs are skipped silently so a bad reference never
 * breaks a generation.
 */
export async function collectReferenceImages(
  productImageUrls: string[] | null | undefined,
  logoUrl: string | null | undefined,
): Promise<InlineImage[]> {
  const urls: string[] = [];
  for (const url of (productImageUrls ?? []).slice(0, MAX_PRODUCT_REFS)) {
    if (url) urls.push(url);
  }
  if (logoUrl) urls.push(logoUrl);

  const settled = await Promise.all(urls.map(urlToInline));
  return settled.filter((img): img is InlineImage => img !== null);
}
