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

export interface Brief {
  id: string;
  project_id: string;
  concept_id: string;
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

export interface Generation {
  id: string;
  project_id: string;
  concept_id: string;
  prompt_text: string;
  image_url: string | null;
  status: GenerationStatus;
  version: number;
  created_at: string;
  qa_status: QaStatus;
  qa_issues: string[];
  qa_severity: QaSeverity | null;
  auto_rewrite_count: number;
  is_auto_rewrite: boolean;
}

export interface ProjectImage {
  id: string;
  project_id: string;
  file_url: string;
  file_type: ImageType;
  created_at: string;
}
