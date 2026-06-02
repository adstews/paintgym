"use client";

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
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="pg-chiprow"
      style={
        columns
          ? {
              display: "grid",
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
            }
          : undefined
      }
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
            className={`pg-chip ${selected ? "is-on" : ""}`}
            style={{
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 2,
              padding: size === "sm" ? "7px 10px" : "9px 12px",
              textAlign: "left",
            }}
          >
            <span style={{ fontWeight: 700 }}>{opt.label}</span>
            {opt.hint && (
              <span
                style={{
                  fontSize: 9.5,
                  letterSpacing: ".02em",
                  opacity: selected ? 0.85 : 0.7,
                }}
              >
                {opt.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
