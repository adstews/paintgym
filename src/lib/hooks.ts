// The hook bank: proven opening-line templates a user can pick before Claude
// writes a brief, so the first three seconds lead with a known winner.

export type HookCategory =
  | "curiosity"
  | "fomo"
  | "social_proof"
  | "pain_point"
  | "transformation"
  | "controversy"
  | "authority";

export interface Hook {
  id: string;
  concept_id: string | null;
  hook_template: string;
  category: HookCategory;
  why_it_works: string;
  sort_order: number;
  is_active: boolean;
}

export const HOOK_CATEGORY_LABEL: Record<HookCategory, string> = {
  curiosity: "Curiosity",
  fomo: "FOMO",
  social_proof: "Social Proof",
  pain_point: "Pain Point",
  transformation: "Transformation",
  controversy: "Controversy",
  authority: "Authority",
};

export const HOOK_CATEGORY_ORDER: HookCategory[] = [
  "curiosity",
  "social_proof",
  "pain_point",
  "transformation",
  "fomo",
  "controversy",
  "authority",
];

// A prompt fragment that tells the writer to build the creative around a chosen
// hook. The [bracketed] tokens are filled by the model with the real product
// details from the surrounding product context. `placement` adapts the wording
// for an image brief vs. an on-screen opening line.
export function hookInstruction(
  hookTemplate: string | null | undefined,
  placement: "brief" | "opening",
): string {
  if (!hookTemplate || !hookTemplate.trim()) return "";
  const where =
    placement === "opening"
      ? "Use this proven hook as the opening line of the first message/post, filling the [bracketed] tokens with the real product details above"
      : "Open the ad with this proven hook, filling the [bracketed] tokens with the real product details above";
  return `\n## Hook to build around
${where}. Then build the rest of the creative so it pays off that hook. Keep the hook's angle and energy; rewrite it into natural copy, do not leave any brackets in the output.
Hook: "${hookTemplate.trim()}"\n`;
}
