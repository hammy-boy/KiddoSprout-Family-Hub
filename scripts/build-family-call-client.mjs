import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";

const outputFile = new URL("../family-call-app.js", import.meta.url).pathname;

await build({
  entryPoints: [new URL("../src/family-call-app.mjs", import.meta.url).pathname],
  outfile: outputFile,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  minify: true,
  legalComments: "none",
  sourcemap: false,
  logLevel: "info"
});

// Supabase's bundled worker source contains indentation inside a template
// literal. Removing line-end padding keeps generated commits reviewable while
// preserving the worker program and every meaningful character.
const bundledSource = await readFile(outputFile, "utf8");
await writeFile(outputFile, bundledSource.replace(/[ \t]+$/gm, ""), "utf8");
