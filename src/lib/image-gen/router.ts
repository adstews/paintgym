// Image-generation router. Every caller goes through here instead of calling a
// specific generator directly, so model selection lives in one place.
//
//   - "gemini"      -> always Gemini
//   - "openai"      -> always OpenAI
//   - "alternating" -> odd concepts (1st, 3rd, ...) Gemini, even concepts OpenAI
//   - "both"        -> render with BOTH models (two images per concept)
//
// The QA pipeline, brief writing, and hard rules are all model-agnostic and are
// deliberately unaffected by routing.
import { generateImage as generateGemini } from "@/lib/gemini/generate-image";
import { generateImageOpenAI } from "@/lib/openai/generate-image";
import { DEFAULT_STYLE_SETTINGS } from "@/lib/types";
import type {
  GenerateImageOptions,
  GenerateImageResult,
} from "@/lib/gemini/generate-image";
import type { ImageModel, ModelPreference, StyleSettings } from "@/lib/types";

// Read the model preference off a project's style_settings, tolerating rows that
// predate the field (treated as Gemini).
export function modelPreference(
  style: StyleSettings | null | undefined,
): ModelPreference {
  return style?.image_model ?? DEFAULT_STYLE_SETTINGS.image_model ?? "gemini";
}

// The full set of models to render for a concept at the given zero-based index.
// "both" returns two; everything else returns exactly one.
export function modelsForConcept(
  pref: ModelPreference,
  conceptIndex: number,
): ImageModel[] {
  switch (pref) {
    case "openai":
      return ["openai"];
    case "alternating":
      // conceptIndex 0 is the 1st concept (odd) -> Gemini.
      return [conceptIndex % 2 === 0 ? "gemini" : "openai"];
    case "both":
      return ["gemini", "openai"];
    case "gemini":
    default:
      return ["gemini"];
  }
}

// A single model for actions that produce exactly one image (regenerate, refine,
// QA auto-rewrite). "both" collapses to Gemini here — true side-by-side
// comparison only happens in the batch path, which enqueues two jobs.
export function singleModel(
  pref: ModelPreference,
  conceptIndex = 0,
): ImageModel {
  if (pref === "both") return "gemini";
  return modelsForConcept(pref, conceptIndex)[0];
}

// Dispatch a single render to the chosen generator. The options are identical
// across models so callers never branch on model themselves.
export function generateWithModel(
  model: ImageModel,
  opts: GenerateImageOptions,
): Promise<GenerateImageResult> {
  return model === "openai" ? generateImageOpenAI(opts) : generateGemini(opts);
}
