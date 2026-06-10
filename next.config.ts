import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve("./"),
  },
  // Keep the headless-browser + image packages out of the bundle so their
  // native binaries (chromium, sharp) resolve at runtime in the Node server
  // function. These power the free HTML-rendered ad concepts.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "sharp"],
  // File tracing can't see @sparticuz/chromium's bin/*.br archives (they're
  // discovered with fs.readdir at runtime), so without this the deployed
  // function is missing /var/task/node_modules/@sparticuz/chromium/bin and
  // every HTML-concept render fails with "input directory does not exist".
  // Scoped to the four routes that actually launch chromium — the archives
  // are ~75 MB and would bloat every other function for nothing.
  outputFileTracingIncludes: {
    "/api/render-concept": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/generate": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/process-queue": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/queue/worker": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
};

export default nextConfig;
