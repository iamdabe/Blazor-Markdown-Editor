import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("wwwroot", { recursive: true });
copyFileSync("src/blazer-markdown-editor.css", "wwwroot/blazer-markdown-editor.css");

let build;
try {
  ({ build } = await import("esbuild"));
} catch {
  throw new Error(
    "Missing dev dependency 'esbuild'. Run 'npm ci' to install dependencies, then run 'npm run build'.",
  );
}

await build({
  entryPoints: ["src/blazer-markdown-editor.js"],
  bundle: true,
  format: "iife",
  target: ["es2020"],
  sourcemap: true,
  minify: false,
  outfile: "wwwroot/blazer-markdown-editor.js",
});
