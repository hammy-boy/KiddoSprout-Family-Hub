import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const [page, controller, data] = await Promise.all([
  readFile(new URL("_______/wisp/frontend/pages/profile.html", ROOT), "utf8"),
  readFile(new URL("_______/wisp/frontend/scripts/profile.js", ROOT), "utf8"),
  readFile(new URL("_______/wisp/frontend/scripts/chatData.js", ROOT), "utf8"),
]);

test("the profile editor persists only owner-scoped allowlisted fields", () => {
  assert.match(controller, /getOwnProfile\s*\(/);
  assert.match(controller, /updateOwnProfile\s*\(/);
  assert.match(data, /rpc\(WISP_RPCS\.updateOwnProfile/);
  assert.match(data, /OWN_PROFILE_UPDATE_KEYS/);
  assert.match(data, /show_online_status/);
  assert.match(data, /show_read_receipts/);
  assert.doesNotMatch(controller, /\.innerHTML\s*=|insertAdjacentHTML\s*\(/);
});

test("the native profile dialog validates and reports save results", () => {
  assert.match(page, /<dialog[^>]+id=["']edit-profile-dialog["']/i);
  assert.match(page, /id=["']profile-username-input["'][^>]+maxlength=["']32["']/i);
  assert.doesNotMatch(page, /id=["']profile-bio-input["'][^>]+maxlength=/i);
  assert.match(controller, /characterLength\(bio\)\s*>\s*280/);
  assert.match(controller, /dialog\.showModal\s*\(\)/);
  assert.match(controller, /form\.reportValidity\s*\(\)/);
  assert.match(controller, /dialog\.close\(\s*["']saved["']\s*\)/);
  assert.match(controller, /dialog\.addEventListener\(\s*["']cancel["']/);
  assert.match(controller, /aria-busy["']?\)\s*===\s*["']true["'][\s\S]*?preventDefault/);
  assert.match(controller, /Profile saved\./);
});

test("privacy switches are real and the removed placeholder settings stay gone", () => {
  assert.match(page, /id=["']online-status-toggle["']/);
  assert.match(page, /id=["']read-receipts-toggle["']/);
  assert.match(controller, /showOnlineStatus/);
  assert.match(controller, /showReadReceipts/);
  assert.match(controller, /toggle\.checked\s*=\s*previousValue/);
  assert.doesNotMatch(page, /Disappearing messages|Message notifications|Call notifications|Group activity|Change password/);
  assert.match(page, /changes are saved to your Wisp account/i);
});

test("the profile presence badge expires stale data and refreshes while visible", () => {
  assert.match(controller, /PRESENCE_FRESH_MS\s*=\s*90_000/);
  assert.match(controller, /Date\.now\(\)\s*-\s*seenAt\s*<\s*PRESENCE_FRESH_MS/);
  assert.match(controller, /scheduleProfilePresenceExpiry/);
  assert.match(controller, /PROFILE_REFRESH_MS\s*=\s*45_000/);
  assert.match(controller, /visibilitychange[\s\S]{0,180}?refreshProfile/);
  assert.match(controller, /pagehide[\s\S]{0,260}?clearInterval\(profileRefreshTimer\)/);
});
