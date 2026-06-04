"use client";

import { useState } from "react";
import type { WorkflowSpec } from "@/lib/video/workflows";
import { Icon } from "@/components/tf/ui";
import { CopyButton } from "./copy-button";

// One workflow rendered as a vertical stepper. Steps expand and collapse; a
// step with a `prompt` shows a copyable template block.
export function WorkflowStepper({ workflow }: { workflow: WorkflowSpec }) {
  // First step open by default; the rest collapsed.
  const [open, setOpen] = useState<Record<number, boolean>>({ 0: true });

  function toggle(i: number) {
    setOpen((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  return (
    <div className="vid-wf">
      <div className="vid-wf-head">
        <div>
          <h3 className="vid-wf-name">{workflow.name}</h3>
          <span className="pg-mono vid-wf-method">{workflow.method}</span>
        </div>
        <span className="pg-badge pg-badge--ink">
          {workflow.steps.length} steps
        </span>
      </div>
      <p className="vid-wf-summary">{workflow.summary}</p>

      <ol className="vid-steps">
        {workflow.steps.map((step, i) => {
          const isOpen = !!open[i];
          return (
            <li key={i} className={`vid-step ${isOpen ? "is-open" : ""}`}>
              <button
                type="button"
                className="vid-step-head"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
              >
                <span className="vid-step-num">{i + 1}</span>
                <span className="vid-step-title">{step.title}</span>
                {step.tool && (
                  <span className="pg-badge pg-badge--outline vid-step-tool">
                    {step.tool}
                  </span>
                )}
                <Icon
                  name="chevD"
                  size={16}
                  style={{
                    transform: isOpen ? "rotate(180deg)" : "none",
                    transition: "transform .15s",
                    flex: "0 0 auto",
                  }}
                />
              </button>
              {isOpen && (
                <div className="vid-step-body">
                  <p>{step.body}</p>
                  {step.prompt && (
                    <div className="vid-prompt">
                      <div className="vid-prompt-head">
                        <span className="pg-mono vid-prompt-k">Prompt template</span>
                        <CopyButton text={step.prompt} />
                      </div>
                      <pre className="vid-prompt-body">{step.prompt}</pre>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
