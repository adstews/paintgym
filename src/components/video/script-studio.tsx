"use client";

import { useState } from "react";
import { toast } from "sonner";
import type {
  GeneratedScenePrompt,
  GeneratedScript,
  ProductDetails,
  VideoFormat,
} from "@/lib/video/types";
import { SCRIPT_STRUCTURE } from "@/lib/video/formats";
import { Icon } from "@/components/tf/ui";
import { CopyButton } from "./copy-button";

interface EditableScript extends GeneratedScript {
  key: string;
  favorite: boolean;
  saving: boolean;
  regenerating: boolean;
  scenePrompts: GeneratedScenePrompt[] | null;
  promptsLoading: boolean;
}

function decorate(s: GeneratedScript): EditableScript {
  return {
    ...s,
    key: crypto.randomUUID(),
    favorite: false,
    saving: false,
    regenerating: false,
    scenePrompts: null,
    promptsLoading: false,
  };
}

export function ScriptStudio({
  format,
  product,
  onProductChange,
  ensureProject,
}: {
  format: VideoFormat;
  product: ProductDetails;
  onProductChange: (p: ProductDetails) => void;
  // Lazily create (or return) the saved video_project id so favorites persist.
  ensureProject: () => Promise<string | null>;
}) {
  const [scripts, setScripts] = useState<EditableScript[]>([]);
  const [loading, setLoading] = useState(false);

  function setField(field: keyof ProductDetails, value: string) {
    onProductChange({ ...product, [field]: value });
  }

  async function callScripts(): Promise<GeneratedScript[]> {
    const res = await fetch("/api/video/generate-scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, product }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Generation failed");
    }
    return (data.scripts ?? []) as GeneratedScript[];
  }

  async function generateAll() {
    if (!product.product_name && !product.description) {
      toast.error("Add a product name or description first");
      return;
    }
    setLoading(true);
    try {
      const out = await callScripts();
      setScripts(out.map(decorate));
      toast.success(`Wrote ${out.length} scripts`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not write scripts");
    } finally {
      setLoading(false);
    }
  }

  function patch(key: string, next: Partial<EditableScript>) {
    setScripts((prev) =>
      prev.map((s) => (s.key === key ? { ...s, ...next } : s)),
    );
  }

  async function regenerateOne(item: EditableScript) {
    patch(item.key, { regenerating: true });
    try {
      const out = await callScripts();
      // Prefer a fresh script that matches this slot's angle, else the first.
      const match = out.find((s) => s.angle === item.angle) ?? out[0];
      if (match) {
        patch(item.key, {
          ...decorate(match),
          key: item.key,
          regenerating: false,
          favorite: item.favorite,
        });
        toast.success("Regenerated");
      } else {
        patch(item.key, { regenerating: false });
      }
    } catch (err) {
      patch(item.key, { regenerating: false });
      toast.error(err instanceof Error ? err.message : "Could not regenerate");
    }
  }

  async function toggleFavorite(item: EditableScript) {
    // Un-favoriting is local only; favoriting persists the script.
    if (item.favorite) {
      patch(item.key, { favorite: false });
      return;
    }
    patch(item.key, { saving: true });
    const videoProjectId = await ensureProject();
    if (!videoProjectId) {
      patch(item.key, { saving: false });
      toast.error("Could not save. Add a project name and try again.");
      return;
    }
    try {
      const res = await fetch("/api/video/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_project_id: videoProjectId,
          hook_text: item.hook,
          full_script: item.full_script,
          scene_breakdown: item.scenes,
          angle: item.angle,
          is_favorite: true,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      patch(item.key, { favorite: true, saving: false });
      toast.success("Saved to favorites");
    } catch {
      patch(item.key, { saving: false });
      toast.error("Could not save the script");
    }
  }

  async function makeScenePrompts(item: EditableScript) {
    if (item.scenes.length === 0) {
      toast.error("This script has no scenes to prompt");
      return;
    }
    patch(item.key, { promptsLoading: true });
    try {
      const res = await fetch("/api/video/generate-scene-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, scenes: item.scenes, product }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed");
      patch(item.key, {
        scenePrompts: (data.prompts ?? []) as GeneratedScenePrompt[],
        promptsLoading: false,
      });
      toast.success("Scene prompts ready");
    } catch (err) {
      patch(item.key, { promptsLoading: false });
      toast.error(err instanceof Error ? err.message : "Could not write prompts");
    }
  }

  return (
    <div className="vid-studio">
      {/* Product input */}
      <div className="vid-card">
        <div className="vid-card-head">
          <h3 className="pg-h2" style={{ fontSize: 18 }}>
            Product details
          </h3>
          <span className="pg-mono pg-muted" style={{ fontSize: 11 }}>
            Claude writes from this
          </span>
        </div>
        <div className="vid-form">
          <label className="vid-field">
            <span className="pg-field-label">Product name</span>
            <input
              className="pg-input"
              value={product.product_name ?? ""}
              onChange={(e) => setField("product_name", e.target.value)}
              placeholder="e.g. GlowSerum Vitamin C"
            />
          </label>
          <label className="vid-field">
            <span className="pg-field-label">Price</span>
            <input
              className="pg-input"
              value={product.price ?? ""}
              onChange={(e) => setField("price", e.target.value)}
              placeholder="e.g. 39 dollars"
            />
          </label>
          <label className="vid-field vid-field--wide">
            <span className="pg-field-label">Description</span>
            <textarea
              className="pg-input pg-textarea"
              value={product.description ?? ""}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="What the product is and what it does"
            />
          </label>
          <label className="vid-field vid-field--wide">
            <span className="pg-field-label">Key benefits</span>
            <textarea
              className="pg-input pg-textarea"
              value={product.benefits ?? ""}
              onChange={(e) => setField("benefits", e.target.value)}
              placeholder="The specific results a customer gets"
            />
          </label>
          <label className="vid-field vid-field--wide">
            <span className="pg-field-label">Target audience</span>
            <input
              className="pg-input"
              value={product.audience ?? ""}
              onChange={(e) => setField("audience", e.target.value)}
              placeholder="Who this ad is for"
            />
          </label>
        </div>
        <div className="vid-studio-actions">
          <button
            type="button"
            className="pg-btn pg-btn--pop pg-btn--md"
            onClick={generateAll}
            disabled={loading}
          >
            <Icon name="wand" size={16} />
            {loading ? "Writing 5 scripts" : "Generate 5 scripts"}
          </button>
          <div className="vid-structure">
            {SCRIPT_STRUCTURE.map((s) => (
              <span key={s.label} className="vid-structure-chip" title={s.note}>
                <b>{s.timecode}</b> {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading && scripts.length === 0 && (
        <div className="vid-empty">
          <Icon name="wand" size={24} />
          <p>Claude is writing 5 scripts across 5 test angles. One moment.</p>
        </div>
      )}

      {scripts.map((s, i) => (
        <ScriptCard
          key={s.key}
          index={i}
          item={s}
          onEdit={(text) => patch(s.key, { full_script: text })}
          onRegenerate={() => regenerateOne(s)}
          onFavorite={() => toggleFavorite(s)}
          onScenePrompts={() => makeScenePrompts(s)}
        />
      ))}
    </div>
  );
}

function ScriptCard({
  index,
  item,
  onEdit,
  onRegenerate,
  onFavorite,
  onScenePrompts,
}: {
  index: number;
  item: EditableScript;
  onEdit: (text: string) => void;
  onRegenerate: () => void;
  onFavorite: () => void;
  onScenePrompts: () => void;
}) {
  return (
    <div className="vid-script">
      <div className="vid-script-head">
        <div className="vid-script-tags">
          <span className="pg-badge pg-badge--ink">Angle {index + 1}</span>
          <span className="pg-badge pg-badge--pop">{item.angle_label}</span>
        </div>
        <div className="vid-script-acts">
          <button
            type="button"
            className={`pg-btn pg-btn--sm ${item.favorite ? "pg-btn--dark" : "pg-btn--outline"}`}
            onClick={onFavorite}
            disabled={item.saving}
          >
            <Icon name="star" size={14} />
            {item.favorite ? "Saved" : item.saving ? "Saving" : "Save"}
          </button>
          <button
            type="button"
            className="pg-btn pg-btn--outline pg-btn--sm"
            onClick={onRegenerate}
            disabled={item.regenerating}
          >
            <Icon name="refresh" size={14} />
            {item.regenerating ? "Working" : "Regenerate"}
          </button>
        </div>
      </div>

      <div className="vid-hook">
        <span className="pg-mono vid-hook-k">Hook 0-3s</span>
        <p className="vid-hook-text">{item.hook}</p>
      </div>

      {/* Split view: script left, scene prompts right */}
      <div className="vid-split">
        <div className="vid-split-col">
          <div className="vid-split-head">
            <span className="pg-mono vid-split-k">Script</span>
            <CopyButton text={item.full_script} />
          </div>
          <textarea
            className="pg-input pg-textarea vid-script-text"
            value={item.full_script}
            onChange={(e) => onEdit(e.target.value)}
          />
          <div className="vid-scenes">
            {item.scenes.map((sc) => (
              <div key={sc.scene_number} className="vid-scene-row">
                <span className="vid-scene-tc pg-mono">{sc.timecode}</span>
                <div className="vid-scene-tx">
                  <b>{sc.label}</b>
                  <span>{sc.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="vid-split-col">
          <div className="vid-split-head">
            <span className="pg-mono vid-split-k">Scene prompts</span>
            <button
              type="button"
              className="pg-btn pg-btn--outline pg-btn--sm"
              onClick={onScenePrompts}
              disabled={item.promptsLoading}
            >
              <Icon name="sparkle" size={14} />
              {item.promptsLoading
                ? "Writing"
                : item.scenePrompts
                  ? "Rewrite"
                  : "Generate prompts"}
            </button>
          </div>
          {!item.scenePrompts && !item.promptsLoading && (
            <p className="vid-split-hint pg-muted">
              Turn each scene into a ready video generation prompt for the right
              model.
            </p>
          )}
          {item.scenePrompts?.map((p) => (
            <div key={p.scene_number} className="vid-prompt vid-prompt--tight">
              <div className="vid-prompt-head">
                <span className="pg-mono vid-prompt-k">
                  Scene {p.scene_number} · {p.model}
                </span>
                <CopyButton text={p.prompt} />
              </div>
              <pre className="vid-prompt-body">{p.prompt}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
