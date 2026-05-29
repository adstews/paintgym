import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { DEFAULT_STYLE_SETTINGS } from "@/lib/types";
import type {
  Brief,
  Concept,
  Generation,
  Project,
  StyleSettings,
} from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (!project) notFound();

  const [{ data: concepts }, { data: gens }, { data: pcs }, { data: briefs }] =
    await Promise.all([
      supabase
        .from("concepts")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("generations")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("project_concepts")
        .select("concept_id, enabled")
        .eq("project_id", id),
      supabase.from("briefs").select("*").eq("project_id", id),
    ]);

  const enabledSet = new Set<string>();
  const allConcepts = (concepts ?? []) as Concept[];
  if (pcs && pcs.length > 0) {
    for (const pc of pcs as { concept_id: string; enabled: boolean }[]) {
      if (pc.enabled) enabledSet.add(pc.concept_id);
    }
  } else {
    for (const c of allConcepts) enabledSet.add(c.id);
  }

  const projectRow = project as Project;
  const projectHydrated: Project = {
    ...projectRow,
    style_settings:
      (projectRow.style_settings as StyleSettings | null) ??
      DEFAULT_STYLE_SETTINGS,
  };

  return (
    <ProjectWorkspace
      project={projectHydrated}
      concepts={allConcepts}
      initialGenerations={(gens ?? []) as Generation[]}
      initialBriefs={(briefs ?? []) as Brief[]}
      enabledConceptIds={enabledSet}
    />
  );
}
