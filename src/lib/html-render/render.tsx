import sharp from "sharp";
import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";
import {
  ChatGptChat,
  ClaudeChat,
  IMessage,
  InstagramStory,
  Notes,
  Reddit,
  TikTok,
  Tweet,
} from "./components";
import { RENDER_SCHEMAS } from "./types";
import type { HtmlRenderType, RenderContent } from "./types";
import type { ReactElement } from "react";

export const RENDER_WIDTH = 1080;
export const RENDER_HEIGHT = 1350;

type RenderFn = (node: ReactElement) => string;

// Build the inner markup for a render type from its (already validated) content.
function markupFor(
  type: HtmlRenderType,
  content: RenderContent,
  render: RenderFn,
): string {
  switch (type) {
    case "imessage":
      return render(<IMessage c={content as never} />);
    case "notes":
      return render(<Notes c={content as never} />);
    case "reddit":
      return render(<Reddit c={content as never} />);
    case "tweet":
      return render(<Tweet c={content as never} />);
    case "tiktok":
      return render(<TikTok c={content as never} />);
    case "instagram_story":
      return render(<InstagramStory c={content as never} />);
    case "claude":
      return render(<ClaudeChat c={content as never} />);
    case "chatgpt":
      return render(<ChatGptChat c={content as never} />);
  }
}

// Full HTML document: reset, Inter (every UI uses it) + Noto Color Emoji so the
// rating sticker etc. render, and the component markup at a fixed 1080x1350.
function documentFor(inner: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Serif:wght@600;700;800&family=Noto+Color+Emoji&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${RENDER_WIDTH}px; height: ${RENDER_HEIGHT}px; background: #fff; }
  body { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
  ul, li { list-style-position: outside; }
</style>
</head>
<body>${inner}</body>
</html>`;
}

// Pick the executable + launch flags. On Vercel/Lambda use @sparticuz/chromium;
// locally use an installed Chrome (override with PUPPETEER_EXECUTABLE_PATH).
async function launchBrowser(): Promise<Browser> {
  const isServerless =
    !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (isServerless) {
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: {
        width: RENDER_WIDTH,
        height: RENDER_HEIGHT,
        deviceScaleFactor: 2,
      },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const local =
    process.env.PUPPETEER_EXECUTABLE_PATH ??
    (process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : process.platform === "win32"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : "/usr/bin/google-chrome");
  return puppeteer.launch({
    executablePath: local,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: {
      width: RENDER_WIDTH,
      height: RENDER_HEIGHT,
      deviceScaleFactor: 2,
    },
    headless: true,
  });
}

// Validate the content against the render type's schema (throws on mismatch),
// render the component to HTML, screenshot it at 2x, and downscale to an exact
// 1080x1350 PNG returned as a data URL. No image-model cost.
export async function renderConceptToDataUrl(
  type: HtmlRenderType,
  rawContent: unknown,
): Promise<string> {
  const content = RENDER_SCHEMAS[type].parse(rawContent) as RenderContent;
  // Dynamic import keeps Next's bundler from statically flagging react-dom/server
  // in the app route graph (it's used purely server-side to make static markup).
  const { renderToStaticMarkup } = await import("react-dom/server");
  const html = documentFor(markupFor(type, content, renderToStaticMarkup));

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: RENDER_WIDTH,
      height: RENDER_HEIGHT,
      deviceScaleFactor: 2,
    });
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    // Make sure the web fonts have actually fetched and painted before the shot.
    await page
      .evaluate(async () => {
        await (document as Document).fonts.ready;
        await new Promise((r) => setTimeout(r, 200));
      })
      .catch(() => undefined);

    const shot = (await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: RENDER_WIDTH, height: RENDER_HEIGHT },
    })) as Buffer;

    // Downscale the 2x capture to the exact target so text stays crisp.
    const png = await sharp(shot)
      .resize(RENDER_WIDTH, RENDER_HEIGHT, { fit: "fill" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } finally {
    await browser.close().catch(() => undefined);
  }
}
