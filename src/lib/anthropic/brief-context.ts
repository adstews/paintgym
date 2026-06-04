import { CONCRETE_AGGRESSIVENESS, platformDimensions } from "../types";
import type {
  Aggressiveness,
  ConcreteAggressiveness,
  Concept,
  Platform,
  Project,
  StyleSettings,
  Tone,
  VisualStyle,
} from "../types";

export const AGGRESSIVENESS_GUIDANCE: Record<ConcreteAggressiveness, string> = {
  less: "Soft, brand-building, aspirational. Lean on mood, lifestyle and meaning. Avoid pressure tactics, urgency, or hard sells. The ad should feel like a beautifully art-directed piece of editorial content first, a product ad second. Copy is short, evocative, and confident without shouting.",
  average:
    "Balanced direct response. Lead with the clearest, most concrete benefit. Use plain, confident product language. Include a single calm call to action. No urgency tactics, no scarcity hints. Feels premium, thoughtful, and credible.",
  maximum:
    "Full direct response, performance-first. Aggressive hooks, bold claims grounded in real product truth, scarcity and urgency where honest, and a hard call to action. Copy is short, punchy, and benefit forward. The visual still has to be on brand and credible; the energy is aggressive, not tacky.",
};

// Resolve a stored aggressiveness setting to a concrete level. "mix" picks a
// random level (so a 35-brief batch lands ~1/3 in each); the retired "more"
// level maps to "maximum".
export function resolveAggressiveness(
  level: Aggressiveness | string,
): ConcreteAggressiveness {
  if (level === "mix") {
    return CONCRETE_AGGRESSIVENESS[
      Math.floor(Math.random() * CONCRETE_AGGRESSIVENESS.length)
    ];
  }
  if (level === "more") return "maximum";
  if (level === "less" || level === "average" || level === "maximum") {
    return level;
  }
  return "average";
}

export const TONE_GUIDANCE: Record<Tone, string> = {
  professional:
    "Polished, considered, third-person friendly. No slang. Word choice is precise. Treat the reader as an adult with options.",
  casual:
    "Warm and conversational, like a recommendation from a knowledgeable friend. Contractions are fine. Plain language, no marketing fluff.",
  edgy: "Sharp, direct, a little defiant. Confident enough to challenge the category. Pithy, dry, sometimes deadpan. Always intentional; never crass.",
  playful:
    "Light, witty, a bit irreverent. Wordplay and small visual gags allowed when they support the product truth. Never sarcastic at the audience's expense.",
};

export const VISUAL_GUIDANCE: Record<VisualStyle, string> = {
  clean:
    "Clean and minimal: generous whitespace, editorial typography, calm neutral or single-color backgrounds, soft natural light, product hero with no clutter. Premium DTC feel.",
  bold: "Bold and dramatic: high contrast, saturated color blocking, oversized type, decisive shadow, strong directional lighting. The ad should stop the scroll cold.",
  organic:
    "Organic and lifestyle: real-world context, natural materials, soft daylight, in-use shots, human hands and casual environments. Feels lived in, not staged.",
};

export const PLATFORM_GUIDANCE: Record<Platform, string> = {
  meta: "Designed for the Meta feed (Facebook and Instagram). Composition reads at thumbnail scale. Hero element occupies the center 60% of the canvas.",
};

function platformGuidance(platform: Platform | string): string {
  return PLATFORM_GUIDANCE[platform as Platform] ?? PLATFORM_GUIDANCE.meta;
}

function lineIfPresent(label: string, value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return `${label}: ${trimmed}`;
}

export function buildProductContext(project: Project): string {
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

  if (project.brand_colors && project.brand_colors.length > 0) {
    const swatches = project.brand_colors
      .map((c) => `${c.label}: ${c.hex}`)
      .join(", ");
    lines.push(`Brand colors: ${swatches}. Reference these by hex in the brief; use the primary color as the dominant accent unless the concept calls for a different lead.`);
  }
  if (project.brand_fonts && project.brand_fonts.length > 0) {
    const fonts = project.brand_fonts
      .map((f) => `${f.role}: ${f.family}`)
      .join(", ");
    lines.push(`Brand fonts: ${fonts}. Name the typeface or describe a faithful match so the rendered type stays on brand.`);
  }
  if (project.brand_voice) {
    const voice = project.brand_voice.trim();
    if (voice) lines.push(`Brand voice: ${voice}. Any on-image copy you write must sound like this.`);
  }

  if (lines.length === 0) {
    lines.push(`Brand or product name: ${project.name}`);
  }

  return lines.join("\n");
}

export function buildStyleSection(settings: StyleSettings): string {
  const dims = platformDimensions(settings.platform);
  // Resolve "mix"/legacy levels to a concrete one (random per call for "mix",
  // which gives a batch its ~1/3 spread across concepts).
  const agg = resolveAggressiveness(settings.aggressiveness);
  return `Aggressiveness (${agg}): ${AGGRESSIVENESS_GUIDANCE[agg]}
Tone (${settings.tone}): ${TONE_GUIDANCE[settings.tone]}
Visual style (${settings.visual_style}): ${VISUAL_GUIDANCE[settings.visual_style]}
Platform (meta): ${platformGuidance(settings.platform)} Output dimensions ${dims.width} by ${dims.height} pixels, aspect ratio ${dims.aspect}.`;
}

export function buildConceptSection(concept: Concept): string {
  return `Name: ${concept.name}
Description: ${concept.description}
Reference framing: ${concept.prompt_template}`;
}
