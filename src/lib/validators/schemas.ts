import { z } from "zod";

export const styleSettingsSchema = z.object({
  // Accept the legacy "more" level and normalize it to "maximum" so saving an
  // older project never fails validation.
  aggressiveness: z
    .enum(["less", "average", "maximum", "mix", "more"])
    .transform((v) => (v === "more" ? "maximum" : v)),
  tone: z.enum(["professional", "casual", "edgy", "playful"]),
  visual_style: z.enum(["clean", "bold", "organic"]),
  // Only Meta now; tolerate legacy values from older rows and coerce to meta.
  platform: z
    .enum(["meta", "tiktok", "linkedin"])
    .optional()
    .transform(() => "meta" as const),
  image_model: z
    .enum(["gemini", "openai", "alternating", "both"])
    .optional()
    .default("gemini"),
});

export const brandColorSchema = z.object({
  label: z.string().min(1).max(40),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const brandFontSchema = z.object({
  role: z.string().min(1).max(40),
  family: z.string().min(1).max(120),
});

const conceptVariantEnum = z.enum(["A", "B", "C"]);

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(120),
  client_name: z.string().max(120).optional().nullable(),
  product_url: z.string().url().optional().nullable().or(z.literal("")),
});

export const projectPatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  client_name: z.string().max(120).optional().nullable(),
  product_url: z.string().url().optional().nullable().or(z.literal("")),
  logo_url: z.string().optional().nullable(),
  brand_name: z.string().max(160).optional().nullable(),
  product_name: z.string().max(160).optional().nullable(),
  product_description: z.string().max(4000).optional().nullable(),
  key_selling_points: z.string().max(4000).optional().nullable(),
  target_audience: z.string().max(1000).optional().nullable(),
  price_point: z.string().max(200).optional().nullable(),
  proof_points: z.string().max(4000).optional().nullable(),
  compliance_rules: z.string().max(4000).optional().nullable(),
  style_settings: styleSettingsSchema.optional(),
  product_data: z
    .object({
      name: z.string().optional(),
      price: z.string().optional(),
      description: z.string().optional(),
      features: z.array(z.string()).optional(),
      ingredients: z.array(z.string()).optional(),
      images: z.array(z.string()).optional(),
      url: z.string().optional(),
    })
    .optional()
    .nullable(),
  brand_colors: z.array(brandColorSchema).max(10).optional(),
  brand_fonts: z.array(brandFontSchema).max(10).optional(),
  brand_voice: z.string().max(2000).optional().nullable(),
});

export const conceptUpsertSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  prompt_template: z.string().min(1).max(8000),
  sort_order: z.number().int().min(0).max(9999).optional(),
});

export const scrapeRequestSchema = z.object({
  url: z.string().url(),
  project_id: z.string().uuid().optional(),
});

export const prefillRequestSchema = z.object({
  url: z.string().url(),
});

const variantLabelEnum = z.enum([
  "faithful",
  "simplified",
  "bold",
  "alt_palette",
  "platform_adapted",
]);

export const generateRequestSchema = z
  .object({
    project_id: z.string().uuid(),
    concept_id: z.string().uuid().optional(),
    concept_variant: conceptVariantEnum.optional(),
    recreation_id: z.string().uuid().optional(),
    variant_label: variantLabelEnum.optional(),
    prompt_text: z.string().min(1).max(20000),
    reference_image_urls: z.array(z.string()).optional(),
  })
  .refine(
    (v) =>
      (v.concept_id && !v.recreation_id && !v.variant_label) ||
      (!v.concept_id && v.recreation_id && v.variant_label),
    {
      message:
        "Provide either concept_id, or recreation_id together with variant_label",
    },
  );

export const recreateRequestSchema = z.object({
  project_id: z.string().uuid(),
  source_image_url: z.string().url(),
});

export const stripeCheckoutSchema = z.object({
  pack: z.enum(["starter", "full_project", "pro", "agency"]),
});

export const generateBriefsSchema = z.object({
  project_id: z.string().uuid(),
  concept_ids: z.array(z.string().uuid()).min(1).max(50),
  // Which model these briefs are for. "openai" writes a fresh, deliberately
  // different set (contrasted against the existing Gemini briefs).
  model_target: z.enum(["gemini", "openai"]).optional().default("gemini"),
  // Optional proven hook the user picked; the brief opens with it.
  hook_id: z.string().uuid().optional().nullable(),
});

export const briefPatchSchema = z.object({
  brief_text: z.string().min(1).max(20000),
});

export const briefRegenerateSchema = z.object({
  project_id: z.string().uuid(),
  concept_id: z.string().uuid(),
});

export const reviewImageSchema = z.object({
  generation_id: z.string().uuid(),
});

export const enqueueImagesSchema = z.object({
  project_id: z.string().uuid(),
  // When set, every item renders with this model regardless of the project's
  // image_model preference (the "Generate via GPT" button forces "openai").
  model: z.enum(["gemini", "openai"]).optional(),
  items: z
    .array(
      z.object({
        concept_id: z.string().uuid(),
        concept_variant: conceptVariantEnum.default("A"),
      }),
    )
    .min(1)
    .max(200),
});

export const processQueueSchema = z.object({
  project_id: z.string().uuid(),
});

export const cancelQueueSchema = z.object({
  project_id: z.string().uuid(),
});

export const generationsByIdsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
});

export const ratingPatchSchema = z
  .object({
    rating: z.number().int().min(1).max(5).nullable().optional(),
    is_favorited: z.boolean().optional(),
    used_in_ad: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.rating !== undefined ||
      v.is_favorited !== undefined ||
      v.used_in_ad !== undefined,
    { message: "Provide at least one of rating, is_favorited, used_in_ad" },
  );

export const refineRequestSchema = z.object({
  generation_id: z.string().uuid(),
  user_feedback: z.string().min(3).max(2000),
});

// Regenerate an existing image with different creative settings: rewrite the
// brief with the new aggressiveness/tone, then render a fresh image.
export const regenerateSettingsSchema = z.object({
  generation_id: z.string().uuid(),
  aggressiveness: z.enum(["less", "average", "maximum"]),
  tone: z.enum(["professional", "casual", "edgy", "playful"]),
});

export const competitorSpySchema = z.object({
  project_id: z.string().uuid(),
  competitor_url: z.string().url(),
  concept_ids: z.array(z.string().uuid()).min(1).max(20),
});

export const adminConceptCreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  prompt_template: z.string().min(1).max(8000),
  sort_order: z.number().int().min(0).max(99999).default(0),
  active: z.boolean().default(true),
});

export const adminConceptPatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().min(1).max(2000).optional(),
  prompt_template: z.string().min(1).max(8000).optional(),
  sort_order: z.number().int().min(0).max(99999).optional(),
  active: z.boolean().optional(),
});

export const authEmailSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectPatchInput = z.infer<typeof projectPatchSchema>;
export type ConceptUpsertInput = z.infer<typeof conceptUpsertSchema>;
export type ScrapeRequestInput = z.infer<typeof scrapeRequestSchema>;
export type GenerateRequestInput = z.infer<typeof generateRequestSchema>;
export type GenerateBriefsInput = z.infer<typeof generateBriefsSchema>;
export type BriefPatchInput = z.infer<typeof briefPatchSchema>;
