import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, ROOT), "utf8");
}

test("Wisp profile editor exposes an accessible native-dialog form contract", async () => {
  const html = await read("_______/wisp/frontend/pages/profile.html");

  assert.match(html, /<dialog\b[^>]*id="edit-profile-dialog"[^>]*aria-labelledby="edit-profile-title"[^>]*aria-describedby="edit-profile-help"/);
  assert.match(html, /<form\b[^>]*id="edit-profile-form"/);
  assert.match(html, /<label for="profile-username-input">Username<\/label>/);
  assert.match(html, /<input\b[^>]*id="profile-username-input"[^>]*name="username"[^>]*maxlength="32"[^>]*required/);
  assert.match(html, /<label for="profile-bio-input">Bio/);
  assert.match(html, /<textarea\b[^>]*id="profile-bio-input"[^>]*name="bio"/);
  assert.match(html, /id="edit-profile-cancel"/);
  assert.match(html, /id="edit-profile-save"/);
  assert.match(html, /id="profile-banner"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
});

test("profile field limits stay aligned with the database constraints", async () => {
  const [html, controller, migration] = await Promise.all([
    read("_______/wisp/frontend/pages/profile.html"),
    read("_______/wisp/frontend/scripts/profile.js"),
    read("supabase/migrations/20261001135110_create_secure_wisp_messaging.sql"),
  ]);

  const databaseLimit = migration.match(/wisp_profiles_bio_length[\s\S]*?char_length\(bio\)\s*<=\s*(\d+)/)?.[1];
  assert.equal(databaseLimit, "280", "the Wisp profile bio database limit changed unexpectedly");
  assert.doesNotMatch(html, /id="profile-bio-input"[^>]*maxlength=/,
    "HTML maxlength counts UTF-16 units and would reject valid emoji-heavy bios too early");
  assert.match(controller, /characterLength\(bio\)\s*>\s*280/,
    "the profile form must enforce the Postgres limit by Unicode character");
  assert.match(html, /id="profile-username-input"[^>]*minlength="3"[^>]*maxlength="32"[^>]*pattern="\[A-Za-z0-9\]/);
});

test("implemented settings have stable IDs and placeholder controls are absent", async () => {
  const html = await read("_______/wisp/frontend/pages/profile.html");

  assert.match(html, /type="checkbox" id="online-status-toggle"[^>]*aria-label=/);
  assert.match(html, /type="checkbox" id="read-receipts-toggle"[^>]*aria-label=/);
  assert.match(html, /id="logout-btn"/);
  assert.match(html, /class="profile-settings-help" role="note"/);
  assert.doesNotMatch(html, />\s*Preview\s*</);
  assert.doesNotMatch(html, /Disappearing messages|Blocked contacts|Message notifications|Call notifications|Group activity|Change password/);
});

test("profile dialog remains usable on narrow phones and short landscape screens", async () => {
  const css = await read("_______/wisp/frontend/styles/screens.css");

  assert.match(css, /\.profile-dialog\s*\{[\s\S]*?width:\s*min\(440px, calc\(100vw - 32px\)\)/);
  assert.match(css, /\.profile-dialog::backdrop/);
  assert.match(css, /\.profile-dialog-body\s*\{[\s\S]*?overflow-y:\s*auto/);
  assert.match(css, /@media \(max-width:\s*359px\)[\s\S]*?\.profile-dialog-actions\s*\{[\s\S]*?flex-direction:\s*column-reverse/);
  assert.match(css, /@media \(max-height:\s*560px\) and \(orientation:\s*landscape\)[\s\S]*?\.profile-dialog/);
  assert.match(css, /\.profile-dialog textarea\s*\{[\s\S]*?font-size:\s*1rem/);
});
