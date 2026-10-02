import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../_______/wisp/frontend/scripts/chatData.js", import.meta.url),
  "utf8",
);

function functionBody(name) {
  const start = source.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `${name} must be exported.`);
  const nextExport = source.indexOf("\nexport async function ", start + 1);
  return source.slice(start, nextExport === -1 ? source.length : nextExport);
}

test("own-profile reads and writes are authenticated and owner-scoped", () => {
  const read = functionBody("getOwnProfile");
  const update = functionBody("updateOwnProfile");
  for (const body of [read, update]) {
    assert.match(body, /await\s+authenticatedUser\(\)/);
  }
  assert.match(read, /readOwnProfile\(client\)/,
    "Private owner fields must come from the guarded own-profile RPC.");
  assert.match(source, /rpc\(WISP_RPCS\.getOwnProfile\)/);
  assert.match(update, /rpc\(WISP_RPCS\.updateOwnProfile,\s*\{\s*p_changes:\s*updates\s*\}\)/,
    "Profile updates must use the atomic, current-user server operation.");
  assert.match(update, /return\s+normalizeOwnProfile\(data\)/,
    "The update must return the authoritative row from the same operation.");
  assert.match(update, /validatedOwnProfileUpdates\(changes\)/);
  assert.doesNotMatch(update, /\.from\(WISP_TABLES\.profiles\)[\s\S]*?\.update\(/,
    "Browser code must not implement the owner boundary with a direct table mutation.");
});

test("profile updates have a strict allowlist matching database constraints", () => {
  for (const field of ["username", "bio", "showOnlineStatus", "showReadReceipts"]) {
    assert.match(source, new RegExp(`["']${field}["']`));
  }
  assert.match(source, /USERNAME_PATTERN\s*=\s*\/\^\[A-Za-z0-9\]/);
  assert.match(source, /WISP_LIMITS\.username/);
  assert.match(source, /characterLength\(bio\)\s*>\s*280/);
  assert.match(source, /typeof\s+changes\.showOnlineStatus\s*!==\s*["']boolean["']/);
  assert.match(source, /typeof\s+changes\.showReadReceipts\s*!==\s*["']boolean["']/);
  assert.match(source, /!OWN_PROFILE_UPDATE_KEYS\.has\(key\)/,
    "Unknown profile keys must be rejected rather than ignored or spread into an update.");
  assert.doesNotMatch(source, /updates\s*=\s*\{\s*\.\.\.changes/);
});

test("private profile fields use guarded RPCs and stay out of direct peer queries", () => {
  assert.match(source, /PUBLIC_PROFILE_COLUMNS\s*=\s*["']id,username,bio,avatar_url["']/);
  assert.match(source, /rpc\(WISP_RPCS\.getOwnProfile\)/);
  assert.match(source, /rpc\(WISP_RPCS\.getVisibleProfiles/);
  assert.doesNotMatch(source, /PUBLIC_PROFILE_COLUMNS[^\n]*status|PUBLIC_PROFILE_COLUMNS[^\n]*show_/);
  assert.match(source, /status:\s*presenceIsFresh[\s\S]{0,80}?\?\s*["']online["']\s*:\s*null/);

  const peerStart = source.indexOf("function normalizePeerProfile");
  const ownStart = source.indexOf("function normalizeOwnProfile");
  const peerNormalizer = source.slice(peerStart, ownStart);
  assert.doesNotMatch(peerNormalizer, /show_online_status\s*:/,
    "A peer object must not expose another user's online-status preference.");
  assert.doesNotMatch(peerNormalizer, /show_read_receipts\s*:/,
    "A peer object must not expose another user's privacy preference.");

  const ownNormalizer = source.slice(ownStart, source.indexOf("function characterLength", ownStart));
  assert.match(ownNormalizer, /show_online_status\s*:/);
  assert.match(ownNormalizer, /show_read_receipts\s*:/);
});
