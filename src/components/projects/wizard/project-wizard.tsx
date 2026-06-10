"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Btn, Icon } from "@/components/tf/ui";
import { ImageUploadField } from "@/components/projects/image-upload-field";
import { BrandKitSection } from "@/components/projects/brand-kit-section";
import { StyleControls } from "@/components/projects/style-controls";
import { DEFAULT_STYLE_SETTINGS } from "@/lib/types";
import type {
  BrandColor,
  BrandFont,
  ProductData,
  Project,
  StyleSettings,
} from "@/lib/types";

// New multi-step project creation wizard. Step 1 takes a product URL, scrapes it
// and asks Claude to pre-fill every field, then walks the user one field per
// step so they can keep or edit each value. Final step creates the project using
// the same POST /api/projects + PATCH /api/projects/[id] backend as the classic
// form. The original form is untouched.

type FieldKey =
  | "brand_name"
  | "product_name"
  | "product_description"
  | "key_selling_points"
  | "target_audience"
  | "price_point"
  | "proof_points"
  | "compliance_rules"
  | "brand_voice";

interface Draft {
  product_url: string;
  brand_name: string;
  product_name: string;
  product_description: string;
  key_selling_points: string;
  target_audience: string;
  price_point: string;
  proof_points: string;
  compliance_rules: string;
  brand_voice: string;
  brand_colors: BrandColor[];
  brand_fonts: BrandFont[];
  images: string[];
  product_data: ProductData | null;
  style_settings: StyleSettings;
  project_name: string;
  prefilled: boolean;
}

const EMPTY_DRAFT: Draft = {
  product_url: "",
  brand_name: "",
  product_name: "",
  product_description: "",
  key_selling_points: "",
  target_audience: "",
  price_point: "",
  proof_points: "",
  compliance_rules: "",
  brand_voice: "",
  brand_colors: [],
  brand_fonts: [],
  images: [],
  product_data: null,
  style_settings: DEFAULT_STYLE_SETTINGS,
  project_name: "",
  prefilled: false,
};

type StepKind = "field" | "image" | "brandkit" | "style" | "review";

interface StepDef {
  id: string;
  kind: StepKind;
  title: string;
  helper: string;
  field?: FieldKey;
  label?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
}

const STEPS: StepDef[] = [
  {
    id: "brand",
    kind: "field",
    field: "brand_name",
    title: "Brand or company name",
    helper: "The company or brand behind the product.",
    label: "Brand or company name",
    placeholder: "Acme Co.",
    required: true,
  },
  {
    id: "product",
    kind: "field",
    field: "product_name",
    title: "Product or service name",
    helper: "The specific thing you are selling.",
    label: "Product or service name",
    placeholder: "The thing you are selling",
    required: true,
  },
  {
    id: "what",
    kind: "field",
    field: "product_description",
    title: "What it does",
    helper: "What it is, who it is for, and what it solves.",
    label: "What it does",
    placeholder: "A short description: what it is, who it is for, what it solves.",
    multiline: true,
    rows: 5,
    required: true,
  },
  {
    id: "ksp",
    kind: "field",
    field: "key_selling_points",
    title: "Key selling points",
    helper: "The strongest benefits, one per line.",
    label: "Key selling points",
    placeholder:
      "One per line:\n- Strongest benefit\n- Second benefit\n- Differentiator vs alternatives",
    multiline: true,
    rows: 6,
  },
  {
    id: "audience",
    kind: "field",
    field: "target_audience",
    title: "Target audience",
    helper: "Who this is for.",
    label: "Target audience",
    placeholder: "Who this is for",
  },
  {
    id: "price",
    kind: "field",
    field: "price_point",
    title: "Price point",
    helper: "Required. A blank price makes Claude guess a number.",
    label: "Price point",
    placeholder: "$49, free trial, $9.99 / month...",
    required: true,
  },
  {
    id: "proof",
    kind: "field",
    field: "proof_points",
    title: "Proof points",
    helper: "Awards, press, customer counts, ratings, guarantees. Optional.",
    label: "Proof points",
    placeholder: "Awards, press mentions, customer counts, testimonials, stats.",
    multiline: true,
    rows: 5,
  },
  {
    id: "compliance",
    kind: "field",
    field: "compliance_rules",
    title: "Compliance / hard rules",
    helper: "Hard rules Claude must never break. Optional.",
    label: "Compliance / hard rules",
    placeholder:
      "e.g. never say 'cure', always include '18+', no before/after weight-loss imagery.",
    multiline: true,
    rows: 5,
  },
  {
    id: "image",
    kind: "image",
    title: "Product image",
    helper: "Used as a reference in your briefs. PNG, JPG, or WebP up to 8 MB.",
  },
  {
    id: "brandkit",
    kind: "brandkit",
    title: "Brand kit",
    helper: "Colors, fonts, and voice. Auto detected — edit anything wrong.",
  },
  {
    id: "style",
    kind: "style",
    title: "Style",
    helper: "Controls how Claude writes every brief in this project.",
  },
  {
    id: "review",
    kind: "review",
    title: "Review & create",
    helper: "Confirm the details. You can change everything later.",
  },
];

function normalizeUrl(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function ProjectWizard() {
  const router = useRouter();
  const [phase, setPhase] = useState<"url" | "analyzing" | "wizard">("url");
  const [urlInput, setUrlInput] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [stepIndex, setStepIndex] = useState(0);
  const [creating, setCreating] = useState(false);

  function setField(field: FieldKey, value: string) {
    setDraft((d) => ({ ...d, [field]: value }));
  }

  async function analyze() {
    const url = normalizeUrl(urlInput);
    if (!url) {
      setErr("Enter a valid product URL.");
      return;
    }
    setErr(null);
    setPhase("analyzing");
    try {
      const res = await fetch("/api/prefill-project", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message ?? e.error ?? "Could not analyze that page");
      }
      const json = await res.json();
      const f = json.fields ?? {};
      setDraft((d) => ({
        ...d,
        product_url: url,
        brand_name: f.brand_name ?? "",
        product_name: f.product_name ?? "",
        product_description: f.product_description ?? "",
        key_selling_points: f.key_selling_points ?? "",
        target_audience: f.target_audience ?? "",
        price_point: f.price_point ?? "",
        proof_points: f.proof_points ?? "",
        compliance_rules: f.compliance_rules ?? "",
        brand_voice: f.brand_voice ?? "",
        brand_colors: json.brand_colors ?? [],
        brand_fonts: json.brand_fonts ?? [],
        images: json.images ?? [],
        product_data: json.product_data ?? null,
        project_name: f.product_name || f.brand_name || "",
        prefilled: true,
      }));
      if (json.degraded) {
        toast.message(
          "Loaded the page, but AI prefill was limited. Review each step.",
        );
      }
      setStepIndex(0);
      setPhase("wizard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not analyze that page");
      setPhase("url");
    }
  }

  function skipToManual() {
    const url = urlInput.trim() ? normalizeUrl(urlInput) : null;
    setDraft({ ...EMPTY_DRAFT, product_url: url ?? "" });
    setStepIndex(0);
    setPhase("wizard");
  }

  async function create() {
    setCreating(true);
    try {
      const name = (
        draft.project_name ||
        draft.product_name ||
        draft.brand_name ||
        "Untitled project"
      ).trim();
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Deliberately omit product_url here: POST /api/projects kicks off a
        // background scrape when a URL is present, which would overwrite the
        // curated fields below. We set the URL in the PATCH instead.
        body: JSON.stringify({ name, client_name: draft.brand_name || null }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message ?? "Failed to create project");
      }
      const { id } = await res.json();

      const product_data: ProductData = {
        ...(draft.product_data ?? {}),
        images: draft.images,
        url: draft.product_url || undefined,
      };

      const patch = {
        product_url: draft.product_url || null,
        brand_name: draft.brand_name || null,
        product_name: draft.product_name || null,
        product_description: draft.product_description || null,
        key_selling_points: draft.key_selling_points || null,
        target_audience: draft.target_audience || null,
        price_point: draft.price_point || null,
        proof_points: draft.proof_points || null,
        compliance_rules: draft.compliance_rules || null,
        brand_voice: draft.brand_voice || null,
        brand_colors: draft.brand_colors,
        brand_fonts: draft.brand_fonts,
        product_data,
        style_settings: draft.style_settings,
      };
      const res2 = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res2.ok) {
        const e = await res2.json().catch(() => ({}));
        throw new Error(
          e.message ?? "Created the project but could not save the details",
        );
      }
      toast.success("Project created");
      router.push(`/projects/${id}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create project");
      setCreating(false);
    }
  }

  // ---- URL entry screen ----
  if (phase === "url" || phase === "analyzing") {
    const analyzing = phase === "analyzing";
    return (
      <Wrap>
        <Kicker step="Start" />
        <h1 className="pg-h2" style={{ fontSize: 30 }}>
          New project
        </h1>
        <p className="pg-muted" style={{ fontSize: 14, marginTop: 10 }}>
          Paste your product URL. We will read the page and pre-fill every
          field so you can breeze through the rest.
        </p>

        <div className="pg-form-card" style={{ marginTop: 24 }}>
          <label htmlFor="wiz-url" className="pg-field-label">
            Product URL
          </label>
          <input
            id="wiz-url"
            className="pg-input"
            type="url"
            autoFocus
            disabled={analyzing}
            value={urlInput}
            placeholder="https://yourstore.com/product"
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !analyzing) analyze();
            }}
          />

          {err && (
            <div
              role="alert"
              style={{
                marginTop: 12,
                padding: "10px 12px",
                border: "1.5px solid var(--red)",
                borderRadius: 4,
                background: "#fdecec",
                color: "var(--red)",
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              {err}
            </div>
          )}

          <div
            style={{
              marginTop: 18,
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <Btn
              type="button"
              variant="pop"
              iconR="arrow"
              onClick={analyze}
              disabled={analyzing || urlInput.trim().length === 0}
            >
              {analyzing ? "Analyzing your product page..." : "Analyze & continue"}
            </Btn>
            {analyzing && <Spinner />}
            {!analyzing && (
              <button
                type="button"
                onClick={skipToManual}
                className="pg-muted"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12.5,
                  textDecoration: "underline",
                  fontFamily: "var(--mono)",
                }}
              >
                or fill it in manually
              </button>
            )}
          </div>
          {analyzing && (
            <p className="pg-muted" style={{ fontSize: 12, marginTop: 12 }}>
              Reading the page and drafting your brief. This takes a few seconds.
            </p>
          )}
        </div>
      </Wrap>
    );
  }

  // ---- Wizard steps ----
  const step = STEPS[stepIndex];
  const total = STEPS.length;
  const isLast = stepIndex === total - 1;
  const valid = isStepValid(step, draft);

  function goNext() {
    if (!valid) return;
    if (isLast) {
      create();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, total - 1));
  }

  function goBack() {
    if (stepIndex === 0) {
      setPhase("url");
      return;
    }
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <Wrap>
      <Progress current={stepIndex} total={total} />

      <div style={{ marginTop: 18 }}>
        <Kicker step={`Step ${stepIndex + 1} of ${total}`} />
        <h1 className="pg-h2" style={{ fontSize: 26, marginTop: 8 }}>
          {step.title}
        </h1>
        <p className="pg-muted" style={{ fontSize: 13, marginTop: 8 }}>
          {step.helper}
        </p>
      </div>

      <div className="pg-form-card" style={{ marginTop: 18 }}>
        <StepBody
          key={step.id}
          step={step}
          draft={draft}
          setDraft={setDraft}
          setField={setField}
          onEnterAdvance={goNext}
        />
      </div>

      <div
        style={{
          marginTop: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Btn type="button" variant="outline" icon="back" onClick={goBack}>
          {stepIndex === 0 ? "URL" : "Back"}
        </Btn>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {!isLast && step.kind === "field" && !step.required && (
            <button
              type="button"
              onClick={goNext}
              className="pg-muted"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                textDecoration: "underline",
                fontFamily: "var(--mono)",
              }}
            >
              skip
            </button>
          )}
          {isLast ? (
            <Btn
              type="button"
              variant="pop"
              icon="check"
              onClick={goNext}
              disabled={creating}
            >
              {creating ? "Creating..." : "Create project"}
            </Btn>
          ) : (
            <Btn
              type="button"
              variant="pop"
              iconR="arrow"
              onClick={goNext}
              disabled={!valid}
            >
              Next
            </Btn>
          )}
        </div>
      </div>

      {step.required && !valid && (
        <p
          className="pg-mono"
          style={{
            marginTop: 10,
            fontSize: 11,
            color: "var(--red)",
            textAlign: "right",
          }}
        >
          Required to generate ads
        </p>
      )}
    </Wrap>
  );
}

function isStepValid(step: StepDef, draft: Draft): boolean {
  if (step.kind === "field" && step.required && step.field) {
    return String(draft[step.field] ?? "").trim().length > 0;
  }
  return true;
}

// ---------- step body ----------

interface StepBodyProps {
  step: StepDef;
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  setField: (field: FieldKey, value: string) => void;
  onEnterAdvance: () => void;
}

function StepBody({
  step,
  draft,
  setDraft,
  setField,
  onEnterAdvance,
}: StepBodyProps) {
  if (step.kind === "field" && step.field) {
    const value = String(draft[step.field] ?? "");
    const showPrefilled = draft.prefilled && value.trim().length > 0;
    return (
      <div>
        {showPrefilled && <PrefilledHint />}
        <label htmlFor={`wiz-${step.id}`} className="pg-field-label">
          {step.label}
          {step.required && (
            <span style={{ color: "var(--red)", marginLeft: 3 }}>*</span>
          )}
        </label>
        {step.multiline ? (
          <textarea
            id={`wiz-${step.id}`}
            className="pg-input pg-textarea"
            autoFocus
            rows={step.rows ?? 4}
            value={value}
            placeholder={step.placeholder}
            onChange={(e) => setField(step.field as FieldKey, e.target.value)}
          />
        ) : (
          <input
            id={`wiz-${step.id}`}
            className="pg-input"
            autoFocus
            value={value}
            placeholder={step.placeholder}
            onChange={(e) => setField(step.field as FieldKey, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onEnterAdvance();
              }
            }}
          />
        )}
      </div>
    );
  }

  if (step.kind === "image") {
    return (
      <div>
        {draft.prefilled && draft.images.length > 0 && (
          <p className="pg-muted" style={{ fontSize: 12.5, marginBottom: 12 }}>
            We found these on your page. Remove any you do not want, set a
            primary, or add your own.
          </p>
        )}
        <ImageUploadField
          label="Product images"
          multiple
          allowPrimary
          folder="wizard"
          urls={draft.images}
          onChange={(next) => setDraft((d) => ({ ...d, images: next }))}
        />
      </div>
    );
  }

  if (step.kind === "brandkit") {
    const bkProject = {
      brand_colors: draft.brand_colors,
      brand_fonts: draft.brand_fonts,
      brand_voice: draft.brand_voice,
    } as Project;
    return (
      <BrandKitSection
        project={bkProject}
        onChange={(patch) =>
          setDraft((d) => ({
            ...d,
            brand_colors: patch.brand_colors ?? d.brand_colors,
            brand_fonts: patch.brand_fonts ?? d.brand_fonts,
            brand_voice: patch.brand_voice ?? d.brand_voice,
          }))
        }
      />
    );
  }

  if (step.kind === "style") {
    return (
      <StyleControls
        value={draft.style_settings}
        onChange={(next) => setDraft((d) => ({ ...d, style_settings: next }))}
      />
    );
  }

  // review
  return <ReviewBody draft={draft} setDraft={setDraft} />;
}

function ReviewBody({
  draft,
  setDraft,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
}) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Brand", value: draft.brand_name },
    { label: "Product", value: draft.product_name },
    { label: "What it does", value: draft.product_description },
    { label: "Key selling points", value: draft.key_selling_points },
    { label: "Audience", value: draft.target_audience },
    { label: "Price", value: draft.price_point },
    { label: "Proof", value: draft.proof_points },
    { label: "Compliance", value: draft.compliance_rules },
    {
      label: "Brand colors",
      value: draft.brand_colors.map((c) => c.hex).join(", "),
    },
    {
      label: "Images",
      value: draft.images.length ? `${draft.images.length} attached` : "",
    },
  ];

  return (
    <div>
      <div className="pg-form-row">
        <label htmlFor="wiz-name" className="pg-field-label">
          Project name
        </label>
        <input
          id="wiz-name"
          className="pg-input"
          value={draft.project_name}
          placeholder="Spring launch"
          onChange={(e) =>
            setDraft((d) => ({ ...d, project_name: e.target.value }))
          }
        />
      </div>

      <div
        style={{
          marginTop: 6,
          border: "1.5px solid var(--line)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        {rows
          .filter((r) => r.value.trim().length > 0)
          .map((r, i) => (
            <div
              key={r.label}
              style={{
                display: "flex",
                gap: 12,
                padding: "10px 12px",
                borderTop: i === 0 ? "none" : "1px solid var(--line)",
                background: "#fff",
              }}
            >
              <span
                className="pg-mono pg-muted"
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  flex: "0 0 116px",
                  paddingTop: 2,
                }}
              >
                {r.label}
              </span>
              <span
                style={{
                  fontSize: 13,
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.45,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {r.value.length > 220 ? `${r.value.slice(0, 220)}...` : r.value}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

// ---------- small bits ----------

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 620, margin: "0 auto", width: "100%" }}>
      {children}
    </div>
  );
}

function Kicker({ step }: { step: string }) {
  return (
    <div
      className="pg-mono"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 10.5,
        letterSpacing: ".12em",
        textTransform: "uppercase",
        color: "var(--muted)",
      }}
    >
      <span
        style={{
          width: 18,
          height: 1.5,
          background: "var(--ink)",
          display: "inline-block",
        }}
      />
      {step}
    </div>
  );
}

function Progress({ current, total }: { current: number; total: number }) {
  const pct = Math.round(((current + 1) / total) * 100);
  return (
    <div>
      <div
        style={{
          height: 6,
          border: "1.5px solid var(--ink)",
          borderRadius: 3,
          background: "#fff",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "var(--pop)",
            transition: "width .25s ease",
          }}
        />
      </div>
    </div>
  );
}

function PrefilledHint() {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        marginBottom: 10,
        padding: "4px 8px",
        border: "1.5px solid var(--ink)",
        borderRadius: 2,
        background: "var(--pop)",
        color: "var(--pop-ink)",
        fontFamily: "var(--mono)",
        fontSize: 10,
        letterSpacing: ".06em",
        textTransform: "uppercase",
        fontWeight: 700,
      }}
    >
      <Icon name="sparkle" size={12} />
      Pre-filled from your page — edit or keep
    </div>
  );
}

const SPIN_STYLE: CSSProperties = {
  width: 18,
  height: 18,
  border: "2.5px solid var(--line)",
  borderTopColor: "var(--ink)",
  borderRadius: "50%",
  animation: "pg-spin .8s linear infinite",
};

function Spinner() {
  return <div style={SPIN_STYLE} aria-hidden="true" />;
}
