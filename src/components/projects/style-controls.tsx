"use client";

import { SegmentedControl } from "./segmented-control";
import { DEFAULT_STYLE_SETTINGS, PLATFORM_DIMENSIONS } from "@/lib/types";
import type {
  Aggressiveness,
  ModelPreference,
  Platform,
  StyleSettings,
  Tone,
  VisualStyle,
} from "@/lib/types";

interface Props {
  value: StyleSettings;
  onChange: (next: StyleSettings) => void;
}

export function StyleControls({ value, onChange }: Props) {
  return (
    <div>
      <div className="pg-control-block" style={{ marginTop: 0 }}>
        <div className="lab">Aggressiveness</div>
        <SegmentedControl<Aggressiveness>
          ariaLabel="Aggressiveness"
          value={value.aggressiveness}
          onChange={(next) => onChange({ ...value, aggressiveness: next })}
          options={[
            { value: "less", label: "Less", hint: "Brand-building, aspirational" },
            { value: "average", label: "Average", hint: "Balanced, clear benefits" },
            { value: "more", label: "More", hint: "Urgent, strong claims" },
            { value: "maximum", label: "Maximum", hint: "Full direct response" },
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

        <div className="pg-control-block" style={{ marginTop: 0 }}>
          <div className="lab">Platform</div>
          <SegmentedControl<Platform>
            ariaLabel="Platform"
            value={value.platform}
            onChange={(next) => onChange({ ...value, platform: next })}
            size="sm"
            options={(
              [
                { value: "meta", label: "Meta" },
                { value: "tiktok", label: "TikTok" },
                { value: "linkedin", label: "LinkedIn" },
              ] as { value: Platform; label: string }[]
            ).map((opt) => {
              const d = PLATFORM_DIMENSIONS[opt.value];
              return {
                value: opt.value,
                label: opt.label,
                hint: `${d.width}x${d.height}`,
              };
            })}
          />
        </div>
      </div>

      <div className="pg-control-block" style={{ marginTop: 18 }}>
        <div className="lab">Image model</div>
        <SegmentedControl<ModelPreference>
          ariaLabel="Image model"
          value={value.image_model ?? DEFAULT_STYLE_SETTINGS.image_model ?? "gemini"}
          onChange={(next) => onChange({ ...value, image_model: next })}
          size="sm"
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
