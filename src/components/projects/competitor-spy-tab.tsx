"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Btn, Badge, Icon } from "@/components/tf/ui";
import { GenerationCard } from "@/components/gallery/generation-card";
import { CONCEPT_VARIANTS } from "@/lib/types";
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
        {"// spy on a competitor and position against them"}
      </div>
      <div className="pg-h2">Competitor Spy</div>
      <p className="pg-muted" style={{ fontSize: 13.5, marginTop: 10, maxWidth: "46ch" }}>
        Paste a competitor product URL. Claude reads their page, then writes
        briefs that position your product directly against theirs. Costs 1
        credit per generated image.
      </p>

      <div className="pg-pastebox">
        <div className="row">
          <Icon name="target" size={17} />
          <input
            id="competitor-url"
            type="url"
            placeholder="https://competitor.com/product/their-thing"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
          <Btn
            type="button"
            variant="pop"
            size="sm"
            iconR="arrow"
            onClick={handleGenerate}
            disabled={loading || !url.trim() || picked.size === 0}
          >
            {loading ? "Scraping and generating..." : "Generate competitive ads"}
          </Btn>
        </div>
        <div className="hint">{"// reads their page · writes briefs that attack their product"}</div>
      </div>

      <div className="pg-control-block">
        <div className="lab">
          <span>Concepts to attack with</span>
          <b>{picked.size} selected</b>
        </div>
        <div className="pg-grid2">
          {concepts.map((c) => {
            const on = picked.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => togglePick(c.id)}
                disabled={loading}
                style={{
                  textAlign: "left",
                  border: `1.5px solid ${on ? "var(--ink)" : "var(--line)"}`,
                  borderRadius: 4,
                  padding: 12,
                  background: on ? "var(--pop)" : "#fff",
                  color: "var(--ink)",
                  cursor: loading ? "default" : "pointer",
                  transition: "background .15s, border-color .15s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--headline)",
                      fontWeight: 800,
                      fontSize: 13.5,
                      letterSpacing: "-.01em",
                    }}
                  >
                    {c.name}
                  </span>
                  {on && (
                    <Badge tone="ink">
                      <Icon name="check" size={11} sw={3} /> Selected
                    </Badge>
                  )}
                </div>
                <p
                  className="pg-muted"
                  style={{
                    marginTop: 5,
                    fontSize: 11.5,
                    lineHeight: 1.35,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {c.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {competitor && (
        <div className="pg-form-card" style={{ marginTop: 18 }}>
          <div className="pg-grid2">
            <div>
              <Badge tone="outline">Your product</Badge>
              <h3
                style={{
                  fontFamily: "var(--headline)",
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: "-.01em",
                  marginTop: 8,
                }}
              >
                {project.product_name ??
                  project.product_data?.name ??
                  project.brand_name ??
                  "Unnamed product"}
              </h3>
              {project.price_point && (
                <p className="pg-muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                  Price: {project.price_point}
                </p>
              )}
              {project.product_description && (
                <p
                  style={{
                    fontSize: 11.5,
                    marginTop: 4,
                    lineHeight: 1.4,
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {project.product_description}
                </p>
              )}
              {project.key_selling_points && (
                <div style={{ fontSize: 11.5, marginTop: 6, lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 700 }}>Key selling points: </span>
                  {project.key_selling_points}
                </div>
              )}
            </div>
            <div>
              <Badge tone="pop">Competitor</Badge>
              <h3
                style={{
                  fontFamily: "var(--headline)",
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: "-.01em",
                  marginTop: 8,
                }}
              >
                {competitor.brand ?? competitor.name ?? "Unknown brand"}
              </h3>
              {competitor.name && competitor.brand !== competitor.name && (
                <p className="pg-muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                  Product: {competitor.name}
                </p>
              )}
              {competitor.price && (
                <p className="pg-muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                  Price: {competitor.price}
                </p>
              )}
              {competitor.description && (
                <p
                  style={{
                    fontSize: 11.5,
                    marginTop: 4,
                    lineHeight: 1.4,
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {competitor.description}
                </p>
              )}
              {competitor.features && competitor.features.length > 0 && (
                <ul style={{ marginTop: 6, fontSize: 11.5, lineHeight: 1.5 }}>
                  {competitor.features.slice(0, 5).map((f, i) => (
                    <li
                      key={i}
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      • {f}
                    </li>
                  ))}
                </ul>
              )}
              {competitor.images?.[0] && (
                <div
                  style={{
                    position: "relative",
                    marginTop: 8,
                    width: 96,
                    aspectRatio: "4/5",
                    overflow: "hidden",
                    borderRadius: 3,
                    border: "1.5px solid var(--ink)",
                    background: "#eceae3",
                  }}
                >
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
        </div>
      )}

      {competitiveConcepts.length > 0 && (
        <>
          <div className="pg-div">
            <span>
              Competitive gallery · vs{" "}
              {competitor?.brand ?? competitor?.name ?? "the competitor"}
            </span>
          </div>
          {competitiveConcepts.map((c) => {
            const concept = conceptsById.get(c.id);
            if (!concept) return null;
            return (
              <div key={c.id} style={{ marginBottom: 18 }}>
                <h3
                  style={{
                    fontFamily: "var(--headline)",
                    fontWeight: 800,
                    fontSize: 14,
                    letterSpacing: "-.01em",
                    marginBottom: 8,
                  }}
                >
                  {concept.name}
                </h3>
                <div className="pg-wall cols-2" style={{ padding: 0 }}>
                  {CONCEPT_VARIANTS.map((v) => {
                    const attempts =
                      competitiveByKey.get(variantKey(c.id, v)) ?? [];
                    const latest = attempts[0];
                    if (!latest) return null;
                    return (
                      <GenerationCard
                        key={`${c.id}:${v}`}
                        conceptName={concept.name}
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
        </>
      )}
    </div>
  );
}
