"use client";

import { useState } from "react";
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
    <div className="pg-form-card" style={{ marginTop: 0 }}>
      <div className="flex items-start justify-between gap-3 mb12">
        <span className="pg-field-label" style={{ marginBottom: 0 }}>
          Brief
        </span>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {!hasBrief && <span className="pg-badge pg-badge--outline">Empty</span>}
          {hasBrief && dirty && (
            <span className="pg-badge pg-badge--outline">Unsaved</span>
          )}
          {isGenerating && (
            <span className="pg-badge pg-badge--outline">Generating</span>
          )}
          {!isGenerating && qaStatus === "reviewing" && (
            <span className="pg-badge pg-badge--outline">Reviewing</span>
          )}
          {!isGenerating && qaStatus === "rewriting" && (
            <span className="pg-badge pg-badge--outline">Rewriting</span>
          )}
          {!isGenerating && qaStatus === "passed" && (
            <span className="pg-badge pg-badge--pop">Approved</span>
          )}
          {!isGenerating && qaStatus === "overridden" && (
            <span className="pg-badge pg-badge--ink">Accepted</span>
          )}
          {!isGenerating && qaStatus === "minor" && (
            <span className="pg-badge pg-badge--outline">Minor issues</span>
          )}
          {!isGenerating && qaStatus === "major" && (
            <span className="pg-badge pg-badge--red">Flagged</span>
          )}
          {latestGeneration?.status === "failed" && (
            <span className="pg-badge pg-badge--red">Failed</span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {!hasBrief ? (
          <div
            className="pg-ph"
            style={{
              padding: "32px 16px",
              borderRadius: 3,
              textAlign: "center",
            }}
          >
            <span>Generate a brief for {concept.name}.</span>
          </div>
        ) : hasSummary ? (
          <div className="space-y-3">
            {brief?.summary && (
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                {brief.summary}
              </p>
            )}
            {keyPoints.length > 0 && (
              <ul className="space-y-1.5">
                {keyPoints.map((point, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    <span
                      aria-hidden
                      className="mt-px"
                      style={{ color: "var(--pop-deep)" }}
                    >
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
              className="pg-mono"
              style={{
                fontSize: 10.5,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "var(--muted)",
                background: "none",
                border: 0,
                cursor: "pointer",
                textDecorationLine: "underline",
                textUnderlineOffset: 2,
              }}
            >
              {showFull ? "Hide full brief" : "View full brief"}
            </button>
            {showFull && (
              <textarea
                rows={12}
                value={draft}
                onChange={(e) => handleEdit(e.target.value)}
                className="pg-input pg-textarea pg-mono"
                style={{ fontSize: 12, lineHeight: 1.5 }}
              />
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              rows={8}
              value={draft}
              onChange={(e) => handleEdit(e.target.value)}
              className="pg-input pg-textarea pg-mono"
              style={{ fontSize: 12, lineHeight: 1.5 }}
            />
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Regenerate this brief to get a summary and key points.
            </p>
          </div>
        )}
      </div>

      <div className="pg-div" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="pg-btn pg-btn--outline pg-btn--sm"
          onClick={saveEdit}
          disabled={!hasBrief || !dirty || savingEdit}
        >
          {savingEdit ? "Saving..." : "Save edit"}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="pg-btn pg-btn--outline pg-btn--sm"
            onClick={handleRegenerate}
            disabled={regen}
            title="Regenerate this brief"
          >
            {regen ? "..." : "Regenerate"}
          </button>
          <button
            type="button"
            className="pg-btn pg-btn--pop pg-btn--sm"
            onClick={handleGenerate}
            disabled={!hasBrief || dirty || gen || isGenerating || isReviewing}
          >
            {gen || isGenerating
              ? "Generating..."
              : isReviewing
                ? "Reviewing..."
                : "Generate image"}
          </button>
        </div>
      </div>
    </div>
  );
}
