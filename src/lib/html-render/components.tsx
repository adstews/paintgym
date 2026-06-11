// These components are rendered to static markup and screenshotted by puppeteer
// (see render.tsx), never mounted in the Next app — so next/image's optimizer
// can't run here and a raw <img> is the correct, only option.
/* eslint-disable @next/next/no-img-element */
import React from "react";
import type {
  ChatContent,
  DiscussionContent,
  ImessageContent,
  InappProofContent,
  InstagramStoryContent,
  NotesContent,
  RedditContent,
  SocialMashupContent,
  TiktokContent,
  TweetContent,
} from "./types";

// All eight concepts render into a fixed 1080x1350 (4:5) frame with NO device
// border — just the app UI, zoomed so it reads at feed thumbnail scale. Styling
// is inline so each component is self-contained; the document shell only loads
// fonts + a reset (see render.ts).

const W = 1080;
const H = 1350;

function Frame({
  children,
  background,
}: {
  children: React.ReactNode;
  background: string;
}) {
  return (
    <div
      style={{
        width: W,
        height: H,
        background,
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {children}
    </div>
  );
}

// Deterministic avatar color from a string (no Math.random at render time).
function avatarColor(seed: string): string {
  const palette = [
    "#ff6b6b",
    "#4dabf7",
    "#51cf66",
    "#ffa94d",
    "#cc5de8",
    "#20c997",
    "#f783ac",
    "#5c7cfa",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function Avatar({
  seed,
  size,
  label,
}: {
  seed: string;
  size: number;
  label?: string;
}) {
  const initial = (label ?? seed).replace(/[^A-Za-z0-9]/g, "").charAt(0).toUpperCase() || "?";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background: avatarColor(seed),
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        fontSize: size * 0.46,
        flex: "0 0 auto",
      }}
    >
      {initial}
    </div>
  );
}

// ---- rich text for chat bubbles: paragraphs, "- " bullets, **bold** ---------
function boldSpans(line: string, keyBase: string): React.ReactNode[] {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={`${keyBase}-${i}`} style={{ fontWeight: 700 }}>
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={`${keyBase}-${i}`}>{p}</React.Fragment>;
  });
}

function RichText({ text, gap }: { text: string; gap: number }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let key = 0;
  const flush = () => {
    if (bullets.length) {
      const items = bullets;
      blocks.push(
        <ul
          key={`ul-${key++}`}
          style={{
            margin: 0,
            paddingLeft: 34,
            display: "flex",
            flexDirection: "column",
            gap: gap * 0.5,
          }}
        >
          {items.map((b, i) => (
            <li key={i}>{boldSpans(b, `li-${i}`)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };
  for (const raw of lines) {
    const m = raw.match(/^\s*[-*]\s+(.*)$/);
    if (m) {
      bullets.push(m[1]);
    } else {
      flush();
      if (raw.trim()) {
        blocks.push(
          <p key={`p-${key++}`} style={{ margin: 0 }}>
            {boldSpans(raw, `p-${key}`)}
          </p>,
        );
      }
    }
  }
  flush();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>{blocks}</div>
  );
}

// ===========================================================================
// 1. iMessage
// ===========================================================================
export function IMessage({ c, img }: { c: ImessageContent; img?: string | null }) {
  return (
    <Frame background="#ffffff">
      {/* nav bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "26px 36px 22px",
          borderBottom: "1px solid #e3e3e6",
          gap: 18,
        }}
      >
        <svg width={26} height={44} viewBox="0 0 26 44" fill="none">
          <path
            d="M22 6L8 22l14 16"
            stroke="#0a84ff"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Avatar seed={c.contact_name} size={84} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 600, color: "#000" }}>
              {c.contact_name}
            </span>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <path
                d="M9 6l6 6-6 6"
                stroke="#8e8e93"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <svg width={46} height={30} viewBox="0 0 46 30" fill="none">
          <rect x={2} y={5} width={30} height={20} rx={6} fill="#0a84ff" />
          <path d="M36 11l8-5v18l-8-5z" fill="#0a84ff" />
        </svg>
      </div>

      {/* thread */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "0 34px 30px",
          gap: 16,
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#86868b",
            fontSize: 21,
            margin: "26px 0 10px",
          }}
        >
          <span style={{ fontWeight: 600, color: "#6e6e73" }}>Today</span> 9:41 AM
        </div>
        {/* Shared product photo, like a friend texting a picture of the find. */}
        {img && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <img
              src={img}
              alt=""
              style={{
                maxWidth: "62%",
                maxHeight: 440,
                objectFit: "cover",
                borderRadius: 34,
                borderBottomLeftRadius: 12,
                display: "block",
              }}
            />
          </div>
        )}
        {c.messages.map((m, i) => {
          const me = m.from === "me";
          const lastMine =
            me &&
            !c.messages.slice(i + 1).some((x) => x.from === "me");
          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: me ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "74%",
                  padding: "20px 28px",
                  borderRadius: 34,
                  fontSize: 33,
                  lineHeight: 1.32,
                  color: me ? "#fff" : "#000",
                  background: me
                    ? "linear-gradient(180deg,#37a0ff,#0a7cff)"
                    : "#e9e9eb",
                  borderBottomRightRadius: me ? 12 : 34,
                  borderBottomLeftRadius: me ? 34 : 12,
                }}
              >
                {m.text}
              </div>
              {lastMine && (
                <span
                  style={{
                    fontSize: 19,
                    color: "#86868b",
                    margin: "8px 8px 0 0",
                  }}
                >
                  Delivered
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* input bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 30px 34px",
          borderTop: "1px solid #ededf0",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 56,
            background: "#e9e9eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#8e8e93",
            fontSize: 38,
            fontWeight: 400,
          }}
        >
          +
        </div>
        <div
          style={{
            flex: 1,
            height: 60,
            borderRadius: 30,
            border: "1.5px solid #d6d6da",
            display: "flex",
            alignItems: "center",
            padding: "0 26px",
            color: "#aeaeb2",
            fontSize: 28,
          }}
        >
          iMessage
        </div>
      </div>
    </Frame>
  );
}

// ===========================================================================
// 2. Apple Notes
// ===========================================================================
export function Notes({ c, img }: { c: NotesContent; img?: string | null }) {
  return (
    <Frame background="#fffbe7">
      {/* header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "30px 40px 18px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width={24} height={40} viewBox="0 0 24 40" fill="none">
            <path
              d="M20 5L7 20l13 15"
              stroke="#f5b50a"
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ color: "#f5b50a", fontSize: 28 }}>Notes</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
          <svg width={34} height={40} viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3v12m0-12L8 7m4-4l4 4M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"
              stroke="#f5b50a"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <svg width={34} height={40} viewBox="0 0 24 24" fill="none">
            <path
              d="M4 20h16M14 4l6 6L9 21l-6 1 1-6L11 4z"
              stroke="#f5b50a"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* body */}
      <div style={{ padding: "20px 56px", flex: 1 }}>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "#1a1a1a",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          {c.title}
        </div>
        <div style={{ fontSize: 22, color: "#a99f73", margin: "16px 0 36px" }}>
          {c.date}
        </div>
        {/* Saved product photo attached to the note. */}
        {img && (
          <img
            src={img}
            alt=""
            style={{
              width: 340,
              height: 340,
              objectFit: "cover",
              borderRadius: 18,
              display: "block",
              marginBottom: 38,
            }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {c.lines.map((l, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 18,
                fontSize: 34,
                lineHeight: 1.4,
                color: "#222",
              }}
            >
              {l.bullet && (
                <span style={{ color: "#f5b50a", flex: "0 0 auto", fontSize: 34 }}>
                  •
                </span>
              )}
              <span>{l.text}</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ===========================================================================
// 3. Reddit post (mobile post-detail screen — fixed "best performing" layout)
// ===========================================================================
const REDDIT_BLUE = "#1e6fd6";

function RedditVote({ dir }: { dir: "up" | "down" }) {
  // Outlined arrow matching the Reddit app vote control.
  return (
    <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#878a8c" strokeWidth={2.2}>
      {dir === "up" ? (
        <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export function Reddit({ c, img }: { c: RedditContent; img?: string | null }) {
  const paragraphs = c.post_body
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <Frame background="#ffffff">
      {/* blue app header */}
      <div
        style={{
          background: REDDIT_BLUE,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "30px 34px",
          flex: "0 0 auto",
        }}
      >
        {/* close */}
        <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4}>
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
        <div style={{ display: "flex", alignItems: "center", gap: 38 }}>
          {/* search */}
          <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          {/* sort / sliders */}
          <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}>
            <path d="M4 7h11M19 7h1M4 17h1M9 17h11" strokeLinecap="round" />
            <circle cx="17" cy="7" r="2.4" fill="#fff" stroke="none" />
            <circle cx="7" cy="17" r="2.4" fill="#fff" stroke="none" />
          </svg>
          {/* more */}
          <svg width={40} height={40} viewBox="0 0 24 24" fill="#fff">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
          {/* account avatar with online dot */}
          <div style={{ position: "relative", width: 46, height: 46 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 46,
                background: "#bcc6cf",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width={34} height={34} viewBox="0 0 24 24" fill="#7a8894">
                <circle cx="12" cy="13" r="6.5" />
                <circle cx="18" cy="6.5" r="2" />
              </svg>
            </div>
            <div
              style={{
                position: "absolute",
                right: -1,
                bottom: -1,
                width: 16,
                height: 16,
                borderRadius: 16,
                background: "#46d160",
                border: "3px solid " + REDDIT_BLUE,
              }}
            />
          </div>
        </div>
      </div>

      {/* post body */}
      <div style={{ flex: 1, padding: "34px 40px 0", display: "flex", flexDirection: "column" }}>
        {/* subreddit row */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 26 }}>
          <div
            style={{
              width: 66,
              height: 66,
              borderRadius: 66,
              background: "#1a1a2e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "0 0 auto",
            }}
          >
            <span style={{ color: "#fff", fontSize: 28, fontWeight: 800 }}>r/</span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 27, fontWeight: 700, color: "#1a1a1b" }}>
              r/{c.subreddit}
            </span>
            <span style={{ fontSize: 22, color: "#787c7e" }}>
              u/{c.post_author} · {c.posted}
            </span>
          </div>
          <div
            style={{
              background: REDDIT_BLUE,
              color: "#fff",
              fontSize: 24,
              fontWeight: 700,
              padding: "14px 34px",
              borderRadius: 999,
              flex: "0 0 auto",
            }}
          >
            Join
          </div>
        </div>

        {/* serif title */}
        <div
          style={{
            fontFamily: "'Noto Serif', Georgia, 'Times New Roman', serif",
            fontSize: 50,
            fontWeight: 700,
            color: "#0b0b0b",
            lineHeight: 1.16,
            letterSpacing: "-0.005em",
            marginBottom: 30,
          }}
        >
          {c.post_title}
        </div>

        {/* image embedded in the post */}
        {img && (
          <img
            src={img}
            alt=""
            style={{
              width: "100%",
              maxHeight: 520,
              objectFit: "cover",
              borderRadius: 16,
              display: "block",
              marginBottom: 30,
            }}
          />
        )}

        {/* body paragraphs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {paragraphs.map((p, i) => (
            <div
              key={i}
              style={{ fontSize: 31, color: "#1a1a1b", lineHeight: 1.45 }}
            >
              {boldSpans(p, `rb-${i}`)}
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* action bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "30px 0 40px",
          }}
        >
          {/* vote pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              border: "1.5px solid #d6d8da",
              borderRadius: 999,
              padding: "14px 22px",
            }}
          >
            <RedditVote dir="up" />
            <span style={{ fontSize: 28, fontWeight: 700, color: "#1a1a1b" }}>
              {c.upvotes}
            </span>
            <RedditVote dir="down" />
          </div>
          {/* comment pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              border: "1.5px solid #d6d8da",
              borderRadius: 999,
              padding: "14px 24px",
            }}
          >
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#878a8c" strokeWidth={2}>
              <path d="M21 11.5a8.38 8.38 0 01-9 8.5 8.5 8.5 0 01-4-1L3 20l1.5-4.5A8.38 8.38 0 0112 3a8.5 8.5 0 019 8.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 28, fontWeight: 700, color: "#1a1a1b" }}>
              {c.comments_count}
            </span>
          </div>
          <div style={{ flex: 1 }} />
          {/* award */}
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: 70,
              border: "1.5px solid #d6d8da",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#878a8c" strokeWidth={2}>
              <circle cx="12" cy="9" r="6" />
              <path d="M9 14.5L7.5 22l4.5-2.6L16.5 22 15 14.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {/* share */}
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: 70,
              border: "1.5px solid #d6d8da",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#878a8c" strokeWidth={2}>
              <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ===========================================================================
// 4. Tweet
// ===========================================================================
function Verified() {
  return (
    <svg width={34} height={34} viewBox="0 0 22 22">
      <path
        fill="#1d9bf0"
        d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
      />
    </svg>
  );
}

export function Tweet({ c, img }: { c: TweetContent; img?: string | null }) {
  const stat = (
    icon: React.ReactNode,
    value: string,
    color = "#536471",
  ) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, color }}>
      {icon}
      <span style={{ fontSize: 26 }}>{value}</span>
    </div>
  );
  return (
    <Frame background="#ffffff">
      <div style={{ padding: "70px 56px", display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 30 }}>
          <Avatar seed={c.handle} label={c.name} size={92} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: "#0f1419" }}>
                {c.name}
              </span>
              {c.verified && <Verified />}
            </div>
            <span style={{ fontSize: 27, color: "#536471" }}>@{c.handle}</span>
          </div>
          <svg width={40} height={40} viewBox="0 0 24 24" fill="#536471">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </div>

        <div style={{ fontSize: 46, lineHeight: 1.35, color: "#0f1419", fontWeight: 400 }}>
          {c.text}
        </div>

        {/* attached photo on the tweet */}
        {img && (
          <img
            src={img}
            alt=""
            style={{
              width: "100%",
              maxHeight: 560,
              objectFit: "cover",
              borderRadius: 24,
              border: "1px solid #cfd9de",
              display: "block",
              marginTop: 30,
            }}
          />
        )}

        <div style={{ fontSize: 25, color: "#536471", margin: "34px 0 26px" }}>
          9:41 AM · {c.time}
        </div>
        <div style={{ height: 1, background: "#eff3f4", marginBottom: 26 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 60 }}>
          {stat(
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#536471" strokeWidth={2}>
              <path d="M21 11.5a8.38 8.38 0 01-9 8.5 8.5 8.5 0 01-4-1L3 20l1.5-4.5A8.38 8.38 0 0112 3a8.5 8.5 0 019 8.5z" />
            </svg>,
            c.replies,
          )}
          {stat(
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#536471" strokeWidth={2}>
              <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>,
            c.retweets,
            "#00ba7c",
          )}
          {stat(
            <svg width={32} height={32} viewBox="0 0 24 24" fill="#f91880">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>,
            c.likes,
            "#f91880",
          )}
          {c.views &&
            stat(
              <svg width={32} height={32} viewBox="0 0 24 24" fill="#536471">
                <rect x="3" y="13" width="4" height="8" rx="1" />
                <rect x="10" y="8" width="4" height="13" rx="1" />
                <rect x="17" y="3" width="4" height="18" rx="1" />
              </svg>,
              c.views,
            )}
        </div>
      </div>
    </Frame>
  );
}

// ===========================================================================
// 5. TikTok comment section
// ===========================================================================
export function TikTok({ c, img }: { c: TiktokContent; img?: string | null }) {
  const railIcon = (icon: React.ReactNode, label: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {icon}
      <span style={{ fontSize: 22, fontWeight: 600, color: "#fff" }}>{label}</span>
    </div>
  );
  return (
    <Frame background="linear-gradient(160deg,#2b2b34,#15151b 60%,#000)">
      {/* video area: caption + right rail, over the product as the video frame */}
      <div
        style={{
          height: 560,
          position: "relative",
          background: img
            ? `linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.58)), url(${img}) center/cover no-repeat`
            : "transparent",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: 28,
            bottom: 40,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 40,
          }}
        >
          <div style={{ position: "relative", marginBottom: 8 }}>
            <Avatar seed={c.username} size={88} />
            <div
              style={{
                position: "absolute",
                bottom: -14,
                left: "50%",
                transform: "translateX(-50%)",
                width: 36,
                height: 36,
                borderRadius: 36,
                background: "#fe2c55",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 500,
                border: "3px solid #15151b",
              }}
            >
              +
            </div>
          </div>
          {railIcon(
            <svg width={64} height={64} viewBox="0 0 24 24" fill="#fff">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>,
            c.likes,
          )}
          {railIcon(
            <svg width={64} height={64} viewBox="0 0 24 24" fill="#fff">
              <path d="M21 11.5a8.5 8.5 0 01-9 8.5 8.5 8.5 0 01-4-1L3 20l1.5-4.5A8.5 8.5 0 1121 11.5z" />
            </svg>,
            c.comments_count,
          )}
          {railIcon(
            <svg width={64} height={64} viewBox="0 0 24 24" fill="#fff">
              <path d="M21 12l-9 7v-3.5C7 15.5 4 17 2 21c0-7 4-10 10-10V7.5z" />
            </svg>,
            c.shares,
          )}
        </div>
        <div
          style={{
            position: "absolute",
            left: 32,
            right: 180,
            bottom: 36,
            color: "#fff",
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 12 }}>
            @{c.username}
          </div>
          <div style={{ fontSize: 27, lineHeight: 1.35 }}>{c.caption}</div>
        </div>
      </div>

      {/* comment sheet */}
      <div
        style={{
          flex: 1,
          background: "#fff",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: "30px 34px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            textAlign: "center",
            fontSize: 27,
            fontWeight: 700,
            color: "#161823",
            paddingBottom: 24,
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          {c.comments_count} comments
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingTop: 28 }}>
          {c.comments.map((cm, i) => (
            <div key={i} style={{ display: "flex", gap: 18 }}>
              <Avatar seed={cm.username} size={64} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 23, color: "#8a8b91", fontWeight: 600 }}>
                  {cm.username}
                </span>
                <span style={{ fontSize: 30, color: "#161823", lineHeight: 1.35 }}>
                  {cm.text}
                </span>
                <span style={{ fontSize: 21, color: "#8a8b91", marginTop: 2 }}>
                  2d &nbsp; Reply
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#c5c6cc" strokeWidth={2}>
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z" />
                </svg>
                <span style={{ fontSize: 20, color: "#8a8b91" }}>{cm.likes}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ===========================================================================
// 6. Instagram Story
// ===========================================================================
export function InstagramStory({
  c,
  img,
}: {
  c: InstagramStoryContent;
  img?: string | null;
}) {
  // The product photo IS the story; a soft scrim keeps the white overlay legible.
  // Falls back to the signature IG gradient when there's no product image.
  const background = img
    ? `linear-gradient(180deg, rgba(0,0,0,0.28), rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.5)), url(${img}) center/cover no-repeat`
    : "linear-gradient(150deg,#833ab4,#fd1d1d 55%,#fcb045)";
  return (
    <Frame background={background}>
      {/* progress bars */}
      <div style={{ display: "flex", gap: 8, padding: "26px 24px 0" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 6,
              background: "rgba(255,255,255,0.4)",
              overflow: "hidden",
            }}
          >
            {i === 0 && (
              <div style={{ width: "100%", height: "100%", background: "#fff" }} />
            )}
          </div>
        ))}
      </div>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "22px 28px" }}>
        <div
          style={{
            padding: 3,
            borderRadius: 999,
            background: "rgba(255,255,255,0.85)",
          }}
        >
          <Avatar seed={c.username} size={62} />
        </div>
        <span style={{ fontSize: 27, fontWeight: 700, color: "#fff" }}>
          {c.username}
        </span>
        <span style={{ fontSize: 24, color: "rgba(255,255,255,0.8)" }}>
          {c.time_ago}
        </span>
        <div style={{ flex: 1 }} />
        <svg width={40} height={40} viewBox="0 0 24 24" fill="#fff">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
        <span style={{ fontSize: 44, color: "#fff", fontWeight: 300 }}>×</span>
      </div>

      {/* overlay text */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 18,
          padding: "0 56px",
        }}
      >
        {c.overlay_lines.map((line, i) => (
          <span
            key={i}
            style={{
              fontSize: 50,
              fontWeight: 800,
              color: "#fff",
              background: "rgba(0,0,0,0.32)",
              padding: "10px 24px",
              borderRadius: 12,
              textAlign: "center",
              lineHeight: 1.25,
              letterSpacing: "-0.01em",
            }}
          >
            {line}
          </span>
        ))}

        {c.sticker && (
          <div style={{ marginTop: 34, width: "82%" }}>
            {c.sticker.type === "poll" && (
              <div
                style={{
                  background: "rgba(255,255,255,0.95)",
                  borderRadius: 22,
                  padding: "26px 28px",
                  transform: "rotate(-3deg)",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
                }}
              >
                <div style={{ fontSize: 30, fontWeight: 700, color: "#222", textAlign: "center", marginBottom: 20 }}>
                  {c.sticker.question}
                </div>
                <div style={{ display: "flex", gap: 14 }}>
                  {[c.sticker.option_a, c.sticker.option_b].map((o, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        textAlign: "center",
                        fontSize: 28,
                        fontWeight: 700,
                        color: i === 0 ? "#d6249f" : "#333",
                        background: i === 0 ? "rgba(214,36,159,0.12)" : "#f1f1f1",
                        padding: "16px 0",
                        borderRadius: 14,
                      }}
                    >
                      {o}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {c.sticker.type === "question" && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 22,
                  padding: "30px 28px",
                  transform: "rotate(-2deg)",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 30, fontWeight: 700, color: "#222", marginBottom: 18 }}>
                  {c.sticker.prompt}
                </div>
                <div
                  style={{
                    fontSize: 26,
                    color: "#999",
                    background: "#f1f1f1",
                    borderRadius: 999,
                    padding: "16px 0",
                  }}
                >
                  Type something...
                </div>
              </div>
            )}
            {c.sticker.type === "rating" && (
              <div
                style={{
                  background: "linear-gradient(90deg,#feda75,#fa7e1e,#d62976)",
                  borderRadius: 22,
                  padding: "28px 30px 40px",
                  transform: "rotate(-2deg)",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
                }}
              >
                <div style={{ fontSize: 30, fontWeight: 800, color: "#fff", textAlign: "center", marginBottom: 22 }}>
                  {c.sticker.prompt}
                </div>
                <div style={{ position: "relative", height: 14, background: "rgba(255,255,255,0.4)", borderRadius: 14 }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: "82%", background: "#fff", borderRadius: 14 }} />
                  <div style={{ position: "absolute", left: "82%", top: "50%", transform: "translate(-50%,-50%)", fontSize: 52 }}>
                    😍
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "24px 28px 38px" }}>
        <div
          style={{
            flex: 1,
            height: 64,
            borderRadius: 999,
            border: "2px solid rgba(255,255,255,0.7)",
            display: "flex",
            alignItems: "center",
            padding: "0 28px",
            color: "rgba(255,255,255,0.9)",
            fontSize: 26,
          }}
        >
          Send message
        </div>
        <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z" />
        </svg>
        <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Frame>
  );
}

// ===========================================================================
// 7. Claude chat
// ===========================================================================
function ClaudeLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#d97757">
      <path d="M12 2c.3 2.2.9 3.8 1.8 4.7.9.9 2.5 1.5 4.7 1.8-2.2.3-3.8.9-4.7 1.8-.9.9-1.5 2.5-1.8 4.7-.3-2.2-.9-3.8-1.8-4.7-.9-.9-2.5-1.5-4.7-1.8 2.2-.3 3.8-.9 4.7-1.8C11.1 5.8 11.7 4.2 12 2z" />
      <path d="M19 13c.2 1.3.5 2.2 1 2.7.5.5 1.4.8 2.7 1-1.3.2-2.2.5-2.7 1-.5.5-.8 1.4-1 2.7-.2-1.3-.5-2.2-1-2.7-.5-.5-1.4-.8-2.7-1 1.3-.2 2.2-.5 2.7-1 .5-.5.8-1.4 1-2.7z" />
    </svg>
  );
}

export function ClaudeChat({ c, img }: { c: ChatContent; img?: string | null }) {
  // The product photo rides along with the first thing the user sends ("what do
  // you think of this?"), like a real image attachment.
  const firstUserIdx = c.messages.findIndex((m) => m.role === "user");
  return (
    <Frame background="#f0eee6">
      {/* top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "30px 40px",
          borderBottom: "1px solid #e6e2d6",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ClaudeLogo size={40} />
          <span style={{ fontSize: 32, fontWeight: 600, color: "#2b2a27" }}>
            Claude
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            border: "1.5px solid #d9d4c5",
            borderRadius: 999,
            padding: "10px 20px",
            color: "#6b6862",
            fontSize: 23,
          }}
        >
          Claude Opus 4.5
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#6b6862" strokeWidth={2}>
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* conversation */}
      <div style={{ flex: 1, padding: "40px 44px", display: "flex", flexDirection: "column", gap: 38, overflow: "hidden" }}>
        {c.messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
              <div
                style={{
                  maxWidth: "82%",
                  background: "#e9e4d7",
                  borderRadius: 22,
                  padding: "22px 30px",
                  fontSize: 32,
                  lineHeight: 1.4,
                  color: "#2b2a27",
                }}
              >
                {img && i === firstUserIdx && (
                  <img
                    src={img}
                    alt=""
                    style={{
                      width: "100%",
                      maxHeight: 380,
                      objectFit: "cover",
                      borderRadius: 14,
                      display: "block",
                      marginBottom: 18,
                    }}
                  />
                )}
                {m.text}
              </div>
            </div>
          ) : (
            <div key={i} style={{ display: "flex", gap: 20 }}>
              <div style={{ flex: "0 0 auto", marginTop: 4 }}>
                <ClaudeLogo size={44} />
              </div>
              <div
                style={{
                  flex: 1,
                  fontSize: 32,
                  lineHeight: 1.5,
                  color: "#2b2a27",
                }}
              >
                <RichText text={m.text} gap={22} />
              </div>
            </div>
          ),
        )}
      </div>

      {/* input bar */}
      <div style={{ padding: "16px 40px 40px" }}>
        <div
          style={{
            border: "1.5px solid #d9d4c5",
            background: "#fbfaf6",
            borderRadius: 26,
            padding: "26px 30px",
            color: "#a8a496",
            fontSize: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          Reply to Claude...
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#d97757",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}>
              <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ===========================================================================
// 8. ChatGPT chat
// ===========================================================================
function ChatGptLogo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#000">
      <path d="M22.28 9.82a5.98 5.98 0 00-.52-4.91 6.05 6.05 0 00-6.51-2.9A5.98 5.98 0 0010.7.02a6.05 6.05 0 00-5.77 4.19 5.98 5.98 0 00-4 2.9 6.05 6.05 0 00.75 7.09 5.98 5.98 0 00.51 4.91 6.05 6.05 0 006.52 2.9A5.98 5.98 0 0013.3 23.98a6.05 6.05 0 005.77-4.2 5.98 5.98 0 004-2.9 6.05 6.05 0 00-.75-7.06zm-9 12.6a4.48 4.48 0 01-2.88-1.04l.14-.08 4.78-2.76a.78.78 0 00.4-.68v-6.74l2.02 1.17a.07.07 0 01.04.05v5.58a4.5 4.5 0 01-4.5 4.5zM3.6 18.3a4.48 4.48 0 01-.54-3.01l.14.08 4.78 2.76a.78.78 0 00.78 0l5.84-3.37v2.33a.07.07 0 01-.03.06l-4.83 2.79a4.5 4.5 0 01-6.14-1.64zM2.34 7.9a4.48 4.48 0 012.35-1.97v5.68a.78.78 0 00.39.68l5.84 3.37-2.02 1.17a.07.07 0 01-.07 0l-4.83-2.79A4.5 4.5 0 012.34 7.9zm16.6 3.86l-5.84-3.38 2.02-1.16a.07.07 0 01.07 0l4.83 2.78a4.5 4.5 0 01-.68 8.12v-5.68a.78.78 0 00-.4-.68zm2.01-3.02l-.14-.08-4.78-2.77a.78.78 0 00-.78 0L9.4 9.26V6.92a.07.07 0 01.03-.06l4.83-2.78a4.5 4.5 0 016.68 4.66zM8.3 12.86l-2.02-1.16a.07.07 0 01-.04-.06V6.07a4.5 4.5 0 017.38-3.45l-.14.08L8.7 5.46a.78.78 0 00-.4.68v6.72zm1.1-2.37l2.6-1.5 2.6 1.5v3l-2.6 1.5-2.6-1.5z" />
    </svg>
  );
}

export function ChatGptChat({ c, img }: { c: ChatContent; img?: string | null }) {
  const firstUserIdx = c.messages.findIndex((m) => m.role === "user");
  const action = (icon: React.ReactNode) => (
    <div style={{ color: "#8e8ea0", display: "flex", alignItems: "center" }}>{icon}</div>
  );
  return (
    <Frame background="#ffffff">
      {/* top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "32px 40px",
          borderBottom: "1px solid #ececf1",
        }}
      >
        <span style={{ fontSize: 32, fontWeight: 600, color: "#0d0d0d" }}>
          ChatGPT
        </span>
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#8e8ea0" strokeWidth={2}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* conversation */}
      <div style={{ flex: 1, padding: "40px 44px", display: "flex", flexDirection: "column", gap: 36, overflow: "hidden" }}>
        {c.messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
              <div
                style={{
                  maxWidth: "80%",
                  background: "#f4f4f4",
                  borderRadius: 28,
                  padding: "22px 32px",
                  fontSize: 32,
                  lineHeight: 1.4,
                  color: "#0d0d0d",
                }}
              >
                {img && i === firstUserIdx && (
                  <img
                    src={img}
                    alt=""
                    style={{
                      width: "100%",
                      maxHeight: 380,
                      objectFit: "cover",
                      borderRadius: 18,
                      display: "block",
                      marginBottom: 18,
                    }}
                  />
                )}
                {m.text}
              </div>
            </div>
          ) : (
            <div key={i} style={{ display: "flex", gap: 20 }}>
              <div
                style={{
                  flex: "0 0 auto",
                  width: 56,
                  height: 56,
                  borderRadius: 56,
                  border: "1.5px solid #e5e5e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 2,
                }}
              >
                <ChatGptLogo size={34} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 22 }}>
                <div style={{ fontSize: 32, lineHeight: 1.5, color: "#0d0d0d" }}>
                  <RichText text={m.text} gap={22} />
                </div>
                <div style={{ display: "flex", gap: 30, marginTop: 6 }}>
                  {action(
                    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15V5a2 2 0 012-2h10" />
                    </svg>,
                  )}
                  {action(
                    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path d="M7 10v11M7 10l4-7a2 2 0 013 2l-1 5h5a2 2 0 012 2.3l-1.4 6A2 2 0 0117 21H7" />
                    </svg>,
                  )}
                  {action(
                    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path d="M17 14V3M17 14l-4 7a2 2 0 01-3-2l1-5H6a2 2 0 01-2-2.3l1.4-6A2 2 0 017 3h10" />
                    </svg>,
                  )}
                  {action(
                    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path d="M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>,
                  )}
                </div>
              </div>
            </div>
          ),
        )}
      </div>

      {/* input bar */}
      <div style={{ padding: "16px 40px 40px" }}>
        <div
          style={{
            border: "1.5px solid #e5e5e5",
            borderRadius: 30,
            padding: "26px 32px",
            color: "#8e8ea0",
            fontSize: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          Message ChatGPT
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 56,
              background: "#0d0d0d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}>
              <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </Frame>
  );
}

// ===========================================================================
// 9. Discussion thread (Facebook Group / forum post + replies)
// ===========================================================================
const FB_BLUE = "#1877f2";

export function Discussion({
  c,
  img,
}: {
  c: DiscussionContent;
  img?: string | null;
}) {
  return (
    <Frame background="#f0f2f5">
      {/* group header */}
      <div
        style={{
          background: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "30px 36px 26px",
          borderBottom: "1px solid #e4e6eb",
          flex: "0 0 auto",
        }}
      >
        <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#1c1e21" strokeWidth={2.4}>
          <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div
          style={{
            width: 66,
            height: 66,
            borderRadius: 16,
            background: "linear-gradient(135deg,#1877f2,#0a59c9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 auto",
          }}
        >
          <svg width={38} height={38} viewBox="0 0 24 24" fill="#fff">
            <circle cx="8" cy="9" r="3.2" />
            <circle cx="16" cy="9" r="3.2" />
            <path d="M2.5 19c.6-3.2 2.7-5 5.5-5s4.9 1.8 5.5 5zM10.5 19c.6-3.2 2.7-5 5.5-5s4.9 1.8 5.5 5z" />
          </svg>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 30, fontWeight: 700, color: "#1c1e21" }}>
            {c.group_name}
          </span>
          <span style={{ fontSize: 22, color: "#65676b" }}>Public group</span>
        </div>
      </div>

      {/* OP post card */}
      <div style={{ background: "#fff", padding: "28px 36px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24 }}>
          <Avatar seed={c.op_name} size={74} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: "#1c1e21" }}>
              {c.op_name}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 21, color: "#65676b" }}>{c.op_time}</span>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#65676b" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
              </svg>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 33, lineHeight: 1.45, color: "#1c1e21" }}>
          {c.post_text}
        </div>
        {img && (
          <img
            src={img}
            alt=""
            style={{
              width: "100%",
              maxHeight: 420,
              objectFit: "cover",
              borderRadius: 14,
              display: "block",
              marginTop: 24,
            }}
          />
        )}
        {/* like/comment/share bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            marginTop: 26,
            paddingTop: 18,
            borderTop: "1px solid #e4e6eb",
            color: "#65676b",
            fontSize: 26,
            fontWeight: 600,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#65676b" strokeWidth={2}>
              <path d="M7 11v9H4a1 1 0 01-1-1v-7a1 1 0 011-1zM7 11l4-7a2 2 0 013 2l-1 5h5a2 2 0 012 2.3l-1.4 6A2 2 0 0117 20H7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Like
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#65676b" strokeWidth={2}>
              <path d="M21 11.5a8.38 8.38 0 01-9 8.5 8.5 8.5 0 01-4-1L3 20l1.5-4.5A8.38 8.38 0 0112 3a8.5 8.5 0 019 8.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Comment
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#65676b" strokeWidth={2}>
              <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Share
          </span>
        </div>
      </div>

      {/* replies */}
      <div style={{ flex: 1, padding: "26px 36px", display: "flex", flexDirection: "column", gap: 28 }}>
        {c.replies.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 18 }}>
            <Avatar seed={r.name} size={64} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
              <div
                style={{
                  background: "#f0f2f5",
                  borderRadius: 22,
                  padding: "18px 26px",
                  maxWidth: "100%",
                }}
              >
                <div style={{ fontSize: 25, fontWeight: 700, color: "#1c1e21", marginBottom: 8 }}>
                  {r.name}
                </div>
                <div style={{ fontSize: 29, lineHeight: 1.4, color: "#1c1e21" }}>
                  {r.text}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 26, padding: "0 14px" }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: "#65676b" }}>Like</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: "#65676b" }}>Reply</span>
                <span style={{ fontSize: 22, color: "#65676b" }}>{r.time}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 30,
                      background: FB_BLUE,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="#fff">
                      <path d="M7 11l4-7a2 2 0 013 2l-1 5h5a2 2 0 012 2.3l-1.4 6A2 2 0 0117 21H7z" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 22, color: "#65676b" }}>{r.likes}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

// ===========================================================================
// 10. In-app proof shot (sales / analytics dashboard screenshot)
// ===========================================================================
const PROOF_GREEN = "#008060";

export function InappProof({
  c,
  img,
}: {
  c: InappProofContent;
  img?: string | null;
}) {
  // Default to a believable upward trend if the model didn't supply a chart.
  const bars =
    c.chart && c.chart.length >= 4
      ? c.chart
      : [28, 34, 30, 46, 52, 61, 70, 84];
  const maxBar = Math.max(...bars, 1);
  return (
    <Frame background="#f6f6f7">
      {/* app top bar */}
      <div
        style={{
          background: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "30px 40px",
          borderBottom: "1px solid #e1e3e5",
          flex: "0 0 auto",
        }}
      >
        {img ? (
          <img
            src={img}
            alt=""
            style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover", flex: "0 0 auto" }}
          />
        ) : (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: PROOF_GREEN,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}>
              <path d="M4 19V5M4 19l5-6 4 3 7-9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
        <span style={{ fontSize: 32, fontWeight: 800, color: "#1a1a1a" }}>
          {c.app_name}
        </span>
        <div style={{ flex: 1 }} />
        <svg width={40} height={40} viewBox="0 0 24 24" fill="#9a9ea3">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </div>

      <div style={{ flex: 1, padding: "40px 44px", display: "flex", flexDirection: "column", gap: 32 }}>
        <span style={{ fontSize: 27, fontWeight: 600, color: "#6d7175" }}>
          {c.screen_label}
        </span>

        {/* hero metric card */}
        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            border: "1px solid #e1e3e5",
            padding: "40px 44px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ fontSize: 28, color: "#6d7175", marginBottom: 14 }}>
            {c.hero_label}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 22, marginBottom: 36 }}>
            <span style={{ fontSize: 92, fontWeight: 800, color: "#1a1a1a", lineHeight: 1, letterSpacing: "-0.02em" }}>
              {c.hero_value}
            </span>
            {c.hero_delta && (
              <span
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  color: PROOF_GREEN,
                  background: "rgba(0,128,96,0.12)",
                  borderRadius: 999,
                  padding: "8px 20px",
                  marginBottom: 12,
                }}
              >
                {c.hero_delta}
              </span>
            )}
          </div>
          {/* bar chart */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 240 }}>
            {bars.map((b, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.max(6, (b / maxBar) * 100)}%`,
                  background:
                    i === bars.length - 1
                      ? PROOF_GREEN
                      : "rgba(0,128,96,0.25)",
                  borderRadius: 8,
                }}
              />
            ))}
          </div>
        </div>

        {/* supporting stat tiles */}
        <div style={{ display: "flex", gap: 22 }}>
          {c.stats.map((s, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: "#fff",
                borderRadius: 20,
                border: "1px solid #e1e3e5",
                padding: "28px 26px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 42, fontWeight: 800, color: "#1a1a1a", letterSpacing: "-0.01em" }}>
                {s.value}
              </span>
              <span style={{ fontSize: 23, color: "#6d7175", lineHeight: 1.3 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ===========================================================================
// 11. Social proof mashup (collage of mini cross-platform praise cards)
// ===========================================================================
const PLATFORM_META: Record<
  SocialMashupContent["items"][number]["platform"],
  { label: string; color: string; icon: React.ReactNode }
> = {
  tweet: {
    label: "X",
    color: "#0f1419",
    icon: (
      <svg width={26} height={26} viewBox="0 0 24 24" fill="#fff">
        <path d="M18.9 2H22l-7 8 8.2 12h-6.4l-5-7.3L6 22H2.9l7.5-8.6L2 2h6.6l4.6 6.7zM17.8 20h1.7L8 4H6.2z" />
      </svg>
    ),
  },
  tiktok: {
    label: "TikTok",
    color: "#000000",
    icon: (
      <svg width={26} height={26} viewBox="0 0 24 24" fill="#fff">
        <path d="M16 3c.3 2.2 1.6 3.7 3.8 4v3c-1.4 0-2.7-.4-3.8-1.1V15a5.5 5.5 0 11-5.5-5.5c.3 0 .6 0 .9.1v3.1a2.5 2.5 0 102.1 2.5V3z" />
      </svg>
    ),
  },
  instagram: {
    label: "Instagram",
    color: "#d6249f",
    icon: (
      <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="#fff" stroke="none" />
      </svg>
    ),
  },
  review: {
    label: "Verified review",
    color: "#f5a623",
    icon: (
      <svg width={26} height={26} viewBox="0 0 24 24" fill="#fff">
        <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.7L12 17.8 5.9 20.3l1.4-6.7L2.2 9l6.9-.7z" />
      </svg>
    ),
  },
  email: {
    label: "Email",
    color: "#4285f4",
    icon: (
      <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  facebook: {
    label: "Facebook",
    color: "#1877f2",
    icon: (
      <svg width={26} height={26} viewBox="0 0 24 24" fill="#fff">
        <path d="M14 9V7c0-1 .5-1.5 1.7-1.5H17V2.2C16.6 2.1 15.5 2 14.3 2 11.7 2 10 3.6 10 6.3V9H7v3.5h3V22h4v-9.5h3l.5-3.5z" />
      </svg>
    ),
  },
};

function Stars({ n }: { n: number }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={26} height={26} viewBox="0 0 24 24" fill={i < n ? "#f5a623" : "#dcdfe3"}>
          <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.7L12 17.8 5.9 20.3l1.4-6.7L2.2 9l6.9-.7z" />
        </svg>
      ))}
    </div>
  );
}

export function SocialMashup({
  c,
  img,
}: {
  c: SocialMashupContent;
  img?: string | null;
}) {
  return (
    <Frame background="#eef0f3">
      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "40px 44px 30px",
          flex: "0 0 auto",
        }}
      >
        {img && (
          <img
            src={img}
            alt=""
            style={{ width: 70, height: 70, borderRadius: 16, objectFit: "cover", flex: "0 0 auto" }}
          />
        )}
        <span style={{ fontSize: 38, fontWeight: 800, color: "#15181c", letterSpacing: "-0.01em" }}>
          What people are saying
        </span>
      </div>

      {/* cards */}
      <div style={{ flex: 1, padding: "0 44px 44px", display: "flex", flexDirection: "column", gap: 24 }}>
        {c.items.map((it, i) => {
          const meta = PLATFORM_META[it.platform];
          return (
            <div
              key={i}
              style={{
                background: "#fff",
                borderRadius: 24,
                padding: "30px 34px",
                boxShadow: "0 4px 18px rgba(15,24,32,0.07)",
                borderTop: `5px solid ${meta.color}`,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: meta.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "0 0 auto",
                  }}
                >
                  {meta.icon}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 27, fontWeight: 700, color: "#15181c" }}>
                    {it.author}
                  </span>
                  <span style={{ fontSize: 21, color: "#6b7177" }}>
                    {it.handle ? it.handle : meta.label}
                  </span>
                </div>
                {it.stars && <Stars n={it.stars} />}
              </div>
              <div style={{ fontSize: 30, lineHeight: 1.4, color: "#1c2025" }}>
                {it.text}
              </div>
              {it.likes && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6b7177" }}>
                  <svg width={26} height={26} viewBox="0 0 24 24" fill="#f91880">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  <span style={{ fontSize: 22 }}>{it.likes}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Frame>
  );
}
