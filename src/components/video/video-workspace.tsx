"use client";

import { useRef, useState } from "react";
import { FORMATS, getFormat } from "@/lib/video/formats";
import { WORKFLOWS, getWorkflow } from "@/lib/video/workflows";
import type { ProductDetails, VideoFormat } from "@/lib/video/types";
import { Icon, Segmented } from "@/components/tf/ui";
import { FormatSelector } from "./format-selector";
import { WorkflowStepper } from "./workflow-stepper";
import { ScriptStudio } from "./script-studio";
import { IntegrationsPanel } from "./integrations-panel";

type View = "workflow" | "studio" | "tools";

export function VideoWorkspace() {
  const [format, setFormat] = useState<VideoFormat | null>(null);
  const [view, setView] = useState<View>("workflow");
  const [product, setProduct] = useState<ProductDetails>({});

  // Lazily created video_project id, so favorites and scenes can persist.
  const projectIdRef = useRef<string | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);

  async function ensureProject(): Promise<string | null> {
    if (projectIdRef.current) return projectIdRef.current;
    if (!format) return null;
    setCreatingProject(true);
    try {
      const res = await fetch("/api/video/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.product_name?.trim() || "Untitled video ad",
          format,
          product_details: product,
        }),
      });
      const data = await res.json();
      if (!res.ok) return null;
      projectIdRef.current = data.video_project?.id ?? null;
      return projectIdRef.current;
    } catch {
      return null;
    } finally {
      setCreatingProject(false);
    }
  }

  const spec = format ? getFormat(format) : null;
  const workflows = spec
    ? spec.workflowIds.map((id) => getWorkflow(id)).filter(Boolean)
    : [];

  return (
    <div className="vid-root">
      <header className="vid-header">
        <div>
          <div className="pg-h2" style={{ fontSize: 26 }}>
            Video studio
          </div>
          <p className="pg-mono vid-sub">
            AI video ad workflows · {FORMATS.length} formats · {WORKFLOWS.length}{" "}
            production methods
          </p>
        </div>
        {spec && (
          <button
            type="button"
            className="pg-btn pg-btn--ghost pg-btn--sm"
            onClick={() => setFormat(null)}
          >
            <Icon name="back" size={15} />
            Change format
          </button>
        )}
      </header>

      {!format && (
        <section className="vid-section">
          <div className="pg-section-k">
            <b>Pick a format</b> to start a workflow
          </div>
          <FormatSelector selected={format} onSelect={(f) => setFormat(f)} />
        </section>
      )}

      {format && spec && (
        <>
          <div className="vid-active-bar">
            <span className="vid-active-ix">
              <Icon name={spec.icon} size={18} />
            </span>
            <div className="vid-active-tx">
              <b>{spec.name}</b>
              <span>{spec.tagline}</span>
            </div>
            <div className="vid-active-views">
              <Segmented
                value={view}
                onChange={(v) => setView(v as View)}
                options={[
                  { v: "workflow", label: "Workflow", icon: "flag" },
                  { v: "studio", label: "Script studio", icon: "wand" },
                  { v: "tools", label: "Tools", icon: "link" },
                ]}
              />
            </div>
          </div>

          {view === "workflow" && (
            <section className="vid-section vid-workflows">
              {workflows.map(
                (w) => w && <WorkflowStepper key={w.id} workflow={w} />,
              )}
            </section>
          )}

          {view === "studio" && (
            <section className="vid-section">
              <ScriptStudio
                format={format}
                product={product}
                onProductChange={setProduct}
                ensureProject={ensureProject}
              />
              {creatingProject && (
                <p className="pg-mono pg-muted" style={{ fontSize: 11 }}>
                  Saving project...
                </p>
              )}
            </section>
          )}

          {view === "tools" && (
            <section className="vid-section">
              <IntegrationsPanel />
            </section>
          )}
        </>
      )}
    </div>
  );
}
