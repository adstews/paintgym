import sharp from "sharp";
import { z } from "zod";
import { BRIEF_MODEL, getAnthropicClient } from "./client";

export type QaSeverity = "minor" | "major";
export type Severity = QaSeverity | "none";

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

type AnthropicImageMediaType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

export const reviewSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.string()).default([]),
  severity: z.enum(["none", "minor", "major"]),
});

export type ReviewResult = z.infer<typeof reviewSchema>;

interface ParsedImage {
  mediaType: AnthropicImageMediaType;
  data: string;
}

function parseDataUrl(dataUrl: string): ParsedImage {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Image is not a base64 data URL");
  }
  const mediaType = match[1].toLowerCase();
  if (!SUPPORTED_IMAGE_TYPES.has(mediaType)) {
    throw new Error(`Unsupported image type for review: ${mediaType}`);
  }
  return { mediaType: mediaType as AnthropicImageMediaType, data: match[2] };
}

function extractText(blocks: Array<{ type: string; text?: string }>): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === "text" && typeof block.text === "string") {
      parts.push(block.text);
    }
  }
  return parts.join("");
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

const REVIEW_SYSTEM = `You are a strict QA reviewer for static paid social ad images. You inspect a generated ad and compare it against the brief that produced it, and — when provided — against the EXACT product reference image. You are pedantic and skeptical.

You enforce the Hard Rules below. ANY single Hard Rule failure is a "major" severity issue and triggers an automatic redo. There are no exceptions, no "close enough", no benefit of the doubt. Hard Rule failures cannot be downgraded to "minor". Rule 0 (product fidelity) is the MOST IMPORTANT rule and must be checked first.

## Hard Rules

Rule 0 - Product fidelity (HIGHEST PRIORITY). When a product reference image is provided (it will be attached and explicitly labeled as the exact product), the product shown in the generated ad MUST be that exact product. Compare them side by side: same container/bottle/package shape, same cap or lid, same label layout, the same text printed on the product spelled identically, the same colors, the same proportions. It is a Rule 0 failure if the rendered product has a different shape, a redrawn or invented label, wrong/garbled/missing on-product text, different colors, restyled packaging, or is simply a different product than the reference. Do NOT give the benefit of the doubt — if you are not confident the rendered product matches the reference, it fails. A Rule 0 failure is always "major". Never pass an ad whose product does not match the provided reference. (If no product reference image is provided, Rule 0 is not applicable and passes by default.)

Rule 1 - Text spelling. Every word visible in the image must be spelled correctly. Check every word: headlines, body copy, badges, small print, brand names, product names. Any misspelling, garbled letter, fake glyph, half-formed character, or invented word is a Rule 1 failure.

Rule 2 - Text edge spacing. All text must have visible breathing room from every edge of the image. No text may touch, overlap, or sit within roughly 5 percent of the image boundary on any side. Text that is cut off, clipped, or cramped against an edge is a Rule 2 failure. This applies to ALL text: headlines, body copy, badges, labels, captions, watermarks.

Rule 3 - Product sizing accuracy. The advertised product must be proportionally sized relative to other objects in the scene. A 5-inch hot sauce bottle should not be the size of a person, and should not be tiny like a thimble next to food. Products shown alongside hands, plates, people, or other reference objects must be realistically scaled to real-world proportions. Obvious size distortion is a Rule 3 failure.

Rule 4 - Before/After logic. In any comparison concept (Before & After, Old vs New, Us vs Them, comparison chart, split-screen): the two sides must show meaningfully different things. The advertised product must appear ONLY on the favorable side (the "after", the "new", the "us", the winning column). The unfavorable side must show an inferior alternative, an absence, a generic stand-in, or a problem state, NOT the same advertised product. If the advertised product (same brand, same SKU, same packaging) appears on both sides of a comparison, that is a Rule 4 failure.

Rule 5 - Concept-prompt alignment. The image must actually be the concept the brief asked for. If the brief asked for a Notes app screenshot, the image must look like a Notes app, not a generic ad with a notes-like vibe. If the brief asked for a split-screen, there must be a visible split. If the brief asked for a meme template, the image must follow that meme structure. If the brief asked for a press feature, the image must read as editorial. A concept the viewer cannot identify at a glance is a Rule 5 failure.

Rule 6 - Brand name accuracy. The brand name and product name, when rendered as text in the image, must match exactly what the brief specifies. No invented brand names, no misspelled brand names, no generic substitutions (writing "Hot Sauce" when the brief gave a specific brand), no shortening or modifying the brand name. Any mismatch between the rendered brand or product name and the brief is a Rule 6 failure.

Rule 7 - Duplicate elements. The image must not contain unintended duplicate or repeated elements. Examples: two identical product bottles when the brief asked for one, the same text block printed twice, the same testimonial card repeated, the same icon mirrored unnecessarily. Repetition that the brief did not ask for is a Rule 7 failure. Intentional repetition the brief explicitly required (for example, three identical icons in a benefit row) is fine.

Rule 8 - Readable text size. Every piece of text in the image must be large enough to read on a phone screen at typical feed scroll size. Microscopic legal-style text, sub-pixel captions, or text rendered so small it becomes a smudge is a Rule 8 failure. If text is so dense it cannot be made readable at feed scale, that is also a Rule 8 failure.

Rule 9 - Color and contrast legibility. Text must have sufficient contrast against the background it sits on. White or light text on light backgrounds, black or dark text on dark backgrounds, or low-contrast text over a busy photo are all Rule 9 failures. This is especially strict for overlay text on product photography.

Rule 10 - Face and hand distortion. If the image contains a human face or hand, it must look natural. Extra or missing fingers, fused fingers, warped knuckles, melted facial features, asymmetric eyes, uncanny-valley skin, garbled teeth, or any obvious anatomical artifact is a Rule 10 failure.

Rule 11 - Logo accuracy. If the brand has a reference logo provided (you will see it as a separate attached image, after the generated ad), the logo rendered inside the generated ad must match the reference: same shape and silhouette, same characters and word marks spelled identically, same color treatment, no distortion, no stretching, no skew, no cropping that loses part of the mark, no invented variants. If no logo appears in the generated ad, Rule 11 is not applicable and passes by default. If a logo appears but no reference was provided, treat any made-up or generic logo with text different from the brand name as a Rule 11 failure (lean on Rule 6 too where the rendered text disagrees with the brand). When a reference is provided, compare side by side: a rendered logo with different letters, missing letters, garbled letters, wrong colors, the wrong icon, or a redrawn version that is "close but not the real mark" is a Rule 11 failure.

## How to grade

Walk every Hard Rule in order. For each rule, decide pass or fail based on what you actually see in the image. When you write issue strings, prefix each one with the rule number it violates so the rewrite agent can react to it.

Severity is determined by what you find:
- ANY Hard Rule failure: severity is "major" and "passed" is false. Even one violation. Never downgrade a Hard Rule failure to "minor".
- A real but borderline imperfection that does not violate any Hard Rule (mild composition awkwardness, slightly off color mood, harmless extra texture): severity is "minor".
- No Hard Rule failures and no notable imperfections: severity is "none" and "passed" is true.

Output rules:
- Respond with a single JSON object and nothing else. No prose, no markdown fence, no preamble.
- Shape: {"passed": boolean, "issues": string[], "severity": "none" | "minor" | "major"}
- "passed" is true ONLY when severity is "none".
- "issues" is a list of short, concrete strings. One issue per string. Empty array when passed.
- Prefix every issue string with the rule number for Hard Rule failures, like "Rule 1: the headline reads 'Hidraton' instead of 'Hydration'" or "Rule 4: the same advertised bottle appears on both the Before and After panels".
- Be specific about the failure (quote misspelled text verbatim, describe the duplicated element, name the side the product wrongly appears on). Vague phrasing like "text issues" is not acceptable.`;

function buildReviewUserText(
  briefText: string,
  hasProductReference: boolean,
  hasLogoReference: boolean,
): string {
  // Describe the attached images in the exact order they were pushed:
  // [generated ad, (product reference?), (logo?)].
  const order: string[] = ["the generated ad to review"];
  if (hasProductReference) order.push("the EXACT product the ad must feature (the product reference)");
  if (hasLogoReference) order.push("the brand's reference logo");
  const imagesLine =
    order.length === 1
      ? "The attached image is the generated ad to review."
      : `Attached images, in order: ${order
          .map((d, i) => `(${i + 1}) ${d}`)
          .join("; ")}.`;

  const productLine = hasProductReference
    ? `\nFor Rule 0 (highest priority), compare the product rendered inside the generated ad against the product reference image. They must be the SAME product — identical shape, cap, label, on-product text, colors, and proportions. If it does not match, that is a Rule 0 failure (major).\n`
    : "";
  const logoLine = hasLogoReference
    ? `\nFor Rule 11, compare the logo as rendered inside the generated ad against the reference logo. Check for distortion, wrong text, wrong colors, wrong icon, stretching, or any "close but not the real mark" rendering. If no logo appears in the generated ad at all, Rule 11 passes.\n`
    : "";
  return `${imagesLine}

Brief that produced this image:
"""
${briefText.trim()}
"""
${productLine}${logoLine}
Review the generated ad against the brief, the product reference, and the Hard Rules. Return the JSON object now.`;
}

type ImageSource =
  | { type: "base64"; media_type: AnthropicImageMediaType; data: string }
  | { type: "url"; url: string };

// Anthropic's vision API rejects images whose decoded size is over ~5MB. The QA
// pipeline is model-agnostic, but the two generators are not equally sized:
// gpt-image-1 emits high-res PNGs that routinely run several MB, while Gemini's
// output tends to be smaller. So an oversized OpenAI image makes the review call
// throw where the comparable Gemini image sails through — which surfaces as QA
// "failing" only on GPT images. Re-encode anything near the limit down to a
// review-friendly JPEG (1568px is Anthropic's own internal resize target, so we
// lose no review fidelity) so QA works the same for every model. Best-effort: if
// the re-encode fails for any reason we fall back to the original bytes.
const MAX_REVIEW_IMAGE_BYTES = 4_500_000;

async function compressIfOversized(
  media_type: AnthropicImageMediaType,
  data: string,
): Promise<{ media_type: AnthropicImageMediaType; data: string }> {
  const buf = Buffer.from(data, "base64");
  if (buf.length <= MAX_REVIEW_IMAGE_BYTES) return { media_type, data };
  try {
    const out = await sharp(buf)
      .rotate()
      .resize({ width: 1568, height: 1568, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    return { media_type: "image/jpeg", data: out.toString("base64") };
  } catch {
    return { media_type, data };
  }
}

async function buildImageSource(input: string): Promise<ImageSource> {
  if (input.startsWith("data:")) {
    const { mediaType, data } = parseDataUrl(input);
    const safe = await compressIfOversized(mediaType, data);
    return { type: "base64", media_type: safe.media_type, data: safe.data };
  }
  return { type: "url", url: input };
}

export interface ReviewImageOptions {
  imageDataUrl: string;
  briefText: string;
  // The exact product image the ad must reproduce (Rule 0). Can be a data URL
  // or a public https URL (e.g. Supabase storage).
  productReferenceUrl?: string | null;
  logoReferenceUrl?: string | null;
}

export async function reviewImage({
  imageDataUrl,
  briefText,
  productReferenceUrl,
  logoReferenceUrl,
}: ReviewImageOptions): Promise<ReviewResult> {
  const generatedSource = await buildImageSource(imageDataUrl);
  const client = getAnthropicClient();

  // Order matters and is described to the model in buildReviewUserText:
  // [generated ad, (product reference?), (logo?)].
  const content: Array<
    | { type: "image"; source: ImageSource }
    | { type: "text"; text: string }
  > = [{ type: "image", source: generatedSource }];

  let hasProductReference = false;
  if (productReferenceUrl) {
    try {
      const productSource = await buildImageSource(productReferenceUrl);
      content.push({ type: "image", source: productSource });
      hasProductReference = true;
    } catch {
      // Couldn't load the product reference — skip Rule 0 rather than failing
      // the whole review (generation-side logging flags missing references).
    }
  }

  let hasLogoReference = false;
  if (logoReferenceUrl) {
    try {
      const logoSource = await buildImageSource(logoReferenceUrl);
      content.push({ type: "image", source: logoSource });
      hasLogoReference = true;
    } catch {
      // Bad data URL or unsupported logo image type: skip Rule 11 reference
      // rather than failing the whole review.
    }
  }
  content.push({
    type: "text",
    text: buildReviewUserText(briefText, hasProductReference, hasLogoReference),
  });

  const response = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 1024,
    system: REVIEW_SYSTEM,
    messages: [{ role: "user", content }],
  });

  const text = extractText(response.content);
  const candidate = extractJsonObject(text);
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(candidate);
  } catch {
    throw new Error("QA review did not return valid JSON");
  }
  const validated = reviewSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new Error("QA review did not match the expected schema");
  }

  // Defensive normalization: if model says passed=true with issues, trust severity.
  const result = validated.data;
  if (result.severity === "none") {
    return { passed: true, issues: [], severity: "none" };
  }
  return {
    passed: false,
    issues: result.issues.length > 0 ? result.issues : ["Unspecified issue"],
    severity: result.severity,
  };
}
