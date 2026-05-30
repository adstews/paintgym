"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "./toggle";
import { toast } from "sonner";
import { fillTemplate } from "@/lib/prompt";
import { SAMPLE_PROJECT } from "@/lib/sample-product";
import type { Concept } from "@/lib/types";
import type { ConceptWithUsage } from "@/app/api/admin/concepts/route";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ConceptWithUsage | null;
  onSaved: (concept: ConceptWithUsage) => void;
}

export function ConceptDialog({ open, onOpenChange, editing, onSaved }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        {open && (
          // Remount on each open or when switching target so the form
          // resets without an effect-driven setState.
          <ConceptForm
            key={`${editing?.id ?? "new"}`}
            editing={editing}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface Draft {
  name: string;
  description: string;
  prompt_template: string;
  sort_order: number;
  active: boolean;
}

function draftFrom(c: Concept | null): Draft {
  if (!c) {
    return {
      name: "",
      description: "",
      prompt_template: "",
      sort_order: 0,
      active: true,
    };
  }
  return {
    name: c.name,
    description: c.description,
    prompt_template: c.prompt_template,
    sort_order: c.sort_order,
    active: c.active,
  };
}

interface FormProps {
  editing: ConceptWithUsage | null;
  onSaved: (concept: ConceptWithUsage) => void;
  onClose: () => void;
}

function ConceptForm({ editing, onSaved, onClose }: FormProps) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(editing));
  const [busy, setBusy] = useState(false);

  function patch(p: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  const preview = fillTemplate(draft.prompt_template, SAMPLE_PROJECT);
  const canSave =
    draft.name.trim().length > 0 && draft.prompt_template.trim().length > 0;

  async function handleSave() {
    setBusy(true);
    try {
      const url = editing
        ? `/api/admin/concepts/${editing.id}`
        : "/api/admin/concepts";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? json.error ?? "Save failed");
      }
      const saved = json.concept as Concept;
      onSaved({
        ...saved,
        project_count: editing?.project_count ?? 0,
        generation_count: editing?.generation_count ?? 0,
      });
      toast.success(editing ? "Concept updated" : "Concept created");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {editing ? `Edit: ${editing.name}` : "New default concept"}
        </DialogTitle>
      </DialogHeader>

      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ac-name">Name</Label>
              <Input
                id="ac-name"
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="One Core Idea"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-sort">Sort order</Label>
              <Input
                id="ac-sort"
                type="number"
                min={0}
                step={10}
                value={draft.sort_order}
                onChange={(e) =>
                  patch({
                    sort_order: Number.parseInt(e.target.value || "0", 10),
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ac-desc">Description</Label>
            <Textarea
              id="ac-desc"
              rows={2}
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="One sentence summary of the concept"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ac-tpl">Prompt template</Label>
            <Textarea
              id="ac-tpl"
              rows={10}
              value={draft.prompt_template}
              onChange={(e) => patch({ prompt_template: e.target.value })}
              placeholder="Static Meta ad for {{product_name}}..."
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Variables: product_name, client_name, description, features,
              ingredients, price, product_image_url, logo_url.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Active</div>
              <p className="text-xs text-muted-foreground">
                Inactive concepts are hidden from all users.
              </p>
            </div>
            <Toggle
              on={draft.active}
              onChange={(next) => patch({ active: next })}
              label="Active"
            />
          </div>
        </TabsContent>

        <TabsContent value="preview" className="pt-4">
          <p className="mb-2 text-xs text-muted-foreground">
            Preview with sample data (Acme Sauces, Dragon Fire Hot Sauce,
            $12.99).
          </p>
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs leading-relaxed">
            {preview || "Add a prompt template to see the preview."}
          </pre>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!canSave || busy}>
          {busy ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}
