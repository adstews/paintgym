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

export function applyHardRules(prompt: string): string {
  return `${prompt.trim()}\n\n${GEMINI_HARD_RULES}`;
}
