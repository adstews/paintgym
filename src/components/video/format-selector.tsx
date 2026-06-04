"use client";

import { FORMATS } from "@/lib/video/formats";
import type { VideoFormat } from "@/lib/video/types";
import { Icon } from "@/components/tf/ui";

// The six format cards. Selecting one drives the rest of the workspace.
export function FormatSelector({
  selected,
  onSelect,
}: {
  selected: VideoFormat | null;
  onSelect: (f: VideoFormat) => void;
}) {
  return (
    <div className="vid-format-grid">
      {FORMATS.map((f) => {
        const active = selected === f.key;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onSelect(f.key)}
            className={`vid-format-card ${active ? "is-on" : ""}`}
            aria-pressed={active}
          >
            <div className="vid-format-top">
              <span className="vid-format-ix">
                <Icon name={f.icon} size={20} />
              </span>
              <span className="pg-badge pg-badge--outline">{f.cost}</span>
            </div>
            <h3 className="vid-format-name">{f.name}</h3>
            <p className="vid-format-tag">{f.tagline}</p>
            <p className="vid-format-desc">{f.description}</p>
            <div className="vid-format-meta">
              <div className="vid-format-row">
                <span className="vid-k">Tools</span>
                <span className="vid-v">{f.tools.join(", ")}</span>
              </div>
              <div className="vid-format-row">
                <span className="vid-k">Best for</span>
                <span className="vid-v">{f.bestFor.join(", ")}</span>
              </div>
            </div>
            <span className={`vid-format-cta ${active ? "is-on" : ""}`}>
              {active ? "Selected" : "Start"}
              <Icon name="arrow" size={15} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
