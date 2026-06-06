"use client";

import { useState, type FormEvent } from "react";

export function EmailCapture({
  source,
  heading,
  sub,
  cta = "Send it",
  payload,
}: {
  source: string;
  heading: string;
  sub: string;
  cta?: string;
  payload?: Record<string, unknown>;
}) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || busy) return;
    setBusy(true);
    try {
      await fetch("/api/tools/capture-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source, payload }),
      });
    } catch {
      // ignore network errors; do not block the user
    }
    setDone(true);
    setBusy(false);
  };

  return (
    <div className="pg-email">
      <h4>{heading}</h4>
      <p>{sub}</p>
      {done ? (
        <div className="ok">Check your inbox. We just sent it over.</div>
      ) : (
        <form className="row" onSubmit={submit}>
          <input
            type="email"
            required
            placeholder="you@brand.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email address"
          />
          <button
            type="submit"
            className="pg-btn pg-btn--pop pg-btn--md"
            disabled={busy}
          >
            {busy ? "Sending" : cta}
          </button>
        </form>
      )}
    </div>
  );
}
