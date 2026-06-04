"use client";

import { SegmentedControl } from "./segmented-control";
import { DEFAULT_STYLE_SETTINGS } from "@/lib/types";
import type {
  Aggressiveness,
  ModelPreference,
  StyleSettings,
  Tone,
  VisualStyle,
} from "@/lib/types";

interface Props {
  value: StyleSettings;
  onChange: (next: StyleSettings) => void;
}

const MODEL_PREF_LABEL: Record<ModelPreference, string> = {
  gemini: "Gemini",
  openai: "GPT-4o",
  alternating: "Alternating",
  both: "Both",
};

export function StyleControls({ value, onChange }: Props) {
  return (
    <div>
      <div className="pg-control-block" style={{ marginTop: 0 }}>
        <div className="lab">Aggressiveness</div>
        <SegmentedControl<Aggressiveness>
          ariaLabel="Aggressiveness"
          value={
            (value.aggressiveness as string) === "more"
              ? "maximum"
              : value.aggressiveness
          }
          onChange={(next) => onChange({ ...value, aggressiveness: next })}
          columns={2}
          options={[
            { value: "less", label: "Less", hint: "Brand-building, aspirational" },
            { value: "average", label: "Average", hint: "Balanced, clear benefits" },
            { value: "maximum", label: "Maximum", hint: "Full direct response" },
            { value: "mix", label: "Mix it up", hint: "Random level per ad" },
          ]}
        />
      </div>

      <div className="pg-grid2" style={{ marginTop: 18 }}>
        <div className="pg-control-block" style={{ marginTop: 0 }}>
          <div className="lab">Tone</div>
          <SegmentedControl<Tone>
            ariaLabel="Tone"
            value={value.tone}
            onChange={(next) => onChange({ ...value, tone: next })}
            size="sm"
            options={[
              { value: "professional", label: "Professional" },
              { value: "casual", label: "Casual" },
              { value: "edgy", label: "Edgy" },
              { value: "playful", label: "Playful" },
            ]}
          />
        </div>

        <div className="pg-control-block" style={{ marginTop: 0 }}>
          <div className="lab">Visual style</div>
          <SegmentedControl<VisualStyle>
            ariaLabel="Visual style"
            value={value.visual_style}
            onChange={(next) => onChange({ ...value, visual_style: next })}
            size="sm"
            options={[
              { value: "clean", label: "Clean / Minimal" },
              { value: "bold", label: "Bold / Dramatic" },
              { value: "organic", label: "Organic / Lifestyle" },
            ]}
          />
        </div>
      </div>
      {/* Platform selector removed — every ad is Meta 4:5 (1080x1350) for now. */}

      <div
        className="pg-control-block"
        style={{
          marginTop: 18,
          border: "1.5px solid var(--ink)",
          borderRadius: 4,
          background: "#fff",
          padding: 14,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="lab">
          Image model <b>{MODEL_PREF_LABEL[value.image_model ?? "gemini"]}</b>
        </div>
        <SegmentedControl<ModelPreference>
          ariaLabel="Image model"
          value={value.image_model ?? DEFAULT_STYLE_SETTINGS.image_model ?? "gemini"}
          onChange={(next) => onChange({ ...value, image_model: next })}
          size="sm"
          columns={2}
          options={[
            { value: "gemini", label: "Gemini", hint: "Nano Banana Pro" },
            { value: "openai", label: "GPT-4o", hint: "gpt-image-1" },
            { value: "alternating", label: "Alternating", hint: "Flip per concept" },
            { value: "both", label: "Both", hint: "Side by side" },
          ]}
        />
      </div>
    </div>
  );
}
