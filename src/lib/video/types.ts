// Video ad domain types. The /video section is self-contained and shares
// nothing with the static-image pipeline beyond an optional project link.

export type VideoFormat =
  | "ugc"
  | "claymation"
  | "cartoon"
  | "lofi"
  | "talking_head"
  | "cinematic";

export type ScriptAngle =
  | "problem_agitation"
  | "transformation"
  | "product_demo"
  | "social_proof"
  | "lifestyle_aspiration";

export type VideoModel =
  | "seedance"
  | "kling"
  | "veo"
  | "arcads"
  | "creatify"
  | "heygen"
  | "higgsfield";

export type IntegrationKey =
  | "higgsfield"
  | "arcads"
  | "creatify"
  | "heygen"
  | "elevenlabs";

export interface ProductDetails {
  product_name?: string;
  product_url?: string;
  description?: string;
  audience?: string;
  benefits?: string;
  price?: string;
}

// One beat of a script. Stored in video_scripts.scene_breakdown (jsonb) and,
// once persisted, mirrored into the video_scenes table.
export interface SceneBeat {
  scene_number: number;
  timecode: string; // e.g. "0-3s"
  label: string; // e.g. "Hook", "Agitation"
  description: string; // what happens on screen + what is said
  duration_seconds?: number;
}

export interface VideoScript {
  id: string;
  video_project_id: string;
  hook_text: string;
  full_script: string;
  scene_breakdown: SceneBeat[];
  angle: ScriptAngle | null;
  is_favorite: boolean;
  created_at: string;
}

export interface VideoProject {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  format: VideoFormat;
  product_details: ProductDetails;
  created_at: string;
}

export interface VideoScene {
  id: string;
  video_script_id: string;
  scene_number: number;
  description: string | null;
  prompt: string | null;
  duration_seconds: number | null;
  video_url: string | null;
  status: "pending" | "prompt_ready" | "generating" | "completed" | "failed";
  created_at: string;
}

// Shape Claude returns from /api/video/generate-scripts (one of five).
export interface GeneratedScript {
  hook: string;
  angle: ScriptAngle;
  angle_label: string;
  full_script: string;
  scenes: SceneBeat[];
}

// Shape Claude returns from /api/video/generate-scene-prompts.
export interface GeneratedScenePrompt {
  scene_number: number;
  model: VideoModel;
  prompt: string;
}
