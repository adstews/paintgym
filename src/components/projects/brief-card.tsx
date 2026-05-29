"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Brief, Concept, Generation } from "@/lib/types";

interface Props {
  concept: Concept;
  brief: Brief | null;
  latestGeneration: Generation | null;
  onBriefChange: (next: Brief) => void;
  onRegenerate: () => Promise<void>;
  onGenerateImage: () => Promise<void>;
}

export function BriefCard({
  concept,
  brief,
  latestGeneration,
  onBriefChange,
  onRegenerate,
  onGenerateImage,
}: Props) {
  const [draft, setDraft] = useState(brief?.brief_text ?? "");
  const [dirty, setDirty] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [regen, setRegen] = useState(false);
  const [gen, setGen] = useState(false);
  const [expanded, setExpanded] = useState(false);

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
      await onRegenerate();
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
  const isGenerating = latestGeneration?.status === "generating";
  const status = latestGeneration?.status;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{concept.name}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {concept.description}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!hasBrief && <Badge variant="outline">No brief yet</Badge>}
            {hasBrief && dirty && <Badge variant="secondary">Unsaved</Badge>}
            {status === "completed" && <Badge>Image ready</Badge>}
            {status === "failed" && <Badge variant="destructive">Failed</Badge>}
            {isGenerating && <Badge variant="secondary">Generating</Badge>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {hasBrief ? (
          <Textarea
            rows={expanded ? 14 : 6}
            value={draft}
            onChange={(e) => handleEdit(e.target.value)}
            className="font-mono text-xs leading-relaxed"
          />
        ) : (
          <div className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
            Generate the briefs for this project to fill this in.
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-2 pt-0">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setExpanded((v) => !v)}
            disabled={!hasBrief}
          >
            {expanded ? "Collapse" : "Expand"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={saveEdit}
            disabled={!hasBrief || !dirty || savingEdit}
          >
            {savingEdit ? "Saving..." : "Save edit"}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleRegenerate}
            disabled={regen}
          >
            {regen ? "Regenerating..." : hasBrief ? "Regenerate brief" : "Generate brief"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleGenerate}
            disabled={!hasBrief || dirty || gen || isGenerating}
          >
            {gen || isGenerating ? "Generating..." : "Generate image"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
