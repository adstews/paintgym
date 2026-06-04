"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/tf/ui";

// App nav (item 2). On >= 768px the links sit inline in the top bar. Below that
// they collapse behind a hamburger that opens a slide-down menu, so "Sign out"
// never gets clipped on small screens.
export function AppNav({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the menu whenever the route changes (a link was tapped).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Inline links — hidden under 768px via .pg-nav-desktop */}
      <nav className="pg-nav-desktop" aria-label="Main">
        <Link
          href="/dashboard"
          className="pg-btn pg-btn--ghost pg-btn--sm"
          style={{ textDecoration: "none" }}
        >
          <Icon name="home" size={15} />
          Gym
        </Link>
        <Link
          href="/concepts"
          className="pg-btn pg-btn--ghost pg-btn--sm"
          style={{ textDecoration: "none" }}
        >
          Concepts
        </Link>
        <Link
          href="/video"
          className="pg-btn pg-btn--ghost pg-btn--sm"
          style={{ textDecoration: "none" }}
        >
          Video
        </Link>
        <Link
          href="/pricing"
          className="pg-btn pg-btn--ghost pg-btn--sm"
          style={{ textDecoration: "none" }}
        >
          Pricing
        </Link>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="pg-btn pg-btn--outline pg-btn--sm"
            title={email}
          >
            Sign out
          </button>
        </form>
      </nav>

      {/* Hamburger — shown only under 768px via .pg-nav-burger */}
      <button
        type="button"
        className="pg-nav-burger"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={open ? "x" : "sliders"} size={20} />
      </button>

      {open && (
        <>
          <div className="pg-nav-scrim" onClick={() => setOpen(false)} />
          <div className="pg-nav-drawer" role="menu" aria-label="Main">
            <Link href="/dashboard" className="pg-nav-drawer-link" role="menuitem">
              <Icon name="home" size={18} />
              Gym
            </Link>
            <Link href="/concepts" className="pg-nav-drawer-link" role="menuitem">
              <Icon name="grid" size={18} />
              Concepts
            </Link>
            <Link href="/video" className="pg-nav-drawer-link" role="menuitem">
              <Icon name="image" size={18} />
              Video
            </Link>
            <Link href="/pricing" className="pg-nav-drawer-link" role="menuitem">
              <Icon name="bolt" size={18} />
              Pricing
            </Link>
            <form
              action="/api/auth/signout"
              method="post"
              style={{ marginTop: 6 }}
            >
              <button
                type="submit"
                className="pg-btn pg-btn--outline pg-btn--md pg-btn--block"
              >
                Sign out
              </button>
              <div
                className="pg-mono pg-muted"
                style={{ fontSize: 10.5, marginTop: 8, textAlign: "center" }}
              >
                {email}
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
