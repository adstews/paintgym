"use client";

import { toast } from "sonner";
import { INTEGRATIONS } from "@/lib/video/workflows";
import { Icon } from "@/components/tf/ui";

// Placeholder connection cards for the external tools the section will call
// once APIs are wired up. Everything reads "Not connected" for now.
export function IntegrationsPanel() {
  return (
    <div className="vid-int">
      <div className="vid-int-intro">
        <h3 className="pg-h2" style={{ fontSize: 18 }}>
          Connect your tools
        </h3>
        <p className="pg-muted" style={{ fontSize: 13.5, marginTop: 6 }}>
          These power the renders behind each workflow. Connections are
          placeholders for now and will go live as APIs are added.
        </p>
      </div>
      <div className="vid-int-grid">
        {INTEGRATIONS.map((tool) => (
          <div key={tool.key} className="vid-int-card">
            <div className="vid-int-top">
              <span className="vid-int-ix">
                <Icon name={tool.icon} size={18} />
              </span>
              <span className="vid-int-status">
                <span className="vid-dot" />
                Not connected
              </span>
            </div>
            <h4 className="vid-int-name">{tool.name}</h4>
            <p className="vid-int-blurb">{tool.blurb}</p>
            <button
              type="button"
              className="pg-btn pg-btn--outline pg-btn--sm pg-btn--block"
              onClick={() =>
                toast.info(`${tool.name} connection is coming soon`)
              }
            >
              Connect
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
