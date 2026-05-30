"use client";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface Props<T extends string> {
  value: T;
  onChange: (next: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel?: string;
  size?: "sm" | "md";
  columns?: number;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = "md",
  columns,
}: Props<T>) {
  const cls = columns ? `grid gap-2 grid-cols-${columns}` : "flex flex-wrap gap-2";
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cls}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md border px-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              size === "sm" ? "py-1.5 text-xs" : "py-2 text-sm",
              selected
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background hover:bg-accent",
            )}
          >
            <div className="font-medium">{opt.label}</div>
            {opt.hint && (
              <div
                className={cn(
                  "mt-0.5 text-xs",
                  selected ? "text-background/80" : "text-muted-foreground",
                )}
              >
                {opt.hint}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
