import { createAdminClient } from "@/lib/supabase/admin";

const MAX_EXAMPLES = 5;
const MIN_RATING = 4;

export interface FewShotExample {
  brief_text: string;
  rating: number | null;
  is_favorited: boolean;
  used_in_ad: boolean;
}

interface LoadOptions {
  userId: string;
  conceptId: string | null;
  limit?: number;
}

// Returns the user's top-performing briefs for the same concept, ranked by
// strength of signal. We prefer used_in_ad (the user actually shipped it),
// then favorited, then high star ratings. Same-concept matches are the only
// thing returned: matching across concepts produces irrelevant examples.
export async function loadFewShotExamples({
  userId,
  conceptId,
  limit = MAX_EXAMPLES,
}: LoadOptions): Promise<FewShotExample[]> {
  if (!conceptId) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("generations")
    .select(
      "prompt_text, rating, is_favorited, used_in_ad, projects!inner(user_id)",
    )
    .eq("projects.user_id", userId)
    .eq("concept_id", conceptId)
    .or(
      `rating.gte.${MIN_RATING},is_favorited.eq.true,used_in_ad.eq.true`,
    )
    .order("used_in_ad", { ascending: false })
    .order("is_favorited", { ascending: false })
    .order("rating", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const rows = data as Array<{
    prompt_text: string;
    rating: number | null;
    is_favorited: boolean;
    used_in_ad: boolean;
  }>;

  return rows.map((row) => ({
    brief_text: row.prompt_text,
    rating: row.rating,
    is_favorited: row.is_favorited,
    used_in_ad: row.used_in_ad,
  }));
}

export function buildFewShotSection(examples: FewShotExample[]): string {
  if (examples.length === 0) return "";
  const lines: string[] = [
    "## High-performing briefs for similar concepts",
    "Here are briefs the user has previously rated highly for the same concept type. Use them as taste anchors. Do not copy them verbatim, but treat their structure, tone, and specificity as the bar.",
  ];
  examples.forEach((ex, i) => {
    const signals: string[] = [];
    if (ex.used_in_ad) signals.push("ran as an ad");
    if (ex.is_favorited) signals.push("favorited");
    if (typeof ex.rating === "number") signals.push(`${ex.rating}/5`);
    const tag = signals.length > 0 ? ` (${signals.join(", ")})` : "";
    lines.push(`Example ${i + 1}${tag}:`);
    lines.push(`"""\n${ex.brief_text.trim()}\n"""`);
  });
  return lines.join("\n");
}
