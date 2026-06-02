"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Btn, Badge } from "@/components/tf/ui";
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
    <div className="pg-pad" style={{ paddingTop: 16 }}>
      <div
        className="pg-mono pg-muted"
        style={{
          fontSize: 11,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {"// recreate from an example you love"}
      </div>
      <div className="pg-h2">Recreate from example</div>
      <p className="pg-muted" style={{ fontSize: 13.5, marginTop: 10, maxWidth: "46ch" }}>
        Upload an ad you like. Claude analyzes its creative framework and writes
        five briefs for your product, each taking a different angle. Then Gemini
        renders all five.
      </p>

      <div className="pg-form-card" style={{ marginTop: 16 }}>
        <div className="pg-form-row">
          <ImageUploadField
            label="Example ad image"
            urls={sourceUrls}
            onChange={setSourceUrls}
            folder={`recreations-${project.id}`}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <p className="pg-muted" style={{ fontSize: 11.5, lineHeight: 1.4, maxWidth: "40ch" }}>
            Product details and style settings from this project will be used
            for every variant.
          </p>
          <Btn
            type="button"
            variant="pop"
            icon="bolt"
            onClick={handleGenerate}
            disabled={generating || sourceUrls.length === 0}
          >
            {generating
              ? "Analyzing and generating..."
              : "Analyze and generate 5 versions"}
          </Btn>
        </div>
      </div>

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
    <div className="pg-form-card" style={{ marginTop: 18 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "180px 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "4/5",
            overflow: "hidden",
            borderRadius: 3,
            border: "1.5px solid var(--ink)",
            background: "#eceae3",
          }}
        >
          <Image
            src={recreation.source_image_url}
            alt="Example ad"
            fill
            sizes="(min-width: 640px) 180px, 100vw"
            className="object-contain"
            unoptimized
          />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Badge tone="ink">Original</Badge>
            <span className="pg-mono pg-muted" style={{ fontSize: 10.5 }}>
              {new Date(recreation.created_at).toLocaleString()}
            </span>
          </div>
          {recreation.analysis ? (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                className="pg-mono pg-muted"
                style={{
                  fontSize: 11,
                  letterSpacing: ".04em",
                  textTransform: "uppercase",
                  textDecoration: "underline",
                  textDecorationStyle: "dotted",
                  background: "none",
                  border: 0,
                  padding: 0,
                  cursor: "pointer",
                }}
                onClick={() => setShowAnalysis((v) => !v)}
              >
                {showAnalysis ? "Hide analysis" : "Show Claude's analysis"}
              </button>
              {showAnalysis && (
                <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
                  {recreation.analysis}
                </p>
              )}
            </div>
          ) : (
            <p className="pg-muted" style={{ marginTop: 8, fontSize: 13 }}>
              Analysis not available.
            </p>
          )}
        </div>
      </div>

      <div className="pg-div">
        <span>Recreated · 5 takes</span>
      </div>

      <div className="pg-wall cols-2" style={{ padding: 0 }}>
        {VARIANT_LABELS.map((label) => {
          const attempts = groupedByVariant.get(label) ?? [];
          const latest = attempts[0];
          if (!latest) {
            return (
              <div
                key={label}
                className="pg-mono pg-muted"
                style={{
                  border: "1.5px solid var(--line)",
                  borderRadius: 4,
                  padding: "32px 16px",
                  textAlign: "center",
                  fontSize: 10.5,
                  letterSpacing: ".04em",
                  textTransform: "uppercase",
                  background: "#fff",
                }}
              >
                {VARIANT_DISPLAY[label]} variant failed.
              </div>
            );
          }
          return (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
              <Btn
                type="button"
                size="sm"
                variant="outline"
                className="pg-btn--block"
                onClick={() => onCopy(label, latest.prompt_text)}
              >
                Use as starting point
              </Btn>
            </div>
          );
        })}
      </div>
    </div>
  );
}
