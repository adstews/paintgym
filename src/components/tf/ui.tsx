"use client";

// Training Floor UI primitives — ported from the design handoff (pg-ui.jsx)
// to typed TSX. Styling comes from the bespoke classes in training-floor.css.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

// ---------- icons (simple stroke set) ----------
const PATHS: Record<string, string> = {
  arrow: "M5 12h14M13 6l6 6-6 6",
  plus: "M12 5v14M5 12h14",
  x: "M6 6l12 12M18 6L6 18",
  check: "M5 13l4 4L19 7",
  sliders: "M4 8h10M18 8h2M4 16h2M10 16h10M14 6v4M8 14v4",
  star: "M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6L12 17l-5.4 2.8 1.2-6L3.3 9.4l6.1-.8z",
  sparkle: "M12 3v6M12 15v6M3 12h6M15 12h6M6.5 6.5l3 3M14.5 14.5l3 3M17.5 6.5l-3 3M9.5 14.5l-3 3",
  link: "M9 15l6-6M10 6l1-1a4 4 0 016 6l-1 1M14 18l-1 1a4 4 0 01-6-6l1-1",
  image: "M4 5h16v14H4zM4 15l4-4 5 5M14 13l2-2 4 4",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  download: "M12 4v11M7 11l5 5 5-5M5 20h14",
  chevL: "M15 6l-6 6 6 6",
  chevR: "M9 6l6 6-6 6",
  chevD: "M6 9l6 6 6-6",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4-4",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  bolt: "M13 3L4 14h7l-1 7 9-11h-7z",
  target: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01",
  wand: "M15 4V2M15 10V8M11 6H9M21 6h-2M18 9l-1.5-1.5M5 19l9-9M16.5 7.5L18 9",
  home: "M4 11l8-7 8 7M6 10v9h12v-9",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM5 20a7 7 0 0114 0",
  back: "M15 6l-6 6 6 6",
  refresh: "M4 12a8 8 0 0113-6l3 2M20 12a8 8 0 01-13 6l-3-2M17 4v4h-4M7 20v-4h4",
  warn: "M12 4l9 16H3zM12 10v4M12 17h.01",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
  dumbbell: "M6.5 6.5l11 11M4 8l2-2 4 4-2 2zM14 18l2-2 4-4-2-2-4 4-2 2 2 2zM4 8L2 10M22 14l-2 2",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 18,
  sw = 2,
  style,
}: {
  name: string;
  size?: number;
  sw?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      <path d={PATHS[name] || ""} />
    </svg>
  );
}

// ---------- buttons ----------
type BtnProps = {
  variant?: "dark" | "pop" | "outline" | "ghost";
  size?: "md" | "sm";
  icon?: string;
  iconR?: string;
  children?: ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Btn({
  variant = "dark",
  size = "md",
  icon,
  iconR,
  children,
  className = "",
  ...rest
}: BtnProps) {
  return (
    <button className={`pg-btn pg-btn--${variant} pg-btn--${size} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === "sm" ? 15 : 17} />}
      {children && <span>{children}</span>}
      {iconR && <Icon name={iconR} size={size === "sm" ? 15 : 17} />}
    </button>
  );
}

export function IconBtn({
  name,
  size = 18,
  label,
  className = "",
  ...rest
}: {
  name: string;
  size?: number;
  label?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`pg-iconbtn ${className}`} aria-label={label} {...rest}>
      <Icon name={name} size={size} />
    </button>
  );
}

// ---------- chip ----------
export function Chip({
  active,
  children,
  onClick,
  dot,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  dot?: string;
}) {
  return (
    <button className={`pg-chip ${active ? "is-on" : ""}`} onClick={onClick}>
      {dot && <span className="pg-chip-dot" style={{ background: dot }} />}
      {children}
    </button>
  );
}

// ---------- rating stars ----------
export function Stars({
  value = 0,
  onChange,
  size = 16,
}: {
  value?: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="pg-stars" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          className="pg-star-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (onChange) onChange(s === value ? 0 : s);
          }}
          onMouseEnter={() => setHover(s)}
        >
          <Icon
            name="star"
            size={size}
            sw={1.5}
            style={{
              color: (hover || value) >= s ? "var(--pop)" : "var(--ink)",
              fill: (hover || value) >= s ? "var(--pop)" : "transparent",
              opacity: (hover || value) >= s ? 1 : 0.25,
            }}
          />
        </button>
      ))}
    </div>
  );
}

// ---------- badge ----------
export function Badge({
  children,
  tone = "ink",
  className = "",
}: {
  children: ReactNode;
  tone?: "ink" | "pop" | "outline" | "red" | "ghost";
  className?: string;
}) {
  return <span className={`pg-badge pg-badge--${tone} ${className}`}>{children}</span>;
}

// ---------- skeleton ----------
export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={`pg-skel ${className}`} style={style} />;
}

// ---------- segmented control ----------
type SegOption = string | { v: string | number; label: string; icon?: string };
export function Segmented({
  options,
  value,
  onChange,
}: {
  options: SegOption[];
  value: string | number;
  onChange: (v: string | number) => void;
}) {
  return (
    <div className="pg-seg">
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.v;
        const lab = typeof o === "string" ? o : o.label;
        return (
          <button
            key={String(val)}
            className={`pg-seg-btn ${value === val ? "is-on" : ""}`}
            onClick={() => onChange(val)}
          >
            {typeof o !== "string" && o.icon && <Icon name={o.icon} size={14} />}
            {lab}
          </button>
        );
      })}
    </div>
  );
}

// ---------- bottom sheet ----------
export function Sheet({
  open,
  onClose,
  children,
  title,
  tall,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  tall?: boolean;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="pg-sheet-scrim" onClick={onClose}>
      <div className={`pg-sheet ${tall ? "pg-sheet--tall" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="pg-sheet-grab" />
        {title && (
          <div className="pg-sheet-head">
            <span className="pg-sheet-title">{title}</span>
            <IconBtn name="x" size={18} label="Close" onClick={onClose} />
          </div>
        )}
        <div className="pg-sheet-body">{children}</div>
      </div>
    </div>
  );
}

// ---------- toast host ----------
export type Toast = { id: string; msg: string; tone?: "ok" | "err" | "ink" };
export function ToastHost({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pg-toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`pg-toast pg-toast--${t.tone || "ink"}`}>
          {t.tone === "ok" && <Icon name="check" size={15} />}
          {t.tone === "err" && <Icon name="warn" size={15} />}
          {!t.tone && <Icon name="bolt" size={15} />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- striped placeholder block ----------
export function Placeholder({
  label,
  ratio = "4/5",
  className = "",
}: {
  label?: string;
  ratio?: string;
  className?: string;
}) {
  return (
    <div className={`pg-ph ${className}`} style={{ aspectRatio: ratio }}>
      <span>{label}</span>
    </div>
  );
}
