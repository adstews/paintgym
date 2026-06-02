"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Concept } from "@/lib/types";

export function ConceptLibrary({ concepts }: { concepts: Concept[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Concept | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setEditing(null);
    setName("");
    setDescription("");
    setTemplate("");
  }

  function openNew() {
    reset();
    setOpen(true);
  }

  function openEdit(c: Concept) {
    setEditing(c);
    setName(c.name);
    setDescription(c.description);
    setTemplate(c.prompt_template);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        name,
        description,
        prompt_template: template,
      };
      const url = editing ? `/api/concepts/${editing.id}` : "/api/concepts";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Save failed");
      }
      toast.success(editing ? "Concept updated" : "Concept created");
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(c: Concept) {
    if (!confirm(`Delete "${c.name}"?`)) return;
    const res = await fetch(`/api/concepts/${c.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted");
      router.refresh();
    } else {
      toast.error("Delete failed");
    }
  }

  const defaults = concepts.filter((c) => c.is_default);
  const custom = concepts.filter((c) => !c.is_default);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="pg-h2">Concepts</h1>
          <p className="text-sm" style={{ color: "var(--muted)", marginTop: 6 }}>
            Templates that drive each ad image. Defaults are read-only.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <button
                className="pg-btn pg-btn--pop pg-btn--md"
                onClick={openNew}
              >
                New concept
              </button>
            }
          />
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                <span className="pg-h2">
                  {editing ? "Edit concept" : "New concept"}
                </span>
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="pg-form-row">
                <label className="pg-field-label" htmlFor="c-name">
                  Name
                </label>
                <input
                  id="c-name"
                  className="pg-input"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="pg-form-row">
                <label className="pg-field-label" htmlFor="c-desc">
                  Description
                </label>
                <input
                  id="c-desc"
                  className="pg-input"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="pg-form-row">
                <label className="pg-field-label" htmlFor="c-tpl">
                  Prompt template
                </label>
                <textarea
                  id="c-tpl"
                  className="pg-input pg-textarea pg-mono"
                  style={{ fontSize: 12, lineHeight: 1.5 }}
                  required
                  rows={8}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  placeholder="Static Meta ad for {{product_name}}..."
                />
                <p className="text-xs" style={{ color: "var(--muted)", marginTop: 6 }}>
                  Available vars: product_name, client_name, description,
                  features, ingredients, price, product_image_url, logo_url.
                </p>
              </div>
              <DialogFooter>
                <button
                  type="submit"
                  className="pg-btn pg-btn--pop pg-btn--md"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <section className="space-y-3">
        <div className="pg-div" style={{ margin: 0 }}>
          <span>Defaults</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {defaults.map((c) => (
            <div key={c.id} className="pg-form-card" style={{ marginTop: 0 }}>
              <div className="flex items-center justify-between gap-2 mb8">
                <h4
                  style={{
                    fontFamily: "var(--headline)",
                    fontWeight: 800,
                    fontSize: 15,
                    letterSpacing: "-.01em",
                  }}
                >
                  {c.name}
                </h4>
                <span className="pg-badge pg-badge--outline">default</span>
              </div>
              <p
                className="text-xs line-clamp-3"
                style={{ color: "var(--muted)" }}
              >
                {c.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="pg-div" style={{ margin: 0 }}>
          <span>Custom</span>
        </div>
        {custom.length === 0 ? (
          <div className="pg-form-card" style={{ marginTop: 0 }}>
            <p
              className="text-sm"
              style={{
                color: "var(--muted)",
                textAlign: "center",
                padding: "32px 0",
              }}
            >
              You have not added any custom concepts yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {custom.map((c) => (
              <div key={c.id} className="pg-form-card" style={{ marginTop: 0 }}>
                <h4
                  className="mb8"
                  style={{
                    fontFamily: "var(--headline)",
                    fontWeight: 800,
                    fontSize: 15,
                    letterSpacing: "-.01em",
                  }}
                >
                  {c.name}
                </h4>
                <div className="space-y-3">
                  <p
                    className="text-xs line-clamp-3"
                    style={{ color: "var(--muted)" }}
                  >
                    {c.description}
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="pg-btn pg-btn--outline pg-btn--sm"
                      onClick={() => openEdit(c)}
                    >
                      Edit
                    </button>
                    <button
                      className="pg-btn pg-btn--ghost pg-btn--sm"
                      onClick={() => handleDelete(c)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
