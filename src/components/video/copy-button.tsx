"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/tf/ui";

// Small copy-to-clipboard control used on prompt templates and generated
// prompts throughout the video section.
export function CopyButton({
  text,
  label = "Copy",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`pg-btn pg-btn--outline pg-btn--sm ${className}`}
    >
      <Icon name={copied ? "check" : "copy"} size={14} />
      {copied ? "Copied" : label}
    </button>
  );
}
