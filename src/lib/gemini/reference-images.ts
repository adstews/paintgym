// Loads the project's PRIMARY product image as inline data so it can be:
//  (1) attached to the Gemini image-generation call as the exact reference, and
//  (2) shown to Claude when it writes the brief (so the brief matches reality).
// One clean reference beats several scraped images — multiple conflicting refs
// make the model blend/swap products, which is the "wrong product" bug.

export interface InlineImage {
  mimeType: string;
  data: string;
}

// Both Gemini and Anthropic accept these as vision input; svg is not supported.
const SUPPORTED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

async function urlToInline(url: string): Promise<InlineImage | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") || "image/png")
      .split(";")[0]
      .trim();
    if (!SUPPORTED_MIME.has(contentType)) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) return null;
    return { mimeType: contentType, data: buffer.toString("base64") };
  } catch {
    return null;
  }
}

/** The single primary product image (first in the list) as inline data, or null. */
export async function loadPrimaryProductImage(
  productImageUrls: string[] | null | undefined,
): Promise<InlineImage | null> {
  const url = (productImageUrls ?? []).find((u) => typeof u === "string" && u.length > 0);
  return url ? urlToInline(url) : null;
}

/**
 * Reference images for an image generation: just the one clean primary product
 * shot. A single faithful reference beats several conflicting scraped images.
 */
export async function collectReferenceImages(
  productImageUrls: string[] | null | undefined,
): Promise<InlineImage[]> {
  const primary = await loadPrimaryProductImage(productImageUrls);
  return primary ? [primary] : [];
}
