"use client";

import { useMemo, useState, type CSSProperties, type ReactElement } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Icon, Badge } from "@/components/tf/ui";
import { GenerationCard } from "@/components/gallery/generation-card";
import { ProductDetailsForm } from "./product-details-form";
import { BriefCard } from "./brief-card";
import { RecreateTab } from "./recreate-tab";
import { CompetitorSpyTab } from "./competitor-spy-tab";
import { CreditsPanel } from "./credits-panel";
import { CONCEPT_VARIANTS } from "@/lib/types";
import type {
  Brief,
  Concept,
  ConceptVariant,
  Generation,
  Project,
  Recreation,
  UserProfile,
  VariantLabel,
} from "@/lib/types";

interface Props {
  project: Project;
  concepts: Concept[];
  initialGenerations: Generation[];
  initialBriefs: Brief[];
  initialRecreations: Recreation[];
  enabledConceptIds: Set<string>;
  userProfile: UserProfile;
}

let tempCounter = 0;
function makeTempId(prefix: string): string {
  tempCounter += 1;
  return `tmp-${prefix}-${tempCounter}`;
}

function newerFirst(a: Generation, b: Generation): number {
  return b.version - a.version;
}

function briefKey(conceptId: string, variant: ConceptVariant): string {
  return `${conceptId}:${variant}`;
}

function variantKey(conceptId: string, variant: ConceptVariant | null): string {
  return `${conceptId}:${variant ?? "A"}`;
}

export function ProjectWorkspace({
  project: initialProject,
  concepts,
  initialGenerations,
  initialBriefs,
  initialRecreations,
  enabledConceptIds: initialEnabled,
  userProfile: initialProfile,
}: Props) {
  const [project, setProject] = useState(initialProject);
  const [generations, setGenerations] = useState(initialGenerations);
  const [briefs, setBriefs] = useState(initialBriefs);
  const [recreations, setRecreations] = useState(initialRecreations);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [profile, setProfile] = useState(initialProfile);
  const [batchBriefsLoading, setBatchBriefsLoading] = useState(false);
  const [batchImagesLoading, setBatchImagesLoading] = useState(false);
  const [topPerformersOnly, setTopPerformersOnly] = useState(false);
  const [informedBy, setInformedBy] = useState<Record<string, number>>({});

  const conceptsById = useMemo(
    () => new Map(concepts.map((c) => [c.id, c])),
    [concepts],
  );

  const enabledConcepts = useMemo(
    () => concepts.filter((c) => enabled.has(c.id)),
    [concepts, enabled],
  );

  const briefsByKey = useMemo(() => {
    const m = new Map<string, Brief>();
    for (const b of briefs) m.set(briefKey(b.concept_id, b.variant), b);
    return m;
  }, [briefs]);

  const attemptsByKey = useMemo(() => {
    const map = new Map<string, Generation[]>();
    for (const g of generations) {
      if (!g.concept_id) continue;
      if (g.is_competitive) continue;
      const key = variantKey(
        g.concept_id,
        (g.concept_variant ?? "A") as ConceptVariant,
      );
      const arr = map.get(key) ?? [];
      arr.push(g);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort(newerFirst);
    return map;
  }, [generations]);

  const galleryConcepts = useMemo(
    () =>
      concepts.filter((c) =>
        CONCEPT_VARIANTS.some((v) => attemptsByKey.has(variantKey(c.id, v))),
      ),
    [concepts, attemptsByKey],
  );

  function applyBriefs(newBriefs: Brief[]) {
    if (newBriefs.length === 0) return;
    const m = new Map(briefs.map((b) => [b.id, b]));
    for (const b of newBriefs) m.set(b.id, b);
    setBriefs(Array.from(m.values()));
  }

  function replaceBrief(updated: Brief) {
    setBriefs((arr) => {
      const i = arr.findIndex((b) => b.id === updated.id);
      if (i === -1) return [...arr, updated];
      const next = arr.slice();
      next[i] = updated;
      return next;
    });
  }

  function mergeGenerations(incoming: Generation[]) {
    if (incoming.length === 0) return;
    setGenerations((arr) => {
      const byId = new Map(arr.map((g) => [g.id, g]));
      for (const g of incoming) byId.set(g.id, g);
      return Array.from(byId.values());
    });
  }

  function updateGeneration(
    matchId: string,
    patch: Partial<Generation> & { id?: string },
  ) {
    setGenerations((arr) =>
      arr.map((row) => (row.id === matchId ? { ...row, ...patch } : row)),
    );
  }

  async function generateBriefs(conceptIds: string[]) {
    if (conceptIds.length === 0) return;
    const res = await fetch("/api/generate-briefs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project_id: project.id,
        concept_ids: conceptIds,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? err.error ?? "Brief generation failed");
    }
    const json = await res.json();
    applyBriefs(json.briefs as Brief[]);
    if (json.informed_by && typeof json.informed_by === "object") {
      setInformedBy((prev) => ({
        ...prev,
        ...(json.informed_by as Record<string, number>),
      }));
    }
    const failures = (json.failures ?? []) as {
      concept_id: string;
      message: string;
    }[];
    if (failures.length > 0) {
      toast.error(
        `${failures.length} concept${failures.length === 1 ? "" : "s"} failed`,
      );
    }
  }

  async function generateAllBriefs() {
    setBatchBriefsLoading(true);
    try {
      await generateBriefs(enabledConcepts.map((c) => c.id));
      toast.success("Briefs ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Brief generation failed");
    } finally {
      setBatchBriefsLoading(false);
    }
  }

  async function regenerateBriefsForConcept(conceptId: string) {
    try {
      await generateBriefs([conceptId]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Regenerate failed");
    }
  }

  async function runReview(generationId: string) {
    updateGeneration(generationId, { qa_status: "reviewing" });
    try {
      const res = await fetch("/api/review-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ generation_id: generationId }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? json.error ?? "QA review failed");
      }
      const updated = (json.generations ?? []) as Generation[];
      mergeGenerations(updated);
      if (json.rewrite_error) {
        toast.error(`Auto-rewrite stopped: ${json.rewrite_error}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "QA review failed");
      updateGeneration(generationId, {
        qa_status: "minor",
        qa_severity: "minor",
        qa_issues: ["QA review error"],
      });
    }
  }

  async function generateImageForVariant(
    conceptId: string,
    variant: ConceptVariant,
  ) {
    const brief = briefsByKey.get(briefKey(conceptId, variant));
    if (!brief) {
      toast.error("Generate briefs for this concept first");
      return;
    }
    const tempId = makeTempId(`${conceptId}-${variant}`);
    const existing = attemptsByKey.get(variantKey(conceptId, variant)) ?? [];
    const placeholder: Generation = {
      id: tempId,
      project_id: project.id,
      concept_id: conceptId,
      concept_variant: variant,
      recreation_id: null,
      variant_label: null,
      prompt_text: brief.brief_text,
      image_url: null,
      watermarked_url: null,
      is_unlocked: false,
      status: "generating",
      version: (existing[0]?.version ?? 0) + 1,
      created_at: new Date().toISOString(),
      qa_status: "pending",
      qa_issues: [],
      qa_severity: null,
      auto_rewrite_count: 0,
      is_auto_rewrite: false,
      rating: null,
      is_favorited: false,
      used_in_ad: false,
      refined_from: null,
      refinement_feedback: null,
      is_competitive: false,
      competitor_name: null,
    };
    setGenerations((g) => [placeholder, ...g]);

    let realId: string | null = null;
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          concept_id: conceptId,
          concept_variant: variant,
          prompt_text: brief.brief_text,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          toast.error(json.message ?? "Free preview limit reached");
        } else {
          throw new Error(json.message ?? "Generation failed");
        }
        updateGeneration(tempId, { status: "failed" });
        return;
      }
      realId = json.id as string;
      const updatedRow = json.generation as Generation | undefined;
      updateGeneration(tempId, {
        id: realId,
        image_url: updatedRow?.image_url ?? json.image_url,
        watermarked_url: updatedRow?.watermarked_url ?? null,
        is_unlocked: updatedRow?.is_unlocked ?? false,
        status: "completed",
        qa_status: "reviewing",
      });
    } catch (err) {
      updateGeneration(tempId, { status: "failed" });
      toast.error(err instanceof Error ? err.message : "Generation failed");
      return;
    }

    if (realId) await runReview(realId);
  }

  async function regenerateVariantImage(
    recreationId: string,
    variantLabel: VariantLabel,
    promptText: string,
  ) {
    const existing = generations.filter(
      (g) =>
        g.recreation_id === recreationId && g.variant_label === variantLabel,
    );
    const nextVersion =
      existing.reduce((m, g) => Math.max(m, g.version), 0) + 1;
    const tempId = makeTempId(`${recreationId}-${variantLabel}`);
    const placeholder: Generation = {
      id: tempId,
      project_id: project.id,
      concept_id: null,
      concept_variant: null,
      recreation_id: recreationId,
      variant_label: variantLabel,
      prompt_text: promptText,
      image_url: null,
      watermarked_url: null,
      is_unlocked: false,
      status: "generating",
      version: nextVersion,
      created_at: new Date().toISOString(),
      qa_status: "pending",
      qa_issues: [],
      qa_severity: null,
      auto_rewrite_count: 0,
      is_auto_rewrite: false,
      rating: null,
      is_favorited: false,
      used_in_ad: false,
      refined_from: null,
      refinement_feedback: null,
      is_competitive: false,
      competitor_name: null,
    };
    setGenerations((g) => [placeholder, ...g]);

    let realId: string | null = null;
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          recreation_id: recreationId,
          variant_label: variantLabel,
          prompt_text: promptText,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          toast.error(json.message ?? "Free preview limit reached");
        } else {
          throw new Error(json.message ?? "Generation failed");
        }
        updateGeneration(tempId, { status: "failed" });
        return;
      }
      realId = json.id as string;
      const updatedRow = json.generation as Generation | undefined;
      updateGeneration(tempId, {
        id: realId,
        image_url: updatedRow?.image_url ?? json.image_url,
        watermarked_url: updatedRow?.watermarked_url ?? null,
        is_unlocked: updatedRow?.is_unlocked ?? false,
        status: "completed",
        qa_status: "reviewing",
      });
    } catch (err) {
      updateGeneration(tempId, { status: "failed" });
      toast.error(err instanceof Error ? err.message : "Generation failed");
      return;
    }
    if (realId) await runReview(realId);
  }

  function applyRecreation(recreation: Recreation, newGens: Generation[]) {
    setRecreations((arr) => [recreation, ...arr]);
    setGenerations((arr) => [...newGens, ...arr]);
  }

  async function generateAllImages() {
    setBatchImagesLoading(true);
    try {
      for (const c of enabledConcepts) {
        for (const v of CONCEPT_VARIANTS) {
          if (briefsByKey.has(briefKey(c.id, v))) {
            await generateImageForVariant(c.id, v);
          }
        }
      }
      toast.success("Batch complete");
    } finally {
      setBatchImagesLoading(false);
    }
  }

  async function overrideGeneration(generationId: string) {
    try {
      const res = await fetch(`/api/generations/${generationId}/override`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? err.error ?? "Override failed");
      }
      const json = await res.json();
      mergeGenerations([json.generation as Generation]);
      toast.success("Image accepted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Override failed");
    }
  }

  function applyRatingUpdate(updated: Generation) {
    mergeGenerations([updated]);
  }

  function applyRefinedGeneration(updated: Generation, newBalance?: number) {
    mergeGenerations([updated]);
    if (typeof newBalance === "number") {
      setProfile((p) => ({ ...p, credit_balance: newBalance }));
    }
  }

  async function unlockGeneration(generationId: string) {
    try {
      const res = await fetch(`/api/generations/${generationId}/unlock`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? json.error ?? "Unlock failed");
      }
      mergeGenerations([json.generation as Generation]);
      if (json.profile) setProfile(json.profile as UserProfile);
      toast.success("Image unlocked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unlock failed");
    }
  }

  async function unlockAll() {
    try {
      const res = await fetch(`/api/projects/${project.id}/unlock-all`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? json.error ?? "Unlock all failed");
      }
      if (Array.isArray(json.generations)) {
        mergeGenerations(json.generations as Generation[]);
      }
      if (json.profile) setProfile(json.profile as UserProfile);
      toast.success(`Unlocked ${json.unlocked_count} images`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unlock all failed");
    }
  }

  async function toggleConcept(conceptId: string, on: boolean) {
    const next = new Set(enabled);
    if (on) next.add(conceptId);
    else next.delete(conceptId);
    setEnabled(next);
    await fetch(`/api/projects/${project.id}/concepts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ concept_id: conceptId, enabled: on }),
    });
  }

  async function downloadAll() {
    const items = generations.filter(
      (g) =>
        g.image_url &&
        g.is_unlocked &&
        g.qa_status !== "rewriting" &&
        g.concept_id,
    );
    if (items.length === 0) {
      toast.error("Unlock images first");
      return;
    }
    for (const g of items) {
      const concept = g.concept_id ? conceptsById.get(g.concept_id) : null;
      if (!concept || !g.image_url) continue;
      const a = document.createElement("a");
      a.href = g.image_url;
      a.download = `${concept.name.toLowerCase().replace(/\s+/g, "-")}-${g.concept_variant ?? ""}-v${g.version}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  const briefsCount = useMemo(() => {
    let n = 0;
    for (const c of enabledConcepts) {
      for (const v of CONCEPT_VARIANTS) {
        if (briefsByKey.has(briefKey(c.id, v))) n += 1;
      }
    }
    return n;
  }, [enabledConcepts, briefsByKey]);

  const lockedCount = useMemo(
    () =>
      generations.filter(
        (g) => g.image_url && !g.is_unlocked && g.status === "completed",
      ).length,
    [generations],
  );

  // Training Floor segmented control — restyle shadcn Tabs without touching wiring.
  const segListStyle: CSSProperties = {
    display: "flex",
    border: "1.5px solid var(--ink)",
    borderRadius: 3,
    background: "var(--ink)",
    padding: 0,
    overflow: "hidden",
  };
  const segBtnStyle: CSSProperties = {
    flex: 1,
    border: 0,
    background: "transparent",
    color: "#fff",
    fontFamily: "var(--ui)",
    fontWeight: 700,
    fontSize: 12.5,
    letterSpacing: ".01em",
    padding: "10px 8px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <div className="space-y-6">
      <div className="pg-ws-head" style={{ border: 0, padding: 0, background: "transparent" }}>
        <div className="pg-ws-title">
          <h2>{project.name}</h2>
        </div>
        {(project.brand_name || project.client_name) && (
          <div className="pg-ws-stats">
            <span className="pg-ws-stat">
              {project.brand_name ?? project.client_name}
            </span>
          </div>
        )}
        <div className="pg-ws-stats" style={{ gap: 8 }}>
          <button
            className="pg-btn pg-btn--outline pg-btn--sm"
            onClick={generateAllBriefs}
            disabled={batchBriefsLoading || enabledConcepts.length === 0}
          >
            {batchBriefsLoading
              ? "Writing briefs..."
              : `Generate briefs (${enabledConcepts.length})`}
          </button>
          <button
            className="pg-btn pg-btn--pop pg-btn--sm"
            onClick={generateAllImages}
            disabled={batchImagesLoading || briefsCount === 0}
          >
            {batchImagesLoading
              ? "Generating..."
              : `Generate images (${briefsCount})`}
          </button>
          <button
            className="pg-btn pg-btn--outline pg-btn--sm"
            onClick={downloadAll}
            disabled={
              generations.filter(
                (g) => g.image_url && g.is_unlocked && g.concept_id,
              ).length === 0
            }
          >
            Download all
          </button>
        </div>
      </div>

      <CreditsPanel
        profile={profile}
        lockedCount={lockedCount}
        onProfileChange={setProfile}
        onUnlockAll={lockedCount > 0 ? unlockAll : undefined}
      />

      <Tabs defaultValue="product">
        <TabsList
          className="w-full data-[state=active]:!bg-transparent"
          style={segListStyle}
        >
          <TabsTrigger
            value="product"
            className="data-[state=active]:!bg-[var(--pop)] data-[state=active]:!text-[var(--pop-ink)] data-[state=active]:!shadow-none"
            style={segBtnStyle}
          >
            Product
          </TabsTrigger>
          <TabsTrigger
            value="concepts"
            className="data-[state=active]:!bg-[var(--pop)] data-[state=active]:!text-[var(--pop-ink)] data-[state=active]:!shadow-none"
            style={segBtnStyle}
          >
            Concepts
          </TabsTrigger>
          <TabsTrigger
            value="briefs"
            className="data-[state=active]:!bg-[var(--pop)] data-[state=active]:!text-[var(--pop-ink)] data-[state=active]:!shadow-none"
            style={segBtnStyle}
          >
            Briefs
          </TabsTrigger>
          <TabsTrigger
            value="gallery"
            className="data-[state=active]:!bg-[var(--pop)] data-[state=active]:!text-[var(--pop-ink)] data-[state=active]:!shadow-none"
            style={segBtnStyle}
          >
            Gallery
          </TabsTrigger>
          <TabsTrigger
            value="recreate"
            className="data-[state=active]:!bg-[var(--pop)] data-[state=active]:!text-[var(--pop-ink)] data-[state=active]:!shadow-none"
            style={segBtnStyle}
          >
            Recreate
          </TabsTrigger>
          <TabsTrigger
            value="competitor"
            className="data-[state=active]:!bg-[var(--pop)] data-[state=active]:!text-[var(--pop-ink)] data-[state=active]:!shadow-none"
            style={segBtnStyle}
          >
            Competitor Spy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="product" className="pt-4">
          <ProductDetailsForm
            project={project}
            onProjectChange={setProject}
          />
        </TabsContent>

        <TabsContent value="concepts" className="space-y-3 pt-4">
          <div
            className="pg-mono pg-muted"
            style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}
          >
            {"// toggle the concepts you want briefs and images for — each concept produces one brief."}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {concepts.map((c) => {
              const on = enabled.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleConcept(c.id, !on)}
                  className="text-left"
                  style={{
                    border: `1.5px solid ${on ? "var(--ink)" : "var(--line)"}`,
                    borderRadius: 4,
                    padding: 12,
                    background: on ? "#fff" : "transparent",
                    boxShadow: on ? "var(--shadow-sm)" : "none",
                    cursor: "pointer",
                    transition: "border-color .12s, box-shadow .12s",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      style={{
                        fontFamily: "var(--headline)",
                        fontWeight: 800,
                        fontSize: 13,
                      }}
                    >
                      {c.name}
                    </span>
                    {on && <Badge tone="pop">Enabled</Badge>}
                  </div>
                  <p
                    className="pg-muted line-clamp-2"
                    style={{ marginTop: 4, fontSize: 12 }}
                  >
                    {c.description}
                  </p>
                </button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="briefs" className="space-y-6 pt-4">
          {enabledConcepts.length === 0 ? (
            <div className="pg-empty">
              <div className="ix">
                <Icon name="flag" size={26} />
              </div>
              <h3>No briefs yet</h3>
              <p>Enable at least one concept to start writing briefs.</p>
            </div>
          ) : (
            enabledConcepts.map((c) => (
              <div key={c.id} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="pg-h2" style={{ fontSize: 18 }}>
                      {c.name}
                    </h2>
                    <p className="pg-muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {c.description}
                    </p>
                    {informedBy[c.id] > 0 && (
                      <p
                        className="pg-mono"
                        style={{ marginTop: 4, fontSize: 11, color: "var(--green)" }}
                      >
                        Informed by {informedBy[c.id]} top-rated example
                        {informedBy[c.id] === 1 ? "" : "s"} from your library
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="pg-btn pg-btn--outline pg-btn--sm"
                    onClick={() => regenerateBriefsForConcept(c.id)}
                  >
                    Regenerate
                  </button>
                </div>
                <div className="grid gap-3">
                  {CONCEPT_VARIANTS.map((v) => {
                    const brief =
                      briefsByKey.get(briefKey(c.id, v)) ?? null;
                    const attempts =
                      attemptsByKey.get(variantKey(c.id, v)) ?? [];
                    const latest = attempts[0] ?? null;
                    return (
                      <BriefCard
                        key={`${c.id}:${v}`}
                        concept={c}
                        variant={v}
                        brief={brief}
                        latestGeneration={latest}
                        onBriefChange={replaceBrief}
                        onRegenerateConcept={() =>
                          regenerateBriefsForConcept(c.id)
                        }
                        onGenerateImage={() => generateImageForVariant(c.id, v)}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="gallery" className="space-y-6 pt-4">
          <div
            className="flex flex-wrap items-center justify-between gap-2"
            style={{
              border: "1.5px solid var(--line)",
              borderRadius: 4,
              background: "#fff",
              padding: "10px 12px",
            }}
          >
            <div className="pg-muted" style={{ fontSize: 12, maxWidth: "52ch" }}>
              Rate the images you like. High-rated briefs are used as
              few-shot examples the next time Claude writes briefs for
              the same concept.
            </div>
            <button
              type="button"
              className={`pg-chip ${topPerformersOnly ? "is-on" : ""}`}
              onClick={() => setTopPerformersOnly((v) => !v)}
            >
              {topPerformersOnly ? "Showing top only" : "Top Performers only"}
            </button>
          </div>
          {galleryConcepts.length === 0 ? (
            <div className="pg-empty">
              <div className="ix">
                <Icon name="grid" size={26} />
              </div>
              <h3>Empty wall</h3>
              <p>No images yet. Generate briefs, then images, to see them here.</p>
            </div>
          ) : (
            galleryConcepts.map((c) => {
              const cards = CONCEPT_VARIANTS.map((v) => {
                const attempts =
                  attemptsByKey.get(variantKey(c.id, v)) ?? [];
                const latest = attempts[0];
                if (!latest) return null;
                if (
                  topPerformersOnly &&
                  (latest.rating ?? 0) < 4 &&
                  !latest.is_favorited &&
                  !latest.used_in_ad
                ) {
                  return null;
                }
                return (
                  <GenerationCard
                    key={`${c.id}:${v}`}
                    conceptName={c.name}
                    latest={latest}
                    attempts={attempts}
                    onRegenerate={() => generateImageForVariant(c.id, v)}
                    onReReview={() => runReview(latest.id)}
                    onOverride={() => overrideGeneration(latest.id)}
                    onUnlock={() => unlockGeneration(latest.id)}
                    onRatingChange={applyRatingUpdate}
                    onRefined={applyRefinedGeneration}
                  />
                );
              }).filter(Boolean) as ReactElement[];

              if (cards.length === 0) return null;

              return (
                <div key={c.id} className="space-y-2">
                  <h2 className="pg-h2" style={{ fontSize: 18 }}>
                    {c.name}
                  </h2>
                  <div className="pg-wall cols-3" style={{ padding: 0 }}>
                    {cards}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="recreate" className="pt-4">
          <RecreateTab
            project={project}
            recreations={recreations}
            generations={generations}
            onRecreationCreated={applyRecreation}
            onGenerationsUpdated={mergeGenerations}
            onReviewGeneration={runReview}
            onOverrideGeneration={overrideGeneration}
            onUnlockGeneration={unlockGeneration}
            onRegenerateVariant={regenerateVariantImage}
            onRatingChange={applyRatingUpdate}
            onRefined={applyRefinedGeneration}
          />
        </TabsContent>

        <TabsContent value="competitor" className="pt-4">
          <CompetitorSpyTab
            project={project}
            concepts={concepts}
            enabledConceptIds={enabled}
            generations={generations}
            profile={profile}
            onProjectChange={setProject}
            onGenerationsUpdated={mergeGenerations}
            onProfileChange={setProfile}
            onReviewGeneration={runReview}
            onOverrideGeneration={overrideGeneration}
            onUnlockGeneration={unlockGeneration}
            onRatingChange={applyRatingUpdate}
            onRefined={applyRefinedGeneration}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
