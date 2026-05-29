"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GenerationCard } from "@/components/gallery/generation-card";
import { ProductDetailsForm } from "./product-details-form";
import { BriefCard } from "./brief-card";
import type { Brief, Concept, Generation, Project } from "@/lib/types";

interface Props {
  project: Project;
  concepts: Concept[];
  initialGenerations: Generation[];
  initialBriefs: Brief[];
  enabledConceptIds: Set<string>;
}

let tempCounter = 0;
function makeTempId(conceptId: string): string {
  tempCounter += 1;
  return `tmp-${conceptId}-${tempCounter}`;
}

export function ProjectWorkspace({
  project: initialProject,
  concepts,
  initialGenerations,
  initialBriefs,
  enabledConceptIds: initialEnabled,
}: Props) {
  const [project, setProject] = useState(initialProject);
  const [generations, setGenerations] = useState(initialGenerations);
  const [briefs, setBriefs] = useState(initialBriefs);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [batchBriefsLoading, setBatchBriefsLoading] = useState(false);
  const [batchImagesLoading, setBatchImagesLoading] = useState(false);

  const conceptsById = useMemo(
    () => new Map(concepts.map((c) => [c.id, c])),
    [concepts],
  );

  const enabledConcepts = useMemo(
    () => concepts.filter((c) => enabled.has(c.id)),
    [concepts, enabled],
  );

  const briefByConcept = useMemo(() => {
    const m = new Map<string, Brief>();
    for (const b of briefs) m.set(b.concept_id, b);
    return m;
  }, [briefs]);

  const latestByConcept = useMemo(() => {
    const map = new Map<string, Generation>();
    for (const g of generations) {
      const existing = map.get(g.concept_id);
      if (!existing || g.version > existing.version) map.set(g.concept_id, g);
    }
    return map;
  }, [generations]);

  function applyBriefs(newBriefs: Brief[]) {
    if (newBriefs.length === 0) return;
    const map = new Map(briefs.map((b) => [b.concept_id, b]));
    for (const b of newBriefs) map.set(b.concept_id, b);
    setBriefs(Array.from(map.values()));
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
    const failures = (json.failures ?? []) as { concept_id: string; message: string }[];
    if (failures.length > 0) {
      toast.error(
        `${failures.length} brief${failures.length === 1 ? "" : "s"} failed`,
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

  async function regenerateBrief(conceptId: string) {
    try {
      await generateBriefs([conceptId]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Regenerate failed");
    }
  }

  async function generateImageForConcept(conceptId: string) {
    const brief = briefByConcept.get(conceptId);
    if (!brief) {
      toast.error("Generate the brief first");
      return;
    }
    const tempId = makeTempId(conceptId);
    const placeholder: Generation = {
      id: tempId,
      project_id: project.id,
      concept_id: conceptId,
      prompt_text: brief.brief_text,
      image_url: null,
      status: "generating",
      version: (latestByConcept.get(conceptId)?.version ?? 0) + 1,
      created_at: new Date().toISOString(),
    };
    setGenerations((g) => [placeholder, ...g]);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          concept_id: conceptId,
          prompt_text: brief.brief_text,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Generation failed");
      setGenerations((g) =>
        g.map((row) =>
          row.id === tempId
            ? {
                ...row,
                id: json.id,
                image_url: json.image_url,
                status: "completed",
              }
            : row,
        ),
      );
    } catch (err) {
      setGenerations((g) =>
        g.map((row) =>
          row.id === tempId ? { ...row, status: "failed" } : row,
        ),
      );
      toast.error(err instanceof Error ? err.message : "Generation failed");
    }
  }

  async function generateAllImages() {
    setBatchImagesLoading(true);
    try {
      for (const c of enabledConcepts) {
        if (briefByConcept.get(c.id)) {
          await generateImageForConcept(c.id);
        }
      }
      toast.success("Batch complete");
    } finally {
      setBatchImagesLoading(false);
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
    const items = generations.filter((g) => g.image_url);
    if (items.length === 0) return;
    for (const g of items) {
      const concept = conceptsById.get(g.concept_id);
      if (!concept || !g.image_url) continue;
      const a = document.createElement("a");
      a.href = g.image_url;
      a.download = `${concept.name.toLowerCase().replace(/\s+/g, "-")}-v${g.version}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise((r) => setTimeout(r, 80));
    }
  }

  const briefsCount = enabledConcepts.filter((c) =>
    briefByConcept.has(c.id),
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>
          {(project.brand_name || project.client_name) && (
            <p className="text-sm text-muted-foreground">
              {project.brand_name ?? project.client_name}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={generateAllBriefs}
            disabled={batchBriefsLoading || enabledConcepts.length === 0}
          >
            {batchBriefsLoading
              ? "Writing briefs..."
              : `Generate briefs (${enabledConcepts.length})`}
          </Button>
          <Button
            onClick={generateAllImages}
            disabled={batchImagesLoading || briefsCount === 0}
          >
            {batchImagesLoading
              ? "Generating..."
              : `Generate images (${briefsCount})`}
          </Button>
          <Button
            variant="outline"
            onClick={downloadAll}
            disabled={generations.filter((g) => g.image_url).length === 0}
          >
            Download all
          </Button>
        </div>
      </div>

      <Tabs defaultValue="product">
        <TabsList>
          <TabsTrigger value="product">Product</TabsTrigger>
          <TabsTrigger value="concepts">Concepts</TabsTrigger>
          <TabsTrigger value="briefs">Briefs</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
        </TabsList>

        <TabsContent value="product" className="pt-4">
          <ProductDetailsForm
            project={project}
            onProjectChange={setProject}
          />
        </TabsContent>

        <TabsContent value="concepts" className="space-y-3 pt-4">
          <div className="text-sm text-muted-foreground">
            Toggle the concepts you want briefs and images for.
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {concepts.map((c) => {
              const on = enabled.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleConcept(c.id, !on)}
                  className={`text-left rounded-lg border p-3 transition ${
                    on
                      ? "border-foreground/40 bg-accent"
                      : "border-border hover:bg-accent/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{c.name}</span>
                    {on && <Badge>Enabled</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {c.description}
                  </p>
                </button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="briefs" className="space-y-4 pt-4">
          {enabledConcepts.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                Enable at least one concept to start writing briefs.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {enabledConcepts.map((c) => (
                <BriefCard
                  key={c.id}
                  concept={c}
                  brief={briefByConcept.get(c.id) ?? null}
                  latestGeneration={latestByConcept.get(c.id) ?? null}
                  onBriefChange={replaceBrief}
                  onRegenerate={() => regenerateBrief(c.id)}
                  onGenerateImage={() => generateImageForConcept(c.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="gallery" className="space-y-4 pt-4">
          {generations.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                No images yet. Generate briefs, then images, to see them here.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {generations.map((g) => {
                const concept = conceptsById.get(g.concept_id);
                if (!concept) return null;
                return (
                  <GenerationCard
                    key={g.id}
                    generation={g}
                    conceptName={concept.name}
                    onRegenerate={() => generateImageForConcept(g.concept_id)}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
