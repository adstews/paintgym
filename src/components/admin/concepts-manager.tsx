"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ConceptDialog } from "./concept-dialog";
import { Toggle } from "./toggle";
import { cn } from "@/lib/utils";
import type { ConceptWithUsage } from "@/app/api/admin/concepts/route";

interface Props {
  initial: ConceptWithUsage[];
}

function sortConcepts(a: ConceptWithUsage, b: ConceptWithUsage): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.name.localeCompare(b.name);
}

export function ConceptsManager({ initial }: Props) {
  const [concepts, setConcepts] = useState<ConceptWithUsage[]>(() =>
    [...initial].sort(sortConcepts),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ConceptWithUsage | null>(null);

  const totals = useMemo(() => {
    let activeCount = 0;
    for (const c of concepts) if (c.active) activeCount += 1;
    return { total: concepts.length, active: activeCount };
  }, [concepts]);

  function applyConcept(saved: ConceptWithUsage) {
    setConcepts((arr) => {
      const i = arr.findIndex((c) => c.id === saved.id);
      const next = i === -1 ? [...arr, saved] : arr.map((c) => (c.id === saved.id ? saved : c));
      return next.sort(sortConcepts);
    });
  }

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(c: ConceptWithUsage) {
    setEditing(c);
    setDialogOpen(true);
  }

  async function patchConcept(
    id: string,
    patch: Partial<Pick<ConceptWithUsage, "sort_order" | "active">>,
  ): Promise<void> {
    const previous = concepts.find((c) => c.id === id);
    if (!previous) return;
    // Optimistic update
    setConcepts((arr) =>
      arr
        .map((c) => (c.id === id ? { ...c, ...patch } : c))
        .sort(sortConcepts),
    );
    try {
      const res = await fetch(`/api/admin/concepts/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? err.error ?? "Save failed");
      }
    } catch (err) {
      // Revert
      setConcepts((arr) =>
        arr.map((c) => (c.id === id ? previous : c)).sort(sortConcepts),
      );
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function handleDelete(c: ConceptWithUsage) {
    if (
      !window.confirm(
        `Delete "${c.name}"? This cannot be undone. Inactive is usually safer.`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/concepts/${c.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? err.error ?? "Delete failed");
      }
      setConcepts((arr) => arr.filter((row) => row.id !== c.id));
      toast.success("Concept deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Concepts</h1>
          <p className="text-sm text-muted-foreground">
            Default concepts shown to every user. {totals.active} of{" "}
            {totals.total} active.
          </p>
        </div>
        <Button onClick={openNew}>Add concept</Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium w-20">Sort</th>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Description</th>
                <th className="px-3 py-2 text-left font-medium w-32">Usage</th>
                <th className="px-3 py-2 text-left font-medium w-20">Active</th>
                <th className="px-3 py-2 text-right font-medium w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {concepts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No default concepts yet.
                  </td>
                </tr>
              ) : (
                concepts.map((c) => (
                  <ConceptRow
                    key={c.id}
                    concept={c}
                    onPatch={(p) => patchConcept(c.id, p)}
                    onEdit={() => openEdit(c)}
                    onDelete={() => handleDelete(c)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ConceptDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={applyConcept}
      />
    </div>
  );
}

interface RowProps {
  concept: ConceptWithUsage;
  onPatch: (patch: Partial<Pick<ConceptWithUsage, "sort_order" | "active">>) => Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
}

function ConceptRow({ concept, onPatch, onEdit, onDelete }: RowProps) {
  const [sortDraft, setSortDraft] = useState<string>(String(concept.sort_order));

  async function commitSort() {
    const next = Number.parseInt(sortDraft || "0", 10);
    if (Number.isNaN(next) || next === concept.sort_order) {
      setSortDraft(String(concept.sort_order));
      return;
    }
    await onPatch({ sort_order: next });
  }

  return (
    <tr className={cn("border-t", !concept.active && "bg-muted/30")}>
      <td className="px-3 py-2">
        <Input
          type="number"
          value={sortDraft}
          onChange={(e) => setSortDraft(e.target.value)}
          onBlur={commitSort}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          className="h-8 w-16"
        />
      </td>
      <td className="px-3 py-2 font-medium">{concept.name}</td>
      <td className="px-3 py-2 text-muted-foreground">
        <div className="line-clamp-2 max-w-md">{concept.description}</div>
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline">{concept.project_count} projects</Badge>
          <Badge variant="outline">{concept.generation_count} imgs</Badge>
        </div>
      </td>
      <td className="px-3 py-2">
        <Toggle
          on={concept.active}
          onChange={(next) => onPatch({ active: next })}
          label={`Active: ${concept.name}`}
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}
