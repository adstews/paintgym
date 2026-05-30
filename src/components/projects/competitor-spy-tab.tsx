"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { GenerationCard } from "@/components/gallery/generation-card";
import {
  CONCEPT_VARIANT_DISPLAY,
  CONCEPT_VARIANTS,
} from "@/lib/types";
import type {
  CompetitorData,
  Concept,
  ConceptVariant,
  Generation,
  Project,
  UserProfile,
} from "@/lib/types";

interface Props {
  project: Project;
  concepts: Concept[];
  enabledConceptIds: Set<string>;
  generations: Generation[];
  profile: UserProfile;
  onProjectChange: (project: Project) => void;
  onGenerationsUpdated: (generations: Generation[]) => void;
  onProfileChange: (profile: UserProfile) => void;
  onReviewGeneration: (generationId: string) => Promise<void>;
  onOverrideGeneration: (generationId: string) => Promise<void>;
  onUnlockGeneration: (generationId: string) => Promise<void>;
  onRatingChange: (generation: Generation) => void;
  onRefined: (generation: Generation, newBalance?: number) => void;
}

function newerFirst(a: Generation, b: Generation): number {
  return b.version - a.version;
}

function variantKey(conceptId: string, variant: ConceptVariant): string {
  return `${conceptId}:${variant}`;
}

export function CompetitorSpyTab({
  project,
  concepts,
  enabledConceptIds,
  generations,
  profile,
  onProjectChange,
  onGenerationsUpdated,
  onProfileChange,
  onReviewGeneration,
  onOverrideGeneration,
  onUnlockGeneration,
  onRatingChange,
  onRefined,
}: Props) {
  const [url, setUrl] = useState("");
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(enabledConceptIds),
  );
  const [loading, setLoading] = useState(false);

  const competitor = project.competitor_data;

  const competitiveByKey = useMemo(() => {
    const map = new Map<string, Generation[]>();
    for (const g of generations) {
      if (!g.is_competitive || !g.concept_id || !g.concept_variant) continue;
      const key = variantKey(g.concept_id, g.concept_variant as ConceptVariant);
      const arr = map.get(key) ?? [];
      arr.push(g);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort(newerFirst);
    return map;
  }, [generations]);

  const conceptsById = useMemo(
    () => new Map(concepts.map((c) => [c.id, c])),
    [concepts],
  );

  const competitiveConcepts = useMemo(
    () =>
      concepts.filter((c) =>
        CONCEPT_VARIANTS.some((v) => competitiveByKey.has(variantKey(c.id, v))),
      ),
    [concepts, competitiveByKey],
  );

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGenerate() {
    if (!url.trim()) {
      toast.error("Paste a competitor URL first");
      return;
    }
    if (picked.size === 0) {
      toast.error("Pick at least one concept");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/competitor-spy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          competitor_url: url.trim(),
          concept_ids: Array.from(picked),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          toast.error(json.message ?? "Out of credits");
        } else {
          throw new Error(json.message ?? json.error ?? "Competitor spy failed");
        }
        return;
      }
      if (json.competitor) {
        onProjectChange({
          ...project,
          competitor_data: json.competitor as CompetitorData,
        });
      }
      const newGens = (json.generations ?? []) as Generation[];
      if (newGens.length > 0) onGenerationsUpdated(newGens);
      if (typeof json.new_balance === "number") {
        onProfileChange({ ...profile, credit_balance: json.new_balance });
      }
      const briefFailures = (json.brief_failures ?? []) as { message: string }[];
      const renderFailures = (json.render_failures ?? []) as { message: string }[];
      const totalFail = briefFailures.length + renderFailures.length;
      if (totalFail > 0) {
        toast.error(
          `${totalFail} brief${totalFail === 1 ? "" : "s"} failed`,
        );
      } else {
        toast.success(`Generated ${newGens.length} competitive ads`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Competitor spy failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h2 className="text-base font-semibold">Competitor Spy</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste a competitor product URL. Claude reads their page, then
              writes briefs that position your product directly against
              theirs. Costs 1 credit per generated image.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="competitor-url">Competitor URL</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="competitor-url"
                type="url"
                placeholder="https://competitor.com/product/their-thing"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={loading || !url.trim() || picked.size === 0}
              >
                {loading ? "Scraping and generating..." : "Generate competitive ads"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Concepts to attack with</Label>
              <span className="text-xs text-muted-foreground">
                {picked.size} selected
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {concepts.map((c) => {
                const on = picked.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => togglePick(c.id)}
                    className={`text-left rounded-lg border p-3 transition ${
                      on
                        ? "border-foreground/40 bg-accent"
                        : "border-border hover:bg-accent/40"
                    }`}
                    disabled={loading}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{c.name}</span>
                      {on && <Badge>Selected</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {c.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {competitor && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Badge variant="outline">Your product</Badge>
                <h3 className="text-sm font-semibold">
                  {project.product_name ??
                    project.product_data?.name ??
                    project.brand_name ??
                    "Unnamed product"}
                </h3>
                {project.price_point && (
                  <p className="text-xs text-muted-foreground">
                    Price: {project.price_point}
                  </p>
                )}
                {project.product_description && (
                  <p className="line-clamp-4 text-xs">
                    {project.product_description}
                  </p>
                )}
                {project.key_selling_points && (
                  <div className="text-xs">
                    <span className="font-medium">Key selling points: </span>
                    {project.key_selling_points}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Badge variant="secondary">Competitor</Badge>
                <h3 className="text-sm font-semibold">
                  {competitor.brand ?? competitor.name ?? "Unknown brand"}
                </h3>
                {competitor.name && competitor.brand !== competitor.name && (
                  <p className="text-xs text-muted-foreground">
                    Product: {competitor.name}
                  </p>
                )}
                {competitor.price && (
                  <p className="text-xs text-muted-foreground">
                    Price: {competitor.price}
                  </p>
                )}
                {competitor.description && (
                  <p className="line-clamp-4 text-xs">
                    {competitor.description}
                  </p>
                )}
                {competitor.features && competitor.features.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {competitor.features.slice(0, 5).map((f, i) => (
                      <li key={i} className="line-clamp-1">
                        • {f}
                      </li>
                    ))}
                  </ul>
                )}
                {competitor.images?.[0] && (
                  <div className="relative mt-2 aspect-[4/5] w-24 overflow-hidden rounded-md border bg-muted">
                    <Image
                      src={competitor.images[0]}
                      alt={competitor.name ?? "Competitor"}
                      fill
                      sizes="96px"
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {competitiveConcepts.length > 0 && (
        <div className="space-y-4">
          <Separator />
          <div>
            <h2 className="text-base font-semibold">Competitive gallery</h2>
            <p className="text-xs text-muted-foreground">
              Ads written to position your product against{" "}
              {competitor?.brand ?? competitor?.name ?? "the competitor"}.
            </p>
          </div>
          {competitiveConcepts.map((c) => {
            const concept = conceptsById.get(c.id);
            if (!concept) return null;
            return (
              <div key={c.id} className="space-y-2">
                <h3 className="text-sm font-semibold">{concept.name}</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {CONCEPT_VARIANTS.map((v) => {
                    const attempts =
                      competitiveByKey.get(variantKey(c.id, v)) ?? [];
                    const latest = attempts[0];
                    if (!latest) return null;
                    return (
                      <GenerationCard
                        key={`${c.id}:${v}`}
                        conceptName={`${concept.name} - ${CONCEPT_VARIANT_DISPLAY[v]}`}
                        latest={latest}
                        attempts={attempts}
                        onRegenerate={async () => {
                          toast.message(
                            "Re-run Competitor Spy to regenerate competitive briefs",
                          );
                        }}
                        onReReview={() => onReviewGeneration(latest.id)}
                        onOverride={() => onOverrideGeneration(latest.id)}
                        onUnlock={() => onUnlockGeneration(latest.id)}
                        onRatingChange={onRatingChange}
                        onRefined={onRefined}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
