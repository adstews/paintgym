"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Btn } from "@/components/tf/ui";
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
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 9,
        }}
      >
        <span className="pg-field-label" style={{ marginBottom: 0 }}>
          {label}
        </span>
        <Btn
          type="button"
          variant="outline"
          size="sm"
          icon={multiple ? "plus" : "image"}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? "Uploading..." : multiple ? "Add image" : "Upload"}
        </Btn>
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
        <div
          className="pg-ph"
          style={{ aspectRatio: "auto", minHeight: 72, borderRadius: 3 }}
        >
          <span>No image uploaded yet</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {urls.map((u, i) => (
            <div
              key={u + i}
              style={{
                position: "relative",
                height: 96,
                width: 96,
                overflow: "hidden",
                borderRadius: 3,
                border: "1.5px solid var(--ink)",
                background: "#eceae3",
              }}
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
                style={{
                  position: "absolute",
                  right: 4,
                  top: 4,
                  border: "1.5px solid var(--ink)",
                  borderRadius: 2,
                  background: "rgba(255,255,255,.94)",
                  color: "var(--ink)",
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: ".04em",
                  textTransform: "uppercase",
                  padding: "3px 6px",
                  cursor: "pointer",
                }}
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
