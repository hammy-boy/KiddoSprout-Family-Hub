import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const names = Array.from({ length: 6 }, (_, index) => `app_${index + 1}.html`);
const pages = await Promise.all(names.map((name) => readFile(new URL(name, root), "utf8")));

function redirectScript(source) {
  const match = [...source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
    .find((candidate) => !/\bsrc\s*=/.test(candidate[1]) && candidate[2].includes("destination.search"));
  assert.ok(match, "Missing canonical redirect script.");
  return match[2];
}

for (const [index, source] of pages.entries()) {
  const name = names[index];
  assert.equal(source, pages[0], `${name} must stay aligned with the canonical legacy-route stub.`);
  assert.ok(Buffer.byteLength(source) < 5_000, `${name} still contains obsolete application code.`);
  assert.match(source, /<html lang="en-GB">/);
  assert.match(source, /<meta name="viewport" content="width=device-width, initial-scale=1\.0">/);
  assert.match(source, /<meta name="color-scheme" content="light dark">/);
  assert.match(source, /<link rel="canonical" href="recipe\.html">/);
  assert.doesNotMatch(source, /local-docker-redirect\.js/, `${name} must not race the canonical redirect through a retired local route.`);
  assert.match(source, /<noscript><meta http-equiv="refresh" content="0; url=recipe\.html"><\/noscript>/);
  assert.match(source, /<main>[\s\S]*?<h1>Opening FlavorNest…<\/h1>/);
  assert.match(source, /<p role="status">/);
  assert.match(source, /<a href="recipe\.html">open FlavorNest<\/a>/);
  assert.match(source, /a:focus-visible \{ outline: 3px solid var\(--focus\)/);
  assert.match(source, /@media \(prefers-color-scheme: dark\)/);
  assert.match(source, /width: min\(100%, 520px\)/);
  assert.match(source, /\* \{ box-sizing: border-box; \}/);
  assert.doesNotMatch(source, /SUPABASE_|fetch\(|localStorage|recipe-card|auth-form/,
    `${name} must not execute the retired auth/data client before redirecting.`);
}

function runRedirect(href) {
  const parsed = new URL(href);
  let replacedWith = "";
  const location = {
    href,
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    port: parsed.port,
    search: parsed.search,
    hash: parsed.hash,
    replace(value) { replacedWith = value; }
  };
  vm.runInNewContext(redirectScript(pages[0]), { window: { location }, URL, Set }, { filename: "legacy-app-redirect.js" });
  return replacedWith;
}

assert.equal(
  runRedirect("https://family.example/apps/app_1.html?meal=jollof#ingredients"),
  "https://family.example/apps/recipe.html?meal=jollof#ingredients"
);
assert.equal(
  runRedirect("http://127.0.0.1:8001/app_3.html?demo=1#saved"),
  "http://127.0.0.1:8001/recipe.html?demo=1#saved"
);
assert.equal(
  runRedirect("http://localhost:3000/app_6.html?demo=1#saved"),
  "http://127.0.0.1:8001/recipe.html?demo=1#saved"
);
assert.equal(
  runRedirect("file:///Users/example/Project.1/app_4.html?meal=soup#steps"),
  "file:///Users/example/Project.1/recipe.html?meal=soup#steps"
);
assert.equal(
  runRedirect("https://family.example/app_5.html?next=https%3A%2F%2Fevil.example#//evil.example"),
  "https://family.example/recipe.html?next=https%3A%2F%2Fevil.example#//evil.example",
  "User-controlled parameters must never change the fixed same-origin destination."
);

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((value) => Number.parseInt(value, 16) / 255);
  return channels
    .map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(first, second) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

assert.ok(contrast("0f7772", "ffffff") >= 4.5, "Light-theme fallback link must meet text contrast.");
assert.ok(contrast("8ee7d7", "102934") >= 4.5, "Dark-theme fallback link must meet text contrast.");
assert.ok(contrast("53677a", "ffffff") >= 4.5, "Light-theme fallback copy must meet text contrast.");
assert.ok(contrast("bdd0d6", "102934") >= 4.5, "Dark-theme fallback copy must meet text contrast.");

console.log("Legacy app routes passed: safe canonical redirect, query/hash preservation, fallback semantics, and responsive light/dark shell.");
