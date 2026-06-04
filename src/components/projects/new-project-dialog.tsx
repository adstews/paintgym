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

export function NewProjectDialog({
  trigger,
}: {
  trigger?: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          client_name: clientName || null,
          product_url: productUrl || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to create");
      }
      const { id } = await res.json();
      toast.success("Project created");
      setOpen(false);
      router.push(`/projects/${id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <button className="pg-btn pg-btn--pop pg-btn--md">New project</button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <span className="pg-h2">New project</span>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate}>
          <div className="pg-form-row">
            <label className="pg-field-label" htmlFor="np-name">
              Project name
            </label>
            <input
              id="np-name"
              className="pg-input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Spring launch"
            />
          </div>
          <div className="pg-form-row">
            <label className="pg-field-label" htmlFor="np-client">
              Client
            </label>
            <input
              id="np-client"
              className="pg-input"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Acme Co."
            />
          </div>
          <div className="pg-form-row">
            <label className="pg-field-label" htmlFor="np-url">
              Product URL
            </label>
            <input
              id="np-url"
              className="pg-input"
              type="url"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://"
            />
          </div>
          <DialogFooter>
            <button
              type="submit"
              className="pg-btn pg-btn--pop pg-btn--md"
              disabled={loading || !name}
            >
              {loading ? "Creating..." : "Create project"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
