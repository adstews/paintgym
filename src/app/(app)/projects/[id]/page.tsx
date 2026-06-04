import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { DEFAULT_STYLE_SETTINGS } from "@/lib/types";
import { ensureProfile } from "@/lib/credits";
import type {
  Brief,
  Concept,
  Generation,
  Project,
  Recreation,
  StyleSettings,
} from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Every generation column EXCEPT the two heavy base64 data URLs (image_url,
// watermarked_url). Those run 5-10MB each as data URLs, so selecting them for
// every row made the initial page payload hundreds of MB and the page take
// 5-10s to load. We ship metadata only; the client lazy-loads each image via
// /api/generations/by-ids when its card scrolls into view.
const GENERATION_METADATA_COLUMNS =
  "id, project_id, concept_id, concept_variant, recreation_id, variant_label, " +
  "prompt_text, is_unlocked, status, version, model_used, created_at, qa_status, " +
  "qa_issues, qa_severity, auto_rewrite_count, is_auto_rewrite, rating, " +
  "is_favorited, used_in_ad, refined_from, refinement_feedback, is_competitive, " +
  "competitor_name";

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (!project) notFound();

  const [
    { data: concepts },
    { data: gens },
    { data: pcs },
    { data: briefs },
    { data: recreations },
    userProfile,
  ] = await Promise.all([
    supabase
      .from("concepts")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("generations")
      .select(GENERATION_METADATA_COLUMNS)
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("project_concepts")
      .select("concept_id, enabled")
      .eq("project_id", id),
    supabase.from("briefs").select("*").eq("project_id", id),
    supabase
      .from("recreations")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    ensureProfile(user.id),
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
    brand_colors: projectRow.brand_colors ?? [],
    brand_fonts: projectRow.brand_fonts ?? [],
    competitor_data: projectRow.competitor_data ?? null,
  };

  return (
    <ProjectWorkspace
      project={projectHydrated}
      concepts={allConcepts}
      initialGenerations={
        (gens ?? []).map((g) => ({
          ...(g as object),
          image_url: null,
          watermarked_url: null,
        })) as Generation[]
      }
      initialBriefs={(briefs ?? []) as Brief[]}
      initialRecreations={(recreations ?? []) as Recreation[]}
      enabledConceptIds={enabledSet}
      userProfile={userProfile}
    />
  );
}
