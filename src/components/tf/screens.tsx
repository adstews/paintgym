"use client";

// Training Floor landing, ported from the design handoff. (The other mock
// screens — NewProject/Dashboard/Account — were removed with the /tf preview;
// the real app uses real server-component routes.)
import { useState } from "react";
import { Btn, Icon } from "@/components/tf/ui";

export function Landing({ onStart, onSkip }: { onStart: (u: string) => void; onSkip: () => void }) {
  const [url, setUrl] = useState("");
  const hotFw = [
    "One Core Idea",
    "Bold Claim",
    "Before & After",
    "Comparison Chart",
    "Meme",
    "Notes-app",
    "Chat Screenshot",
    "UGC Native",
    "Stat Drop",
    "Price Anchor",
    "Testimonial",
    "Tweet",
  ];
  const go = () => onStart(url.trim() || "lumenskin.co/products/vitamin-c-serum");
  return (
    <div className="pg-scroll pg-landing">
      <div className="pg-land-nav">
        <span className="pg-wordmark">
          PAINT<span className="slash">/</span>GYM
        </span>
        <Btn variant="ghost" size="sm" onClick={onSkip}>
          Log in
        </Btn>
      </div>

      <div className="pg-hero">
        <div className="kick">35 frameworks · 4:5 ads · in minutes</div>
        <h1>
          BUILD
          <br />
          AD <span className="lime">VOLUME</span>
        </h1>
        <p className="sub">
          Paste a product link. Paintgym trains a whole wall of ad concepts across 35 proven
          frameworks. Rate, refine, ship your PRs.
        </p>

        <div className="pg-pastebox">
          <div className="row">
            <Icon name="link" size={17} />
            <input
              placeholder="paste any product URL…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && go()}
            />
            <Btn variant="pop" size="sm" iconR="arrow" onClick={go}>
              Train
            </Btn>
          </div>
          <div className="hint">{"// no card required · 5 free reps to start"}</div>
        </div>

        <div className="pg-proof">
          <div className="av">
            <span />
            <span />
            <span />
            <span />
          </div>
          <small>
            <b>2,400+</b> DTC founders &amp; marketers training daily
          </small>
        </div>
      </div>

      <div className="pg-section">
        <div className="pg-section-k">
          <b>How it works</b> · three reps
        </div>
        <div className="pg-steps">
          <div className="pg-step">
            <span className="num">01</span>
            <div>
              <h4>Paste</h4>
              <p>Drop a product URL. We auto-pull the name, price, copy &amp; imagery.</p>
            </div>
          </div>
          <div className="pg-step">
            <span className="num">02</span>
            <div>
              <h4>Train</h4>
              <p>Generate a wall of concepts across 35 frameworks &amp; formats.</p>
            </div>
          </div>
          <div className="pg-step">
            <span className="num">03</span>
            <div>
              <h4>Ship</h4>
              <p>Rate, refine, version, and export high-res 4:5 ads.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pg-section">
        <div className="pg-section-k">
          <b>35 frameworks</b> · the full rack
        </div>
        <div className="pg-fwwall">
          {hotFw.map((f, i) => (
            <span key={f} className={`fw ${i < 4 ? "hot" : ""}`}>
              {f}
            </span>
          ))}
          <span className="fw">+23 more</span>
        </div>
      </div>

      <div className="pg-statband">
        <div className="big">18 ads / set</div>
        <p>
          One URL in. A wall of on-brand concepts out — the volume your media buyer actually needs.
        </p>
      </div>

      <div className="pg-land-cta">
        <h3>
          Stop guessing.
          <br />
          Start training.
        </h3>
        <div style={{ marginTop: 18 }}>
          <Btn variant="pop" icon="bolt" onClick={go} className="pg-btn--block">
            Start a free set
          </Btn>
        </div>
      </div>

      <div className="pg-land-foot">PAINTGYM © 2026 · a gym for your ad creative</div>
    </div>
  );
}
