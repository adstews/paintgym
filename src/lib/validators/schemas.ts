import { z } from "zod";

export const styleSettingsSchema = z.object({
  aggressiveness: z.enum(["less", "average", "more", "maximum"]),
  tone: z.enum(["professional", "casual", "edgy", "playful"]),
  visual_style: z.enum(["clean", "bold", "organic"]),
  platform: z.enum(["meta", "tiktok", "linkedin"]),
});

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

export const generateRequestSchema = z.object({
  project_id: z.string().uuid(),
  concept_id: z.string().uuid(),
  prompt_text: z.string().min(1).max(20000),
  reference_image_urls: z.array(z.string()).optional(),
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
