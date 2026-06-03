import Link from "next/link";
import { AppNav } from "./app-nav";

// Training Floor app chrome. Real nav links + real sign-out (POST /api/auth/signout)
// preserved; only the skin changed. Nav collapses to a hamburger under 768px.
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
        <AppNav email={email} />
      </header>
      <main style={{ flex: 1 }}>
        <div className="pg-shell-main">
          {children}
        </div>
      </main>
    </div>
  );
}
