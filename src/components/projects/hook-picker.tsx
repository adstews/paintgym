"use client";

import { useEffect, useState } from "react";
import {
  HOOK_CATEGORY_LABEL,
  HOOK_CATEGORY_ORDER,
  type Hook,
} from "@/lib/hooks";

interface Props {
  selectedHookId: string | null;
  onChange: (hookId: string | null) => void;
}

// "Pick a hook" step shown before briefs are written. The chosen hook is passed
// to brief generation and Claude opens the creative with it. Picking nothing
// (the default) lets Claude choose its own opening.
export function HookPicker({ selectedHookId, onChange }: Props) {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/hooks");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setHooks((json.hooks as Hook[]) ?? []);
      } catch {
        // Best-effort; the picker just stays empty and Claude chooses.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loaded && hooks.length === 0) return null;

  const selected = hooks.find((h) => h.id === selectedHookId) ?? null;
  const byCategory = HOOK_CATEGORY_ORDER.map((cat) => ({
    cat,
    items: hooks.filter((h) => h.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div
      style={{
        border: "1.5px solid var(--line)",
        borderRadius: 4,
        background: "#fff",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 14px",
          background: "none",
          border: 0,
          cursor: "pointer",
        }}
        aria-expanded={open}
      >
        <span
          aria-hidden
          style={{
            transition: "transform .15s",
            transform: open ? "rotate(90deg)" : "none",
            color: "var(--muted)",
            display: "inline-flex",
          }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: "var(--headline)", fontWeight: 800, fontSize: 14, display: "block" }}>
            Pick a hook
          </span>
          <span className="pg-muted" style={{ fontSize: 12, display: "block", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {selected
              ? selected.hook_template
              : "Optional. Claude opens the brief with the hook you choose."}
          </span>
        </span>
        {selected && (
          <span className="pg-badge pg-badge--pop" style={{ flexShrink: 0 }}>
            1 picked
          </span>
        )}
      </button>

      {open && (
        <div style={{ padding: "4px 14px 16px" }}>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="pg-chip"
            style={{
              marginBottom: 12,
              borderColor: selectedHookId === null ? "var(--ink)" : "var(--line)",
              background: selectedHookId === null ? "var(--ink)" : "transparent",
              color: selectedHookId === null ? "#fff" : "var(--ink)",
            }}
          >
            Let Claude choose
          </button>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {byCategory.map(({ cat, items }) => (
              <div key={cat}>
                <div
                  className="pg-mono pg-muted"
                  style={{ fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}
                >
                  {HOOK_CATEGORY_LABEL[cat]}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map((h) => {
                    const on = h.id === selectedHookId;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => onChange(on ? null : h.id)}
                        className="text-left"
                        style={{
                          border: `1.5px solid ${on ? "var(--ink)" : "var(--line)"}`,
                          borderRadius: 4,
                          padding: "10px 12px",
                          background: on ? "#fff" : "transparent",
                          boxShadow: on ? "var(--shadow-sm)" : "none",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, color: "var(--ink)" }}>
                          {h.hook_template}
                        </div>
                        <div className="pg-muted" style={{ fontSize: 11.5, marginTop: 6, lineHeight: 1.4 }}>
                          {h.why_it_works}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
