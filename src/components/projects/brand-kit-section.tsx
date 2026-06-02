"use client";

import { Btn } from "@/components/tf/ui";
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
    <div>
      <h2 className="pg-h2">Brand kit</h2>
      <p
        className="pg-muted"
        style={{ fontSize: 12.5, marginTop: 6, maxWidth: "48ch" }}
      >
        Auto detected when you paste a product URL. Edit anything Claude got
        wrong. These get passed to every brief.
      </p>

      <div className="pg-control-block">
        <div className="lab">
          <b>Colors</b>
          <Btn type="button" variant="outline" size="sm" icon="plus" onClick={addColor}>
            Add color
          </Btn>
        </div>
        {colors.length === 0 ? (
          <p className="pg-muted" style={{ fontSize: 12 }}>
            No colors detected yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {colors.map((c, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1.5px solid var(--line)",
                  borderRadius: 3,
                  padding: 8,
                }}
              >
                <div
                  className={cn("pg-brand-sw", !isValidHex(c.hex) && "border-destructive")}
                  style={{
                    backgroundColor: isValidHex(c.hex) ? c.hex : "#fff",
                    borderColor: isValidHex(c.hex) ? undefined : "var(--red)",
                  }}
                />
                <input
                  type="color"
                  className="pg-brand-sw"
                  style={{ cursor: "pointer", background: "transparent", padding: 0 }}
                  value={isValidHex(c.hex) ? c.hex : "#000000"}
                  onChange={(e) => patchColor(i, { hex: e.target.value })}
                  aria-label={`${c.label} color picker`}
                />
                <input
                  className="pg-input"
                  style={{
                    width: 110,
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                    padding: "9px 10px",
                  }}
                  value={c.label}
                  onChange={(e) => patchColor(i, { label: e.target.value })}
                  placeholder="primary"
                />
                <input
                  className="pg-input"
                  style={{
                    flex: 1,
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                    padding: "9px 10px",
                  }}
                  value={c.hex}
                  onChange={(e) => patchColor(i, { hex: e.target.value })}
                  placeholder="#E24B4A"
                />
                <Btn
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeColor(i)}
                >
                  Remove
                </Btn>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pg-control-block">
        <div className="lab">
          <b>Fonts</b>
          <Btn type="button" variant="outline" size="sm" icon="plus" onClick={addFont}>
            Add font
          </Btn>
        </div>
        {fonts.length === 0 ? (
          <p className="pg-muted" style={{ fontSize: 12 }}>
            No fonts detected yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {fonts.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1.5px solid var(--line)",
                  borderRadius: 3,
                  padding: 8,
                }}
              >
                <input
                  className="pg-input"
                  style={{ width: 110, fontSize: 12, padding: "9px 10px" }}
                  value={f.role}
                  onChange={(e) => patchFont(i, { role: e.target.value })}
                  placeholder="heading"
                />
                <input
                  className="pg-input"
                  style={{ flex: 1, fontSize: 12, padding: "9px 10px" }}
                  value={f.family}
                  onChange={(e) => patchFont(i, { family: e.target.value })}
                  placeholder="Fraunces"
                />
                <Btn
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFont(i)}
                >
                  Remove
                </Btn>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pg-control-block">
        <label htmlFor="brand-voice" className="pg-field-label">
          Voice
        </label>
        <textarea
          id="brand-voice"
          className="pg-input pg-textarea"
          rows={3}
          value={project.brand_voice ?? ""}
          onChange={(e) => onChange({ brand_voice: e.target.value })}
          placeholder="Edit to match your brand. For example: warm, conversational, dry humor; never corporate."
        />
      </div>
    </div>
  );
}
