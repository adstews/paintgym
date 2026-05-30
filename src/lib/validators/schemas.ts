import { z } from "zod";

export const styleSettingsSchema = z.object({
  aggressiveness: z.enum(["less", "average", "more", "maximum"]),
  tone: z.enum(["professional", "casual", "edgy", "playful"]),
  visual_style: z.enum(["clean", "bold", "organic"]),
  platform: z.enum(["meta", "tiktok", "linkedin"]),
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
