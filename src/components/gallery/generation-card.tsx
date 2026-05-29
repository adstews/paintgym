"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Generation } from "@/lib/types";

interface Props {
  generation: Generation;
  conceptName: string;
  onRegenerate: () => Promise<void>;
}

export function GenerationCard({ generation, conceptName, onRegenerate }: Props) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleRegen() {
    setLoading(true);
    try {
      await onRegenerate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Regenerate failed");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!generation.image_url) return;
    const a = document.createElement("a");
    a.href = generation.image_url;
    a.download = `${conceptName.toLowerCase().replace(/\s+/g, "-")}-v${generation.version}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <button
            type="button"
            onClick={() => generation.image_url && setOpen(true)}
            className="block w-full aspect-[4/5] bg-muted relative group"
          >
            {generation.status === "generating" || loading ? (
              <Skeleton className="absolute inset-0" />
            ) : generation.image_url ? (
              <Image
                src={generation.image_url}
                alt={conceptName}
                fill
                sizes="(min-width:1024px) 320px, (min-width:640px) 50vw, 100vw"
                className="object-cover group-hover:scale-[1.02] transition"
                unoptimized
              />
            ) : generation.status === "failed" ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-destructive">
                Generation failed
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Pending
              </div>
            )}
          </button>
        </CardContent>
        <CardFooter className="flex items-center justify-between gap-2 p-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium truncate">{conceptName}</span>
            <Badge variant="outline" className="shrink-0">
              v{generation.version}
            </Badge>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDownload}
              disabled={!generation.image_url}
            >
              Download
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRegen}
              disabled={loading || generation.status === "generating"}
            >
              {loading ? "..." : "Regenerate"}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{conceptName} (v{generation.version})</DialogTitle>
          </DialogHeader>
          {generation.image_url && (
            <div className="relative w-full aspect-[4/5] bg-muted rounded-md overflow-hidden">
              <Image
                src={generation.image_url}
                alt={conceptName}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
