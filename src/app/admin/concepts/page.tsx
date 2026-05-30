import { createAdminClient } from "@/lib/supabase/admin";
import { ConceptsManager } from "@/components/admin/concepts-manager";
import type { ConceptWithUsage } from "@/app/api/admin/concepts/route";
import type { Concept } from "@/lib/types";

export const metadata = { title: "Admin Concepts — paintgym" };

export default async function AdminConceptsPage() {
  const admin = createAdminClient();

  const [{ data: concepts }, { data: pcRows }, { data: genRows }] =
    await Promise.all([
      admin
        .from("concepts")
        .select("*")
        .eq("is_default", true)
        .order("sort_order", { ascending: true }),
      admin
        .from("project_concepts")
        .select("concept_id, project_id, enabled")
        .eq("enabled", true),
      admin.from("generations").select("concept_id"),
    ]);

  const projectCount = new Map<string, Set<string>>();
  for (const row of pcRows ?? []) {
    const r = row as { concept_id: string; project_id: string };
    const set = projectCount.get(r.concept_id) ?? new Set<string>();
    set.add(r.project_id);
    projectCount.set(r.concept_id, set);
  }
  const generationCount = new Map<string, number>();
  for (const row of genRows ?? []) {
    const r = row as { concept_id: string };
    generationCount.set(r.concept_id, (generationCount.get(r.concept_id) ?? 0) + 1);
  }

  const items: ConceptWithUsage[] = ((concepts ?? []) as Concept[]).map(
    (c) => ({
      ...c,
      project_count: projectCount.get(c.id)?.size ?? 0,
      generation_count: generationCount.get(c.id) ?? 0,
    }),
  );

  return <ConceptsManager initial={items} />;
}
