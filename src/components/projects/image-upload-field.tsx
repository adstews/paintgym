"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  label: string;
  urls: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
  folder: string;
  accept?: string;
}

export function ImageUploadField({
  label,
  urls,
  onChange,
  multiple = false,
  folder,
  accept = "image/*",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    const next = multiple ? [...urls] : [];
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", folder);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message ?? err.error ?? "Upload failed");
        }
        const json = await res.json();
        next.push(json.url);
        if (!multiple) break;
      }
      onChange(next);
      toast.success(`${label} uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(i: number) {
    const next = urls.filter((_, idx) => idx !== i);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? "Uploading..." : multiple ? "Add image" : "Upload"}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      {urls.length === 0 ? (
        <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
          No image uploaded yet
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {urls.map((u, i) => (
            <div
              key={u + i}
              className="relative h-24 w-24 overflow-hidden rounded-md border bg-muted"
            >
              <Image
                src={u}
                alt={`${label} ${i + 1}`}
                fill
                sizes="96px"
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="Remove image"
                className="absolute right-1 top-1 rounded bg-background/90 px-1.5 py-0.5 text-xs font-medium text-foreground shadow-sm hover:bg-background"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
