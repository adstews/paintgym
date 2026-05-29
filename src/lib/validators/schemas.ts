import { z } from "zod";

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(120),
  client_name: z.string().max(120).optional().nullable(),
  product_url: z.string().url().optional().nullable(),
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

export const authEmailSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ConceptUpsertInput = z.infer<typeof conceptUpsertSchema>;
export type ScrapeRequestInput = z.infer<typeof scrapeRequestSchema>;
export type GenerateRequestInput = z.infer<typeof generateRequestSchema>;
