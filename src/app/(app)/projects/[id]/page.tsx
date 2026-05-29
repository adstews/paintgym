import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import type { Concept, Generation, Project } from "@/lib/types";

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

  const [{ data: concepts }, { data: gens }, { data: pcs }] = await Promise.all([
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

  return (
    <ProjectWorkspace
      project={project as Project}
      concepts={allConcepts}
      initialGenerations={(gens ?? []) as Generation[]}
      enabledConceptIds={enabledSet}
    />
  );
}
