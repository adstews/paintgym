export type GenerationStatus = "pending" | "generating" | "completed" | "failed";

export type ImageType = "product" | "logo" | "reference";

export type Aggressiveness = "less" | "average" | "more" | "maximum";
export type Tone = "professional" | "casual" | "edgy" | "playful";
export type VisualStyle = "clean" | "bold" | "organic";
export type Platform = "meta" | "tiktok" | "linkedin";

export interface StyleSettings {
  aggressiveness: Aggressiveness;
  tone: Tone;
  visual_style: VisualStyle;
  platform: Platform;
}

export const DEFAULT_STYLE_SETTINGS: StyleSettings = {
  aggressiveness: "average",
  tone: "professional",
  visual_style: "clean",
  platform: "meta",
};

export const PLATFORM_DIMENSIONS: Record<Platform, { width: number; height: number; aspect: string }> = {
  meta: { width: 1080, height: 1080, aspect: "1:1" },
  tiktok: { width: 1080, height: 1920, aspect: "9:16" },
  linkedin: { width: 1200, height: 627, aspect: "1.91:1" },
};

export interface ProductData {
  name?: string;
  price?: string;
  description?: string;
  features?: string[];
  ingredients?: string[];
  images?: string[];
  url?: string;
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
  style_settings: StyleSettings;
  brand_colors: BrandColor[];
  brand_fonts: BrandFont[];
  brand_voice: string | null;
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

export const CONCEPT_VARIANTS: ConceptVariant[] = ["A", "B", "C"];

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
  brief_text: string;
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
  created_at: string;
  qa_status: QaStatus;
  qa_issues: string[];
  qa_severity: QaSeverity | null;
  auto_rewrite_count: number;
  is_auto_rewrite: boolean;
}

export interface UserProfile {
  user_id: string;
  credit_balance: number;
  stripe_customer_id: string | null;
  has_purchased: boolean;
}

// One credit per generation. New users start with five.
export const INITIAL_FREE_CREDITS = 5;
export const GENERATION_CREDIT_COST = 1;

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
