"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface Props {
  title: string;
  count: number;
  children: ReactNode;
}

// A single Netflix-style horizontal strip. Adds desktop arrow buttons and
// translates a vertical mouse wheel into horizontal scrolling so the row is
// navigable without a trackpad.
export function CategoryRow({ title, count, children }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => update();
    const onWheel = (e: WheelEvent) => {
      if (
        Math.abs(e.deltaY) > Math.abs(e.deltaX) &&
        el.scrollWidth > el.clientWidth
      ) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onScroll);
    };
  }, [update]);

  function nudge(dir: number) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.max(el.clientWidth * 0.8, 300),
      behavior: "smooth",
    });
  }

  return (
    <div className="pg-catrow">
      <div className="pg-catrow-head">
        <h3>{title}</h3>
        <span className="count">
          {count} image{count === 1 ? "" : "s"}
        </span>
      </div>
      <div className="pg-catrow-wrap">
        <button
          type="button"
          className={`pg-catrow-arrow left ${canLeft ? "" : "is-hidden"}`}
          onClick={() => nudge(-1)}
          aria-label="Scroll left"
        >
          ‹
        </button>
        <div className="pg-catrow-track" ref={trackRef}>
          {children}
        </div>
        <button
          type="button"
          className={`pg-catrow-arrow right ${canRight ? "" : "is-hidden"}`}
          onClick={() => nudge(1)}
          aria-label="Scroll right"
        >
          ›
        </button>
      </div>
    </div>
  );
}
