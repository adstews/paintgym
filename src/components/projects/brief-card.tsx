"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type {
  Brief,
  Concept,
  ConceptVariant,
  Generation,
} from "@/lib/types";

interface Props {
  concept: Concept;
  variant: ConceptVariant;
  brief: Brief | null;
  latestGeneration: Generation | null;
  onBriefChange: (next: Brief) => void;
  onRegenerateConcept: () => Promise<void>;
  onGenerateImage: () => Promise<void>;
}

export function BriefCard({
  concept,
  brief,
  latestGeneration,
  onBriefChange,
  onRegenerateConcept,
  onGenerateImage,
}: Props) {
  const [draft, setDraft] = useState(brief?.brief_text ?? "");
  const [dirty, setDirty] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [regen, setRegen] = useState(false);
  const [gen, setGen] = useState(false);
  const [showFull, setShowFull] = useState(false);

  function handleEdit(next: string) {
    setDraft(next);
    setDirty(next !== (brief?.brief_text ?? ""));
  }

  async function saveEdit() {
    if (!brief) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/briefs/${brief.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brief_text: draft }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Save failed");
      }
      const { brief: updated } = await res.json();
      onBriefChange(updated as Brief);
      setDirty(false);
      toast.success("Brief saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRegenerate() {
    setRegen(true);
    try {
      await onRegenerateConcept();
    } finally {
      setRegen(false);
    }
  }

  async function handleGenerate() {
    setGen(true);
    try {
      await onGenerateImage();
    } finally {
      setGen(false);
    }
  }

  const hasBrief = brief !== null;
  const keyPoints = brief?.key_points ?? [];
  const hasSummary = Boolean(brief?.summary) || keyPoints.length > 0;
  const isGenerating = latestGeneration?.status === "generating";
  const qaStatus = latestGeneration?.qa_status;
  const isReviewing = qaStatus === "reviewing" || qaStatus === "rewriting";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm">Brief</CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            {!hasBrief && <Badge variant="outline">Empty</Badge>}
            {hasBrief && dirty && <Badge variant="secondary">Unsaved</Badge>}
            {isGenerating && <Badge variant="secondary">Generating</Badge>}
            {!isGenerating && qaStatus === "reviewing" && (
              <Badge variant="secondary">Reviewing</Badge>
            )}
            {!isGenerating && qaStatus === "rewriting" && (
              <Badge variant="secondary">Rewriting</Badge>
            )}
            {!isGenerating && qaStatus === "passed" && <Badge>Approved</Badge>}
            {!isGenerating && qaStatus === "overridden" && <Badge>Accepted</Badge>}
            {!isGenerating && qaStatus === "minor" && (
              <Badge variant="secondary">Minor issues</Badge>
            )}
            {!isGenerating && qaStatus === "major" && (
              <Badge variant="destructive">Flagged</Badge>
            )}
            {latestGeneration?.status === "failed" && (
              <Badge variant="destructive">Failed</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!hasBrief ? (
          <div className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
            Generate a brief for {concept.name}.
          </div>
        ) : hasSummary ? (
          <div className="space-y-3">
            {brief?.summary && (
              <p className="text-sm leading-relaxed">{brief.summary}</p>
            )}
            {keyPoints.length > 0 && (
              <ul className="space-y-1.5">
                {keyPoints.map((point, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-xs text-muted-foreground"
                  >
                    <span aria-hidden className="mt-px text-foreground">
                      •
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setShowFull((v) => !v)}
              className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
            >
              {showFull ? "Hide full brief" : "View full brief"}
            </button>
            {showFull && (
              <Textarea
                rows={12}
                value={draft}
                onChange={(e) => handleEdit(e.target.value)}
                className="font-mono text-xs leading-relaxed"
              />
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              rows={8}
              value={draft}
              onChange={(e) => handleEdit(e.target.value)}
              className="font-mono text-xs leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">
              Regenerate this brief to get a summary and key points.
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-2 pt-0">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={saveEdit}
          disabled={!hasBrief || !dirty || savingEdit}
        >
          {savingEdit ? "Saving..." : "Save edit"}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleRegenerate}
            disabled={regen}
            title="Regenerate this brief"
          >
            {regen ? "..." : "Regenerate"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleGenerate}
            disabled={!hasBrief || dirty || gen || isGenerating || isReviewing}
          >
            {gen || isGenerating
              ? "Generating..."
              : isReviewing
                ? "Reviewing..."
                : "Generate image"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
