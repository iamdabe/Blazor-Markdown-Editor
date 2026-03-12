import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const licenseHeader = `/* Copyright (c) 2026 David Walker\n   Licensed under the MIT License. */\n\n`;

mkdirSync("wwwroot", { recursive: true });
const cssContent = readFileSync("src/blazor-markdown-editor.css", "utf8");
writeFileSync("wwwroot/blazor-markdown-editor.css", `${licenseHeader}${cssContent}`);

let build;
try {
  ({ build } = await import("esbuild"));
} catch {
  throw new Error(
    "Missing dev dependency 'esbuild'. Run 'npm ci' to install dependencies, then run 'npm run build'.",
  );
}

const shared = {
  entryPoints: ["src/blazor-markdown-editor.js"],
  bundle: true,
  format: "iife",
  target: ["es2020"],
  banner: {
    js: licenseHeader,
  },
};

await Promise.all([
  build({
    ...shared,
    sourcemap: true,
    minify: false,
    outfile: "wwwroot/blazor-markdown-editor.js",
  }),
  build({
    ...shared,
    sourcemap: true,
    minify: true,
    outfile: "wwwroot/blazor-markdown-editor.min.js",
  }),
]);
