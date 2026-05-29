export type GenerationStatus = "pending" | "generating" | "completed" | "failed";

export type ImageType = "product" | "logo" | "reference";

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
  created_at: string;
}

export interface Concept {
  id: string;
  name: string;
  description: string;
  prompt_template: string;
  sort_order: number;
  is_default: boolean;
  user_id: string | null;
  created_at: string;
}

export interface Generation {
  id: string;
  project_id: string;
  concept_id: string;
  prompt_text: string;
  image_url: string | null;
  status: GenerationStatus;
  version: number;
  created_at: string;
}

export interface ProjectImage {
  id: string;
  project_id: string;
  file_url: string;
  file_type: ImageType;
  created_at: string;
}
