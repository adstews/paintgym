"use client";

import { cn } from "@/lib/utils";

interface Props {
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function Toggle({ on, onChange, disabled, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        on ? "bg-foreground" : "bg-muted-foreground/30",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-background transition",
          on ? "translate-x-[18px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}
