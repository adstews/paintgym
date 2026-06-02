import Link from "next/link";
import { Icon } from "@/components/tf/ui";

// Training Floor app chrome. Real nav links + real sign-out (POST /api/auth/signout)
// preserved; only the skin changed.
export function AppShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--paper)",
        fontFamily: "var(--ui)",
        color: "var(--ink)",
      }}
    >
      <header className="pg-topbar" style={{ position: "sticky", top: 0, zIndex: 30 }}>
        <Link href="/dashboard" className="pg-wordmark" style={{ textDecoration: "none", color: "inherit" }}>
          PAINT<span className="slash">/</span>GYM
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Link href="/dashboard" className="pg-btn pg-btn--ghost pg-btn--sm" style={{ textDecoration: "none" }}>
            <Icon name="home" size={15} />
            Gym
          </Link>
          <Link href="/concepts" className="pg-btn pg-btn--ghost pg-btn--sm" style={{ textDecoration: "none" }}>
            Concepts
          </Link>
          <Link href="/pricing" className="pg-btn pg-btn--ghost pg-btn--sm" style={{ textDecoration: "none" }}>
            Pricing
          </Link>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="pg-btn pg-btn--outline pg-btn--sm" title={email}>
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", width: "100%", padding: "22px 18px 48px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
