import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const CHAT = new URL("../_______/wisp/frontend/scripts/chat.js", import.meta.url);

test("Wisp message bubbles expose their sender to screen readers", async () => {
  const source = await readFile(CHAT, "utf8");

  assert.match(source, /sender\.className\s*=\s*["']visually-hidden["']/);
  assert.match(source, /message\.sender_id\s*===\s*myUserId[\s\S]*?["']You: ["']/);
  assert.match(source, /otherProfile\?\.username\s*\|\|\s*["']Contact["']/);
  assert.match(source, /content\.append\(sender\)/);
  assert.match(source, /content\.append\(document\.createTextNode/,
    "Adding visible message text must not overwrite the hidden sender label.");
});
