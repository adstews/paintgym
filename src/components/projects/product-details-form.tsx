"use client";

import { useState } from "react";
import { Btn } from "@/components/tf/ui";
import { toast } from "sonner";
import { ImageUploadField } from "./image-upload-field";
import { StyleControls } from "./style-controls";
import { BrandKitSection } from "./brand-kit-section";
import type { Project, ProductData, StyleSettings } from "@/lib/types";

interface Props {
  project: Project;
  onProjectChange: (next: Project) => void;
}

export function ProductDetailsForm({ project, onProjectChange }: Props) {
  const [scrapeBusy, setScrapeBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const productData: ProductData = project.product_data ?? {};

  function patchLocal(patch: Partial<Project>) {
    onProjectChange({ ...project, ...patch });
  }

  function patchProductData(patch: Partial<ProductData>) {
    onProjectChange({
      ...project,
      product_data: { ...productData, ...patch },
    });
  }

  async function save() {
    const payload = {
      name: project.name,
      client_name: project.client_name,
      product_url: project.product_url,
      logo_url: project.logo_url,
      brand_name: project.brand_name,
      product_name: project.product_name,
      product_description: project.product_description,
      key_selling_points: project.key_selling_points,
      target_audience: project.target_audience,
      price_point: project.price_point,
      proof_points: project.proof_points,
      style_settings: project.style_settings,
      product_data: project.product_data,
      brand_colors: project.brand_colors,
      brand_fonts: project.brand_fonts,
      brand_voice: project.brand_voice,
    };
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message ?? err.error ?? "Save failed");
      return;
    }
    setSavedAt(Date.now());
    toast.success("Saved");
  }

  async function rescrape() {
    if (!project.product_url) return;
    setScrapeBusy(true);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: project.product_url,
          project_id: project.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Scrape failed");
      }
      const json = await res.json();
      const data = json.data ?? {};
      const brand = json.brand ?? {};
      const merged: Project = {
        ...project,
        product_data: data,
        product_name: project.product_name ?? data.name ?? null,
        product_description:
          project.product_description ?? data.description ?? null,
        price_point: project.price_point ?? data.price ?? null,
        brand_colors:
          project.brand_colors && project.brand_colors.length > 0
            ? project.brand_colors
            : (brand.colors ?? []),
        brand_fonts:
          project.brand_fonts && project.brand_fonts.length > 0
            ? project.brand_fonts
            : (brand.fonts ?? []),
        brand_voice: project.brand_voice ?? brand.voice ?? null,
      };
      onProjectChange(merged);
      toast.success("Product and brand kit refreshed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scrape failed");
    } finally {
      setScrapeBusy(false);
    }
  }

  const heroImages = productData.images ?? [];

  return (
    <div>
      <section>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <h2 className="pg-h2">Product details</h2>
            <p className="pg-muted" style={{ fontSize: 12.5, marginTop: 6 }}>
              The more specific you are, the better Claude can write the briefs.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {savedAt && (
              <span className="pg-mono pg-muted" style={{ fontSize: 10.5 }}>
                Saved {new Date(savedAt).toLocaleTimeString()}
              </span>
            )}
            <Btn type="button" variant="pop" onClick={save}>
              Save
            </Btn>
          </div>
        </div>

        <div className="pg-form-card">
          <div className="pg-grid2">
            <Field
              id="prod-brand"
              label="Brand or company name"
              value={project.brand_name ?? project.client_name ?? ""}
              placeholder="Acme Co."
              onChange={(v) => patchLocal({ brand_name: v })}
            />
            <Field
              id="prod-name"
              label="Product or service name"
              value={project.product_name ?? ""}
              placeholder="The thing you are selling"
              onChange={(v) => patchLocal({ product_name: v })}
            />
          </div>

          <FieldArea
            id="prod-what"
            label="What it does"
            value={project.product_description ?? ""}
            placeholder="A short description: what it is, who it is for, what it solves."
            onChange={(v) => patchLocal({ product_description: v })}
          />

          <FieldArea
            id="prod-ksp"
            label="Key selling points"
            value={project.key_selling_points ?? ""}
            placeholder={"One per line:\n- Strongest benefit\n- Second benefit\n- Differentiator vs alternatives"}
            onChange={(v) => patchLocal({ key_selling_points: v })}
            rows={5}
          />

          <div className="pg-grid2">
            <Field
              id="prod-audience"
              label="Target audience"
              value={project.target_audience ?? ""}
              placeholder="Who this is for"
              onChange={(v) => patchLocal({ target_audience: v })}
            />
            <Field
              id="prod-price"
              label="Price point"
              value={project.price_point ?? ""}
              placeholder="$49, free trial, $9.99 / month..."
              onChange={(v) => patchLocal({ price_point: v })}
            />
          </div>

          <FieldArea
            id="prod-proof"
            label="Proof points (optional)"
            value={project.proof_points ?? ""}
            placeholder="Awards, press mentions, customer counts, testimonials, stats."
            onChange={(v) => patchLocal({ proof_points: v })}
            rows={4}
            last
          />
        </div>
      </section>

      <div className="pg-div">
        <span>Images</span>
      </div>

      <section>
        <p className="pg-muted" style={{ fontSize: 12.5, marginBottom: 14 }}>
          Used as references in your briefs. PNG, JPG, or WebP up to 8 MB.
        </p>
        <div className="pg-grid2">
          <ImageUploadField
            label="Product images"
            multiple
            folder={`projects-${project.id}`}
            urls={heroImages}
            onChange={(next) => patchProductData({ images: next })}
          />
          <ImageUploadField
            label="Logo"
            folder={`logos-${project.id}`}
            urls={project.logo_url ? [project.logo_url] : []}
            onChange={(next) => patchLocal({ logo_url: next[0] ?? null })}
          />
        </div>
      </section>

      <div className="pg-div">
        <span>Product URL (optional)</span>
      </div>

      <section>
        <p className="pg-muted" style={{ fontSize: 12.5, marginBottom: 14 }}>
          Paste a product page URL to auto fill the fields above.
        </p>
        <div>
          <label htmlFor="prod-url" className="pg-field-label">
            Product URL
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="prod-url"
              className="pg-input"
              type="url"
              value={project.product_url ?? ""}
              placeholder="https://"
              onChange={(e) => patchLocal({ product_url: e.target.value })}
            />
            <Btn
              type="button"
              variant="outline"
              icon="link"
              onClick={rescrape}
              disabled={!project.product_url || scrapeBusy}
            >
              {scrapeBusy ? "Scraping..." : "Auto fill"}
            </Btn>
          </div>
        </div>
      </section>

      <div className="pg-div">
        <span>Brand kit</span>
      </div>

      <section>
        <BrandKitSection project={project} onChange={(patch) => patchLocal(patch)} />
      </section>

      <div className="pg-div">
        <span>Style</span>
      </div>

      <section>
        <p className="pg-muted" style={{ fontSize: 12.5, marginBottom: 14 }}>
          Controls how Claude writes every brief in this project.
        </p>
        <StyleControls
          value={project.style_settings}
          onChange={(next: StyleSettings) => patchLocal({ style_settings: next })}
        />
      </section>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (next: string) => void;
}

function Field({ id, label, value, placeholder, onChange }: FieldProps) {
  return (
    <div className="pg-form-row">
      <label htmlFor={id} className="pg-field-label">
        {label}
      </label>
      <input
        id={id}
        className="pg-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface AreaProps extends FieldProps {
  rows?: number;
  last?: boolean;
}

function FieldArea({ id, label, value, placeholder, onChange, rows = 3, last }: AreaProps) {
  return (
    <div className="pg-form-row" style={last ? { marginBottom: 0 } : undefined}>
      <label htmlFor={id} className="pg-field-label">
        {label}
      </label>
      <textarea
        id={id}
        className="pg-input pg-textarea"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
