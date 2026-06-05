export type GenerationStatus = "pending" | "generating" | "completed" | "failed";

export type JobType = "generate" | "review" | "rewrite";
export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface Job {
  id: string;
  project_id: string;
  generation_id: string | null;
  concept_id: string | null;
  concept_variant: string | null;
  type: JobType;
  status: JobStatus;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  error: string | null;
  next_run_at: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// Per-job retry budgets. Gemini already retries transient errors internally
// (see generate-image.ts), so these cover harder failures. Reviews are
// best-effort and the image is usable even if QA never succeeds.
export const JOB_MAX_ATTEMPTS: Record<JobType, number> = {
  generate: 3,
  review: 2,
  rewrite: 2,
};

export type ImageType = "product" | "logo" | "reference";

// Concrete aggressiveness levels plus "mix" — a meta-setting that randomly
// assigns one of the concrete levels to each brief independently (~1/3 each).
// "mix" never reaches the guidance map; it is resolved to a concrete level
// per-concept at brief-writing time (see resolveAggressiveness).
export type ConcreteAggressiveness = "less" | "average" | "maximum";
export type Aggressiveness = ConcreteAggressiveness | "mix";
export const CONCRETE_AGGRESSIVENESS: ConcreteAggressiveness[] = [
  "less",
  "average",
  "maximum",
];
export type Tone = "professional" | "casual" | "edgy" | "playful";
export type VisualStyle = "clean" | "bold" | "organic";
// Only Meta (4:5) for now. TikTok/LinkedIn were removed; the type is a single
// member so the platform selector collapses to a hardcoded default.
export type Platform = "meta";

// A concrete image generator. Stored on each generation row (model_used) so the
// gallery can show which model produced an image.
export type ImageModel = "gemini" | "openai";

// The project-level routing preference. "gemini"/"openai" pin a single model,
// "alternating" flips per concept, and "both" renders with both models side by
// side for comparison. Resolved to one or more ImageModel via the image-gen
// router. See src/lib/image-gen/router.ts.
export type ModelPreference = "gemini" | "openai" | "alternating" | "both";

export interface StyleSettings {
  aggressiveness: Aggressiveness;
  tone: Tone;
  visual_style: VisualStyle;
  platform: Platform;
  // Which image model(s) to generate with. Defaults to "gemini" for existing
  // projects whose style_settings predate this field.
  image_model?: ModelPreference;
}

export const DEFAULT_STYLE_SETTINGS: StyleSettings = {
  // "Mix it up" is the default: each brief gets a random aggressiveness level.
  aggressiveness: "mix",
  tone: "professional",
  visual_style: "clean",
  platform: "meta",
  image_model: "gemini",
};

// Short single-letter badge shown on each gallery image card.
export const MODEL_BADGE: Record<ImageModel, string> = {
  gemini: "G",
  openai: "O",
};

export const MODEL_LABEL: Record<ImageModel, string> = {
  gemini: "Gemini",
  openai: "GPT-4o",
};

export const PLATFORM_DIMENSIONS: Record<Platform, { width: number; height: number; aspect: string }> = {
  meta: { width: 1080, height: 1350, aspect: "4:5" },
};

// Tolerant accessor: legacy projects may still carry "tiktok"/"linkedin" in
// their stored style_settings, so anything unknown falls back to Meta rather
// than crashing on an undefined dimension lookup.
export function platformDimensions(platform: Platform | string | null | undefined) {
  return PLATFORM_DIMENSIONS[(platform as Platform) ?? "meta"] ?? PLATFORM_DIMENSIONS.meta;
}

export interface ProductData {
  name?: string;
  price?: string;
  description?: string;
  features?: string[];
  ingredients?: string[];
  images?: string[];
  url?: string;
}

export interface CompetitorData extends ProductData {
  brand?: string;
  scraped_at?: string;
}

export interface BrandColor {
  label: string;
  hex: string;
}

export interface BrandFont {
  role: string;
  family: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  client_name: string | null;
  product_url: string | null;
  product_data: ProductData | null;
  logo_url: string | null;
  brand_name: string | null;
  product_name: string | null;
  product_description: string | null;
  key_selling_points: string | null;
  target_audience: string | null;
  price_point: string | null;
  proof_points: string | null;
  // Hard rules / compliance constraints the briefs must never violate.
  compliance_rules: string | null;
  style_settings: StyleSettings;
  brand_colors: BrandColor[];
  brand_fonts: BrandFont[];
  brand_voice: string | null;
  competitor_data: CompetitorData | null;
  // Free regenerations remaining for this project. Reset to REGEN_FREE_BUDGET
  // each time a full batch completes; a regeneration spends this before credits.
  regen_budget: number;
  created_at: string;
}

export interface Concept {
  id: string;
  name: string;
  description: string;
  prompt_template: string;
  sort_order: number;
  is_default: boolean;
  active: boolean;
  user_id: string | null;
  created_at: string;
}

export type ConceptVariant = "A" | "B" | "C";

export const CONCEPT_VARIANTS: ConceptVariant[] = ["A"];

export const CONCEPT_VARIANT_DISPLAY: Record<ConceptVariant, string> = {
  A: "Variant A",
  B: "Variant B",
  C: "Variant C",
};

export const CONCEPT_VARIANT_DIRECTION: Record<ConceptVariant, string> = {
  A: "the most natural interpretation of the concept",
  B: "a different angle: different headline, different visual composition, different emotional framing",
  C: "an unexpected, wildcard take on the concept that still serves the product",
};

export interface Brief {
  id: string;
  project_id: string;
  concept_id: string;
  variant: ConceptVariant;
  // Which image model this brief was written for. Gemini and GPT get separately
  // authored briefs (different copy/visual direction) so their images diverge.
  // Defaults to "gemini" for rows that predate model-targeted briefs.
  model_target: ImageModel;
  brief_text: string;
  summary: string | null;
  key_points: string[];
  // Structured on-screen content for the eight HTML-rendered concepts (iMessage,
  // Notes, Reddit, Tweet, TikTok, Instagram Story, Claude, ChatGPT). Null for
  // ordinary image-model briefs. Drives the server-side screenshot renderer.
  render_content: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type QaStatus =
  | "pending"
  | "reviewing"
  | "passed"
  | "minor"
  | "major"
  | "overridden"
  | "rewriting";

export type QaSeverity = "minor" | "major";

export type VariantLabel =
  | "faithful"
  | "simplified"
  | "bold"
  | "alt_palette"
  | "platform_adapted";

export const VARIANT_LABELS: VariantLabel[] = [
  "faithful",
  "simplified",
  "bold",
  "alt_palette",
  "platform_adapted",
];

export const VARIANT_DISPLAY: Record<VariantLabel, string> = {
  faithful: "Faithful",
  simplified: "Simplified",
  bold: "Bold",
  alt_palette: "Alt palette",
  platform_adapted: "Platform adapted",
};

export interface Recreation {
  id: string;
  project_id: string;
  source_image_url: string;
  analysis: string | null;
  created_at: string;
}

export interface Generation {
  id: string;
  project_id: string;
  concept_id: string | null;
  concept_variant: ConceptVariant | null;
  recreation_id: string | null;
  variant_label: VariantLabel | null;
  prompt_text: string;
  image_url: string | null;
  watermarked_url: string | null;
  is_unlocked: boolean;
  status: GenerationStatus;
  version: number;
  // Which model rendered this image. Null for rows generated before model
  // tracking existed (treated as Gemini in the UI).
  model_used: ImageModel | null;
  created_at: string;
  qa_status: QaStatus;
  qa_issues: string[];
  qa_severity: QaSeverity | null;
  auto_rewrite_count: number;
  is_auto_rewrite: boolean;
  // The post-batch sweep auto-retries each failed/stuck generation exactly once;
  // this flag marks a row that has already been swept so it is never retried in
  // a loop. A row that fails again after recovery stays failed (manual Retry).
  recovery_attempted: boolean;
  rating: number | null;
  is_favorited: boolean;
  used_in_ad: boolean;
  refined_from: string | null;
  refinement_feedback: string | null;
  is_competitive: boolean;
  competitor_name: string | null;
}

export interface UserProfile {
  user_id: string;
  credit_balance: number;
  stripe_customer_id: string | null;
  has_purchased: boolean;
}

// New users start with zero credits: briefs are free, image generation is paid.
// Buying a credit pack is what unlocks rendering. (HTML-rendered concepts still
// cost nothing, since their server-side screenshot has no image-model cost.)
export const INITIAL_FREE_CREDITS = 0;
export const GENERATION_CREDIT_COST = 1;
// Regenerations, refinements, and retries of an existing concept image cost
// half a credit (still ~4.5x markup over our render cost). Requires the
// numeric credit_balance column from migration 0015.
export const REGENERATION_CREDIT_COST = 0.5;

// Free regenerations included with a completed batch. A regeneration spends this
// budget before it spends paid credits; the budget resets to this value each
// time a full batch finishes generating (see /api/queue/finalize).
export const REGEN_FREE_BUDGET = 4;

export type CreditPackId = "starter" | "full_project" | "pro" | "agency";

export interface CreditPack {
  id: CreditPackId;
  credits: number;
  amount_cents: number;
  label: string;
  most_popular?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "starter", credits: 50, amount_cents: 3900, label: "Starter" },
  {
    id: "full_project",
    credits: 110,
    amount_cents: 6900,
    label: "Full Project",
    most_popular: true,
  },
  { id: "pro", credits: 300, amount_cents: 14900, label: "Pro" },
  { id: "agency", credits: 750, amount_cents: 29900, label: "Agency" },
];

// Legacy: still used by the bulk-unlock path for any pre-existing locked rows.
export const UNLOCK_ALL_DISCOUNT = 0.8;

export interface ProjectImage {
  id: string;
  project_id: string;
  file_url: string;
  file_type: ImageType;
  created_at: string;
}
