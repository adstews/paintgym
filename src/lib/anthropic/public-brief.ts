import { z } from "zod";
import { BRIEF_MODEL, getAnthropicClient } from "./client";

// A self-contained brief generator for the public /tools/brief-preview demo. It
// takes three plain inputs (no full Project) and writes one Bold Claim brief,
// following the same creative rules as the in-app brief writer.

const schema = z.object({
  brief_text: z.string().min(20),
  summary: z.string().min(3),
  key_points: z.array(z.string().min(1)).min(1),
});

export interface PublicBriefInput {
  productName: string;
  whatItDoes: string;
  keyBenefit: string;
}

export interface PublicBrief {
  brief_text: string;
  summary: string;
  key_points: string[];
}

const SYSTEM = `You are a senior creative director who writes image-generation briefs for paid social ads. Your brief is fed directly to an image model that renders a single 4:5 (1080x1350) static ad. The brief must be one vivid, self-contained paragraph the model can render verbatim.

You are writing for the "Bold Claim" concept: an oversized typographic claim that dominates the canvas, with the product shown small and confident in a lower corner.

Make the brief concrete and renderable:
- Lead with one bold, oversized claim derived from the product's key benefit. Say where the type and the product sit in the 4:5 frame.
- Specify composition, background, lighting, and a punchy color palette.
- Write every piece of on-image copy verbatim in "double quotes" so the model renders it exactly. Keep it short.
- Specify a modern condensed sans-serif typeface and the 4:5 framing.

Rules:
- Use only the product details provided. Do not invent product names, prices, features, claims, or testimonials.
- Never mention a price, cost, "$", or discount (no price was provided).
- Never use em dashes. Never use exclamation marks. No AI cliches (unleash, elevate, revolutionize, game-changer, journey).
- Do not address the reader or explain your choices in the brief.

Output format:
- Respond with a single JSON object and nothing else. No prose, no markdown fence.
- Shape: {"brief_text": "...", "summary": "...", "key_points": ["...", "...", "..."]}
- "brief_text" is the full image-generation brief described above.
- "summary" is one short sentence (max ~15 words) describing the ad at a glance.
- "key_points" is exactly three short phrases naming the most important creative decisions.`;

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

export async function generatePublicBoldClaimBrief(
  input: PublicBriefInput,
): Promise<PublicBrief> {
  const client = getAnthropicClient();
  const user = `## Product
Name: ${input.productName}
What it does: ${input.whatItDoes}
Key benefit: ${input.keyBenefit}

## Concept for this ad
Bold Claim: an oversized typographic claim that dominates the canvas.

## Your task
Write one image-generation brief for this concept. Return only the JSON object.`;

  const response = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 1200,
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
  });

  const parts: string[] = [];
  for (const b of response.content) {
    if (b.type === "text") parts.push(b.text);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(parts.join("")));
  } catch {
    throw new Error("Brief response was not valid JSON");
  }
  const validated = schema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("Brief response did not match the expected schema");
  }
  return {
    brief_text: validated.data.brief_text,
    summary: validated.data.summary,
    key_points: validated.data.key_points.slice(0, 3),
  };
}
