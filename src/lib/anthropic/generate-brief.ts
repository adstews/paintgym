import { BRIEF_MODEL, getAnthropicClient } from "./client";
import { PLATFORM_DIMENSIONS } from "../types";
import type {
  Aggressiveness,
  Concept,
  Platform,
  Project,
  StyleSettings,
  Tone,
  VisualStyle,
} from "../types";

const AGGRESSIVENESS_GUIDANCE: Record<Aggressiveness, string> = {
  less: "Soft, brand-building, aspirational. Lean on mood, lifestyle and meaning. Avoid pressure tactics, urgency, or hard sells. The ad should feel like a beautifully art-directed piece of editorial content first, a product ad second. Copy is short, evocative, and confident without shouting.",
  average:
    "Balanced direct response. Lead with the clearest, most concrete benefit. Use plain, confident product language. Include a single calm call to action. No urgency tactics, no scarcity hints. Feels premium, thoughtful, and credible.",
  more: "Hard-hitting direct response. Lead with a sharp hook the target audience will recognize as their own problem. Use strong, specific value props, light urgency cues such as time bound deals or limited availability, and a confident call to action. Still tasteful; no fake countdowns, no fake reviews.",
  maximum:
    "Full direct response, performance-first. Aggressive hooks, bold claims grounded in real product truth, scarcity and urgency where honest, and a hard call to action. Copy is short, punchy, and benefit forward. The visual still has to be on brand and credible; the energy is aggressive, not tacky.",
};

const TONE_GUIDANCE: Record<Tone, string> = {
  professional:
    "Polished, considered, third-person friendly. No slang. Word choice is precise. Treat the reader as an adult with options.",
  casual:
    "Warm and conversational, like a recommendation from a knowledgeable friend. Contractions are fine. Plain language, no marketing fluff.",
  edgy: "Sharp, direct, a little defiant. Confident enough to challenge the category. Pithy, dry, sometimes deadpan. Always intentional; never crass.",
  playful:
    "Light, witty, a bit irreverent. Wordplay and small visual gags allowed when they support the product truth. Never sarcastic at the audience's expense.",
};

const VISUAL_GUIDANCE: Record<VisualStyle, string> = {
  clean:
    "Clean and minimal: generous whitespace, editorial typography, calm neutral or single-color backgrounds, soft natural light, product hero with no clutter. Premium DTC feel.",
  bold: "Bold and dramatic: high contrast, saturated color blocking, oversized type, decisive shadow, strong directional lighting. The ad should stop the scroll cold.",
  organic:
    "Organic and lifestyle: real-world context, natural materials, soft daylight, in-use shots, human hands and casual environments. Feels lived in, not staged.",
};

const PLATFORM_GUIDANCE: Record<Platform, string> = {
  meta: "Designed for the Meta feed (Facebook and Instagram). Composition reads at thumbnail scale. Hero element occupies the center 60% of the canvas.",
  tiktok:
    "Designed for TikTok and Instagram Reels. Vertical composition with the focal point in the upper two-thirds so it stays visible above any UI overlay. Optimized for muted-by-default phone viewing.",
  linkedin:
    "Designed for the LinkedIn feed. Horizontal composition. Reads as credible and business-appropriate without losing visual interest. Avoid party or hangover-style imagery.",
};

function lineIfPresent(label: string, value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return `${label}: ${trimmed}`;
}

function buildProductContext(project: Project): string {
  const productData = project.product_data ?? {};
  const lines: string[] = [];

  const brand = project.brand_name ?? project.client_name;
  const productName = project.product_name ?? productData.name;
  const description = project.product_description ?? productData.description;
  const price = project.price_point ?? productData.price;

  const brandLine = lineIfPresent("Brand", brand);
  if (brandLine) lines.push(brandLine);

  const nameLine = lineIfPresent("Product or service", productName);
  if (nameLine) lines.push(nameLine);

  const descLine = lineIfPresent("What it does", description);
  if (descLine) lines.push(descLine);

  const kspLine = lineIfPresent("Key selling points", project.key_selling_points);
  if (kspLine) lines.push(kspLine);

  if (productData.features && productData.features.length > 0) {
    lines.push(`Additional product features: ${productData.features.join(", ")}`);
  }

  const audienceLine = lineIfPresent("Target audience", project.target_audience);
  if (audienceLine) lines.push(audienceLine);

  const priceLine = lineIfPresent("Price point", price);
  if (priceLine) lines.push(priceLine);

  const proofLine = lineIfPresent(
    "Proof points (awards, press, stats, testimonials)",
    project.proof_points,
  );
  if (proofLine) lines.push(proofLine);

  const heroImage = (productData.images ?? [])[0];
  if (heroImage) lines.push(`Hero product image reference: ${heroImage}`);
  if (project.logo_url) lines.push(`Logo reference: ${project.logo_url}`);

  if (lines.length === 0) {
    lines.push(`Brand or product name: ${project.name}`);
  }

  return lines.join("\n");
}

function buildSystemPrompt(): string {
  return `You are a senior creative director who writes image generation briefs for paid social ads. Your briefs feed directly into an image model (Gemini Nano Banana or similar). Each brief you write must be a single self-contained paragraph the image model can render without further context.

Rules that always apply:
- Use the exact product or brand details provided. Do not invent product names, prices, features, claims, or testimonials.
- The brief is for ONE static image. Describe the composition, subject, lighting, color palette, typography, on-image copy, and aspect ratio.
- On-image copy must be short and concrete: a headline, an optional sub-headline, and at most one call to action. Quote it verbatim in your brief, in double quotes, so the image model renders it exactly.
- Tailor the copy and visual direction to the aggressiveness level, tone, visual style, and platform you are given.
- Never use em dashes. Never use exclamation marks. Never use words like unleash, elevate, revolutionize, game-changer, journey, or other AI cliches. Prefer plain, specific language.
- Do not include disclaimers, options, or alternative directions. Commit to one ad.
- Do not address the human reader, do not explain your choices, do not include any preamble. Output only the brief paragraph itself.`;
}

function buildUserPrompt(
  project: Project,
  concept: Concept,
  settings: StyleSettings,
): string {
  const dims = PLATFORM_DIMENSIONS[settings.platform];
  return `## Product context
${buildProductContext(project)}

## Concept for this ad
Name: ${concept.name}
Description: ${concept.description}
Reference framing: ${concept.prompt_template}

## Style direction
Aggressiveness (${settings.aggressiveness}): ${AGGRESSIVENESS_GUIDANCE[settings.aggressiveness]}
Tone (${settings.tone}): ${TONE_GUIDANCE[settings.tone]}
Visual style (${settings.visual_style}): ${VISUAL_GUIDANCE[settings.visual_style]}
Platform (${settings.platform}): ${PLATFORM_GUIDANCE[settings.platform]} Output dimensions ${dims.width} by ${dims.height} pixels, aspect ratio ${dims.aspect}.

## Your task
Write the single-paragraph image generation brief for this one ad. Use the product context above as ground truth. Match the concept framing. Match the aggressiveness, tone, visual style, and platform. Render the brief now, with no preamble.`;
}

export interface GenerateBriefOptions {
  project: Project;
  concept: Concept;
}

export async function generateBriefForConcept({
  project,
  concept,
}: GenerateBriefOptions): Promise<string> {
  const client = getAnthropicClient();
  const settings = project.style_settings;

  const response = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 1600,
    system: buildSystemPrompt(),
    messages: [
      { role: "user", content: buildUserPrompt(project, concept, settings) },
    ],
  });

  const parts: string[] = [];
  for (const block of response.content) {
    if (block.type === "text") parts.push(block.text);
  }
  const text = parts.join("").trim();
  if (!text) throw new Error("Claude returned an empty brief");
  return text;
}
