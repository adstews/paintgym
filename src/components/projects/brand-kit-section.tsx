"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { BrandColor, BrandFont, Project } from "@/lib/types";

interface Props {
  project: Project;
  onChange: (patch: Partial<Project>) => void;
}

function isValidHex(s: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(s);
}

export function BrandKitSection({ project, onChange }: Props) {
  const colors = project.brand_colors ?? [];
  const fonts = project.brand_fonts ?? [];

  function setColors(next: BrandColor[]) {
    onChange({ brand_colors: next });
  }
  function setFonts(next: BrandFont[]) {
    onChange({ brand_fonts: next });
  }

  function patchColor(i: number, patch: Partial<BrandColor>) {
    const next = colors.slice();
    next[i] = { ...next[i], ...patch };
    setColors(next);
  }
  function patchFont(i: number, patch: Partial<BrandFont>) {
    const next = fonts.slice();
    next[i] = { ...next[i], ...patch };
    setFonts(next);
  }

  function addColor() {
    const label =
      colors.length === 0
        ? "primary"
        : colors.length === 1
          ? "secondary"
          : colors.length === 2
            ? "accent"
            : `color-${colors.length + 1}`;
    setColors([...colors, { label, hex: "#000000" }]);
  }
  function removeColor(i: number) {
    setColors(colors.filter((_, idx) => idx !== i));
  }

  function addFont() {
    const role =
      fonts.length === 0
        ? "heading"
        : fonts.length === 1
          ? "body"
          : "accent";
    setFonts([...fonts, { role, family: "" }]);
  }
  function removeFont(i: number) {
    setFonts(fonts.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Brand kit</h2>
        <p className="text-xs text-muted-foreground">
          Auto detected when you paste a product URL. Edit anything Claude got
          wrong. These get passed to every brief.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Colors
          </Label>
          <Button type="button" size="sm" variant="outline" onClick={addColor}>
            Add color
          </Button>
        </div>
        {colors.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No colors detected yet.
          </p>
        ) : (
          <div className="space-y-2">
            {colors.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md border p-2"
              >
                <div
                  className={cn(
                    "h-9 w-9 shrink-0 rounded border",
                    !isValidHex(c.hex) && "border-destructive",
                  )}
                  style={{ backgroundColor: isValidHex(c.hex) ? c.hex : "#fff" }}
                />
                <input
                  type="color"
                  className="h-9 w-9 cursor-pointer rounded border bg-transparent"
                  value={isValidHex(c.hex) ? c.hex : "#000000"}
                  onChange={(e) => patchColor(i, { hex: e.target.value })}
                  aria-label={`${c.label} color picker`}
                />
                <Input
                  className="w-28 font-mono text-xs"
                  value={c.label}
                  onChange={(e) => patchColor(i, { label: e.target.value })}
                  placeholder="primary"
                />
                <Input
                  className="flex-1 font-mono text-xs"
                  value={c.hex}
                  onChange={(e) => patchColor(i, { hex: e.target.value })}
                  placeholder="#E24B4A"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeColor(i)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Fonts
          </Label>
          <Button type="button" size="sm" variant="outline" onClick={addFont}>
            Add font
          </Button>
        </div>
        {fonts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No fonts detected yet.</p>
        ) : (
          <div className="space-y-2">
            {fonts.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-md border p-2"
              >
                <Input
                  className="w-28 text-xs"
                  value={f.role}
                  onChange={(e) => patchFont(i, { role: e.target.value })}
                  placeholder="heading"
                />
                <Input
                  className="flex-1 text-xs"
                  value={f.family}
                  onChange={(e) => patchFont(i, { family: e.target.value })}
                  placeholder="Fraunces"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFont(i)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="brand-voice"
          className="text-xs uppercase tracking-wide text-muted-foreground"
        >
          Voice
        </Label>
        <Textarea
          id="brand-voice"
          rows={3}
          value={project.brand_voice ?? ""}
          onChange={(e) => onChange({ brand_voice: e.target.value })}
          placeholder="Edit to match your brand. For example: warm, conversational, dry humor; never corporate."
        />
      </div>
    </div>
  );
}
