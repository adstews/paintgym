// Non-negotiable rules appended to every Gemini prompt before submission.
// They are NOT part of the user-facing brief; the brief writer (Claude) and
// the user only see the creative prompt. These rules are tacked on at the
// Gemini call site so the image model gets them every time.
export const GEMINI_HARD_RULES = `
Hard rules for this image. Follow every rule, no exceptions:
- All text rendered on the image must be spelled correctly with no misspellings or garbled letters.
- Do not alter, redesign, or reimagine any product labels, logos, or brand packaging. Render them exactly as they appear in the reference.
- Do not add fake brand names, made-up product names, or incorrect text to labels.
- Keep all text legible and properly aligned.
- Numbers and statistics must be rendered accurately. Do not swap digits.
- If the prompt specifies text to display, render it exactly as written, word for word.
`.trim();

export interface HardRuleOptions {
  aspect?: string;
  width?: number;
  height?: number;
}

// Defaults match the Meta 4:5 feed format. Callers pass platform-specific
// dimensions when generating for a different surface.
const DEFAULT_ASPECT = "4:5";
const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1350;

export function applyHardRules(
  prompt: string,
  opts: HardRuleOptions = {},
): string {
  const aspect = opts.aspect ?? DEFAULT_ASPECT;
  const width = opts.width ?? DEFAULT_WIDTH;
  const height = opts.height ?? DEFAULT_HEIGHT;
  const aspectRule = `- Output the image at a ${aspect} aspect ratio (${width} by ${height} pixels). Do not crop to square. Do not pad with letterbox bars; compose the scene to fill the full ${aspect} frame edge to edge.`;
  return `${prompt.trim()}\n\n${GEMINI_HARD_RULES}\n${aspectRule}`;
}
