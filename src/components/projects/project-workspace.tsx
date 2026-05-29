"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { GenerationCard } from "@/components/gallery/generation-card";
import { fillTemplate } from "@/lib/prompt";
import type { Concept, Generation, Project } from "@/lib/types";

interface Props {
  project: Project;
  concepts: Concept[];
  initialGenerations: Generation[];
  enabledConceptIds: Set<string>;
}

export function ProjectWorkspace({
  project: initialProject,
  concepts,
  initialGenerations,
  enabledConceptIds: initialEnabled,
}: Props) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [generations, setGenerations] = useState(initialGenerations);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [batchLoading, setBatchLoading] = useState(false);
  const [, startTransition] = useTransition();

  const conceptsById = useMemo(
    () => new Map(concepts.map((c) => [c.id, c])),
    [concepts],
  );

  const enabledConcepts = useMemo(
    () => concepts.filter((c) => enabled.has(c.id)),
    [concepts, enabled],
  );

  const latestByConcept = useMemo(() => {
    const map = new Map<string, Generation>();
    for (const g of generations) {
      const existing = map.get(g.concept_id);
      if (!existing || g.version > existing.version) map.set(g.concept_id, g);
    }
    return map;
  }, [generations]);

  async function generateOne(conceptId: string) {
    const concept = conceptsById.get(conceptId);
    if (!concept) return;
    const prompt_text = fillTemplate(concept.prompt_template, project);

    const tempId = `tmp-${conceptId}-${Date.now()}`;
    const placeholder: Generation = {
      id: tempId,
      project_id: project.id,
      concept_id: conceptId,
      prompt_text,
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
          prompt_text,
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

  async function generateAll() {
    setBatchLoading(true);
    try {
      for (const c of enabledConcepts) {
        if (!latestByConcept.get(c.id)) await generateOne(c.id);
      }
      toast.success("Batch complete");
    } finally {
      setBatchLoading(false);
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

  async function rescrape() {
    if (!project.product_url) return;
    const res = await fetch("/api/scrape", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: project.product_url,
        project_id: project.id,
      }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setProject({ ...project, product_data: data });
      toast.success("Product data refreshed");
    } else {
      toast.error("Refresh failed");
    }
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

  async function updateProductMeta(patch: Partial<Project>) {
    setProject((p) => ({ ...p, ...patch }));
    startTransition(async () => {
      await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      router.refresh();
    });
  }

  const productData = project.product_data ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>
          {project.client_name && (
            <p className="text-sm text-muted-foreground">{project.client_name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadAll} disabled={generations.length === 0}>
            Download all
          </Button>
          <Button onClick={generateAll} disabled={batchLoading || enabledConcepts.length === 0}>
            {batchLoading ? "Generating..." : `Generate ${enabledConcepts.length}`}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="gallery">
        <TabsList>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
          <TabsTrigger value="concepts">Concepts</TabsTrigger>
          <TabsTrigger value="product">Product</TabsTrigger>
        </TabsList>

        <TabsContent value="gallery" className="space-y-4 pt-4">
          {generations.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                No images yet. Enable concepts and hit Generate.
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
                    onRegenerate={() => generateOne(g.concept_id)}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="concepts" className="space-y-3 pt-4">
          <div className="text-sm text-muted-foreground">
            Toggle the concepts you want to include in this project.
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

        <TabsContent value="product" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Product source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="prod-url">Product URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="prod-url"
                    value={project.product_url ?? ""}
                    onChange={(e) =>
                      setProject({ ...project, product_url: e.target.value })
                    }
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      updateProductMeta({ product_url: project.product_url })
                    }
                  >
                    Save
                  </Button>
                  <Button variant="outline" onClick={rescrape} disabled={!project.product_url}>
                    Rescrape
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="logo-url">Logo URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="logo-url"
                    value={project.logo_url ?? ""}
                    onChange={(e) =>
                      setProject({ ...project, logo_url: e.target.value })
                    }
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      updateProductMeta({ logo_url: project.logo_url })
                    }
                  >
                    Save
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <Field label="Name" value={productData.name} />
                <Field label="Price" value={productData.price} />
                <Field
                  label="Description"
                  value={productData.description}
                  className="sm:col-span-2"
                />
                <Field
                  label="Features"
                  value={(productData.features ?? []).join(", ")}
                  className="sm:col-span-2"
                />
              </div>
              <div className="space-y-2">
                <Label>Manual notes</Label>
                <Textarea
                  rows={3}
                  defaultValue={productData.description ?? ""}
                  onBlur={(e) =>
                    updateProductMeta({
                      product_data: {
                        ...productData,
                        description: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({
  label,
  value,
  className = "",
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
}
