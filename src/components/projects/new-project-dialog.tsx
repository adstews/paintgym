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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <DialogTrigger render={trigger ?? <Button>New project</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="np-name">Project name</Label>
            <Input
              id="np-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Spring launch"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-client">Client</Label>
            <Input
              id="np-client"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Acme Co."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-url">Product URL</Label>
            <Input
              id="np-url"
              type="url"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !name}>
              {loading ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
