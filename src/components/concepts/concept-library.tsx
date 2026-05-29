"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Concepts</h1>
          <p className="text-sm text-muted-foreground">
            Templates that drive each ad image. Defaults are read-only.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button onClick={openNew}>New concept</Button>} />
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit concept" : "New concept"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="c-name">Name</Label>
                <Input
                  id="c-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-desc">Description</Label>
                <Input
                  id="c-desc"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-tpl">Prompt template</Label>
                <Textarea
                  id="c-tpl"
                  required
                  rows={8}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  placeholder="Static Meta ad for {{product_name}}..."
                />
                <p className="text-xs text-muted-foreground">
                  Available vars: product_name, client_name, description,
                  features, ingredients, price, product_image_url, logo_url.
                </p>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Defaults
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {defaults.map((c) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <Badge variant="secondary">default</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground line-clamp-3">
                {c.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Custom
        </h2>
        {custom.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              You have not added any custom concepts yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {custom.map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{c.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground line-clamp-3 space-y-3">
                  <p>{c.description}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(c)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(c)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
