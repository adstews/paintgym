"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ImageUploadField } from "./image-upload-field";
import { GenerationCard } from "@/components/gallery/generation-card";
import { VARIANT_DISPLAY, VARIANT_LABELS } from "@/lib/types";
import type {
  Generation,
  Project,
  Recreation,
  VariantLabel,
} from "@/lib/types";

interface Props {
  project: Project;
  recreations: Recreation[];
  generations: Generation[];
  onRecreationCreated: (
    recreation: Recreation,
    generations: Generation[],
  ) => void;
  onGenerationsUpdated: (generations: Generation[]) => void;
  onReviewGeneration: (generationId: string) => Promise<void>;
  onOverrideGeneration: (generationId: string) => Promise<void>;
  onUnlockGeneration: (generationId: string) => Promise<void>;
  onRegenerateVariant: (
    recreationId: string,
    variantLabel: VariantLabel,
    promptText: string,
  ) => Promise<void>;
  onRatingChange: (generation: Generation) => void;
  onRefined: (generation: Generation, newBalance?: number) => void;
}

function newerFirst(a: Generation, b: Generation): number {
  return b.version - a.version;
}

export function RecreateTab({
  project,
  recreations,
  generations,
  onRecreationCreated,
  onGenerationsUpdated,
  onReviewGeneration,
  onOverrideGeneration,
  onUnlockGeneration,
  onRegenerateVariant,
  onRatingChange,
  onRefined,
}: Props) {
  const [sourceUrls, setSourceUrls] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  const generationsByRecreation = useMemo(() => {
    const m = new Map<string, Generation[]>();
    for (const g of generations) {
      if (!g.recreation_id) continue;
      const arr = m.get(g.recreation_id) ?? [];
      arr.push(g);
      m.set(g.recreation_id, arr);
    }
    return m;
  }, [generations]);

  async function handleGenerate() {
    const source = sourceUrls[0];
    if (!source) {
      toast.error("Upload an example ad first");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/recreate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          source_image_url: source,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? json.error ?? "Recreate failed");
      }
      onRecreationCreated(json.recreation as Recreation, json.generations as Generation[]);
      const failures = (json.failures ?? []) as { label: string }[];
      if (failures.length > 0) {
        toast.error(
          `${failures.length} variant${failures.length === 1 ? "" : "s"} failed`,
        );
      } else {
        toast.success("Five variants ready");
      }
      // Kick off QA on each generation in parallel.
      const gens = json.generations as Generation[];
      void Promise.all(gens.map((g) => onReviewGeneration(g.id)));
      setSourceUrls([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Recreate failed");
    } finally {
      setGenerating(false);
    }
  }

  async function copyToConceptLibrary(
    variantLabel: VariantLabel,
    briefText: string,
  ) {
    try {
      const res = await fetch("/api/concepts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: `Recreation: ${VARIANT_DISPLAY[variantLabel]}`,
          description:
            "Saved from a recreation. Edit to introduce template variables before reusing across projects.",
          prompt_template: briefText,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? err.error ?? "Save failed");
      }
      toast.success("Saved to your concept library");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h2 className="text-base font-semibold">Recreate from example</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload an ad you like. Claude analyzes its creative framework and
              writes five briefs for your product, each taking a different
              angle. Then Gemini renders all five.
            </p>
          </div>

          <ImageUploadField
            label="Example ad image"
            urls={sourceUrls}
            onChange={setSourceUrls}
            folder={`recreations-${project.id}`}
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Product details and style settings from this project will be used
              for every variant.
            </p>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={generating || sourceUrls.length === 0}
            >
              {generating
                ? "Analyzing and generating..."
                : "Analyze and generate 5 versions"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {recreations.map((r) => {
        const recGens = generationsByRecreation.get(r.id) ?? [];
        return (
          <RecreationBlock
            key={r.id}
            recreation={r}
            generations={recGens}
            onReviewGeneration={onReviewGeneration}
            onOverrideGeneration={onOverrideGeneration}
            onUnlockGeneration={onUnlockGeneration}
            onRegenerateVariant={(label, prompt) =>
              onRegenerateVariant(r.id, label, prompt)
            }
            onCopy={copyToConceptLibrary}
            onGenerationsUpdated={onGenerationsUpdated}
            onRatingChange={onRatingChange}
            onRefined={onRefined}
          />
        );
      })}
    </div>
  );
}

interface BlockProps {
  recreation: Recreation;
  generations: Generation[];
  onReviewGeneration: (generationId: string) => Promise<void>;
  onOverrideGeneration: (generationId: string) => Promise<void>;
  onUnlockGeneration: (generationId: string) => Promise<void>;
  onRegenerateVariant: (
    label: VariantLabel,
    promptText: string,
  ) => Promise<void>;
  onCopy: (label: VariantLabel, briefText: string) => Promise<void>;
  onGenerationsUpdated: (generations: Generation[]) => void;
  onRatingChange: (generation: Generation) => void;
  onRefined: (generation: Generation, newBalance?: number) => void;
}

function RecreationBlock({
  recreation,
  generations,
  onReviewGeneration,
  onOverrideGeneration,
  onUnlockGeneration,
  onRegenerateVariant,
  onCopy,
  onRatingChange,
  onRefined,
}: BlockProps) {
  const [showAnalysis, setShowAnalysis] = useState(false);

  const groupedByVariant = useMemo(() => {
    const m = new Map<VariantLabel, Generation[]>();
    for (const g of generations) {
      if (!g.variant_label) continue;
      const label = g.variant_label as VariantLabel;
      const arr = m.get(label) ?? [];
      arr.push(g);
      m.set(label, arr);
    }
    for (const arr of m.values()) arr.sort(newerFirst);
    return m;
  }, [generations]);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-start">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md border bg-muted">
            <Image
              src={recreation.source_image_url}
              alt="Example ad"
              fill
              sizes="(min-width: 640px) 180px, 100vw"
              className="object-contain"
              unoptimized
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Original</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(recreation.created_at).toLocaleString()}
              </span>
            </div>
            {recreation.analysis ? (
              <div className="space-y-1">
                <button
                  type="button"
                  className="text-xs font-medium text-muted-foreground underline decoration-dotted"
                  onClick={() => setShowAnalysis((v) => !v)}
                >
                  {showAnalysis ? "Hide analysis" : "Show Claude's analysis"}
                </button>
                {showAnalysis && (
                  <p className="text-sm leading-relaxed">
                    {recreation.analysis}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Analysis not available.
              </p>
            )}
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {VARIANT_LABELS.map((label) => {
            const attempts = groupedByVariant.get(label) ?? [];
            const latest = attempts[0];
            if (!latest) {
              return (
                <Card key={label}>
                  <CardContent className="py-12 text-center text-xs text-muted-foreground">
                    {VARIANT_DISPLAY[label]} variant failed.
                  </CardContent>
                </Card>
              );
            }
            return (
              <div key={label} className="space-y-2">
                <GenerationCard
                  conceptName={VARIANT_DISPLAY[label]}
                  latest={latest}
                  attempts={attempts}
                  onRegenerate={() =>
                    onRegenerateVariant(label, latest.prompt_text)
                  }
                  onReReview={() => onReviewGeneration(latest.id)}
                  onOverride={() => onOverrideGeneration(latest.id)}
                  onUnlock={() => onUnlockGeneration(latest.id)}
                  onRatingChange={onRatingChange}
                  onRefined={onRefined}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => onCopy(label, latest.prompt_text)}
                >
                  Use as starting point
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
