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
};

export default nextConfig;
