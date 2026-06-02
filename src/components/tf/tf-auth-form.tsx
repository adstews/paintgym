"use client";

// Training Floor auth — the design handoff's Auth screen wired to the REAL
// Supabase auth logic (signInWithPassword / signUp / OAuth / redirect / errors).
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Btn, Icon } from "@/components/tf/ui";

type Mode = "login" | "signup";

export function TfAuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") ?? "/dashboard";
  const signup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(redirectTo);
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
          },
        });
        if (error) throw error;
        setMessage("Check your inbox to confirm your email.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="pg-stage">
      <div className="pg-phone">
        <div className="pg-screen">
          <div className="pg-app">
            <div className="pg-topbar">
              <Link href="/" aria-label="Back" className="pg-iconbtn">
                <Icon name="back" size={18} />
              </Link>
              <span className="pg-wordmark">
                PAINT<span className="slash">/</span>GYM
              </span>
              <span style={{ width: 44 }} />
            </div>
            <div className="pg-scroll pg-pad" style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ marginTop: 18 }}>
                <div
                  className="kick pg-mono"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: ".12em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ width: 22, height: 1.5, background: "var(--ink)" }} />
                  {signup ? "5 free reps · no card" : "welcome back"}
                </div>
                <div className="pg-h2" style={{ fontSize: 34 }}>
                  {signup ? (
                    <>
                      Start
                      <br />
                      training.
                    </>
                  ) : (
                    <>
                      Back on
                      <br />
                      the floor.
                    </>
                  )}
                </div>
              </div>

              <form onSubmit={handleEmail} style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label className="pg-field-label">Email</label>
                  <input
                    className="pg-input"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@brand.co"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="pg-field-label">Password</label>
                  <input
                    className="pg-input"
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {!signup && (
                  <span
                    className="pg-mono"
                    style={{ fontSize: 11, color: "var(--muted)", alignSelf: "flex-end" }}
                  >
                    forgot password?
                  </span>
                )}
                {error && <p style={{ color: "var(--red)", fontSize: 13, fontWeight: 600 }}>{error}</p>}
                {message && <p style={{ color: "var(--ink-2)", fontSize: 13 }}>{message}</p>}
                <Btn variant="pop" icon="bolt" className="pg-btn--block" type="submit" disabled={loading}>
                  {loading ? "Working…" : signup ? "Create account" : "Log in"}
                </Btn>
              </form>

              <div className="pg-div" style={{ marginTop: 22 }}>
                <span>or</span>
              </div>
              <Btn variant="outline" className="pg-btn--block" onClick={handleGoogle} disabled={loading}>
                Continue with Google
              </Btn>

              <div style={{ marginTop: "auto", paddingTop: 26, textAlign: "center" }}>
                <span className="pg-mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                  {signup ? "Already training? " : "New here? "}
                  <Link
                    href={signup ? "/login" : "/signup"}
                    style={{ color: "var(--ink)", textDecoration: "underline", fontWeight: 700 }}
                  >
                    {signup ? "Log in" : "Create an account"}
                  </Link>
                </span>
              </div>
              <div style={{ height: 12 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
