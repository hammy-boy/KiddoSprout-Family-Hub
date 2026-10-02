import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../_______/wisp/frontend/", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, ROOT), "utf8");
}

test("Wisp call history can be searched locally with accessible result feedback", async () => {
  const [page, script] = await Promise.all([
    read("pages/calls.html"),
    read("scripts/calls.js"),
  ]);

  assert.match(page, /<label for="search-input" class="visually-hidden">Search call history<\/label>/);
  assert.match(page, /<input type="search" id="search-input"[^>]*enterkeyhint="search"[^>]*spellcheck="false"/);
  assert.match(page, /id="call-search-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(script, /searchInput\.addEventListener\("input", renderSearchResults\)/);
  assert.match(script, /callHistory\.filter/);
  assert.match(script, /matchingCalls\.length[^\n]*matching/);
  assert.match(script, /No calls match your search\./);
});

test("Wisp call rows describe direction and media type in text", async () => {
  const script = await read("scripts/calls.js");

  assert.match(script, /directionLabel\s*=\s*call\.direction\s*===\s*"incoming"\s*\?\s*"Incoming"\s*:\s*"Outgoing"/);
  assert.match(script, /typeLabel\s*=\s*call\.call_type\s*===\s*"video"\s*\?\s*"video"\s*:\s*"voice"/);
  assert.match(script, /Missed incoming[^\n]*typeLabel[^\n]*call/);
});
