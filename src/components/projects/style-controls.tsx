"use client";

import { Label } from "@/components/ui/label";
import { SegmentedControl } from "./segmented-control";
import { PLATFORM_DIMENSIONS } from "@/lib/types";
import type {
  Aggressiveness,
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
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Aggressiveness
        </Label>
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

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Tone
          </Label>
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

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Visual style
          </Label>
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

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Platform
          </Label>
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
    </div>
  );
}
