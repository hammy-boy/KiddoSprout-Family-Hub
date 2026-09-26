import assert from "node:assert/strict";
import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const REQUIRED_NAMES = Object.freeze([
  "KIDDOSPROUT_ACCOUNT_ORIGIN",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "TURNSTILE_SITE_KEY"
]);
const REQUIRED_NAME_SET = new Set(REQUIRED_NAMES);
const MANAGED_SUPABASE_URL = /^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.supabase\.co$/i;
const MODERN_PUBLISHABLE_KEY = /^sb_publishable_[A-Za-z0-9_-]{12,}$/;
const SAFE_TURNSTILE_SITE_KEY = /^[A-Za-z0-9_-]{20,}$/;
const TURNSTILE_TEST_SITE_KEYS = new Set([
  "1x00000000000000000000AA",
  "2x00000000000000000000AB",
  "1x00000000000000000000BB",
  "2x00000000000000000000BB",
  "3x00000000000000000000FF"
]);
const MAX_FILE_BYTES = 16 * 1024;

function legacyKeyRole(value) {
  const parts = String(value || "").split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return "";
  try {
    return String(JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"))?.role || "").toLowerCase();
  } catch {
    return "";
  }
}

function parseOwnerSecrets(source) {
  const values = new Map();
  for (const [index, rawLine] of source.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    assert.ok(match, `Invalid .env.production entry on line ${index + 1}.`);
    const [, name, rawValue] = match;
    assert.ok(REQUIRED_NAME_SET.has(name), `Unexpected setting ${name} in .env.production.`);
    assert.equal(values.has(name), false, `Duplicate setting ${name} in .env.production.`);
    let value = rawValue.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    assert.ok(value, `${name} is empty in .env.production.`);
    values.set(name, value);
  }
  for (const name of REQUIRED_NAMES) assert.ok(values.has(name), `${name} is missing from .env.production.`);
  return values;
}

function exactHttpsOrigin(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:"
      && parsed.origin === value
      && !parsed.username
      && !parsed.password
      && parsed.pathname === "/"
      && !parsed.search
      && !parsed.hash;
  } catch {
    return false;
  }
}

const file = resolve(process.argv[2] || ".env.production");
const fileInfo = await lstat(file).catch(() => null);
assert.ok(fileInfo?.isFile(), "Create the ignored .env.production file before the first deployment.");
assert.ok(fileInfo.size > 0 && fileInfo.size <= MAX_FILE_BYTES,
  ".env.production must be a small, non-empty regular file.");
const values = parseOwnerSecrets(await readFile(file, "utf8"));

assert.ok(exactHttpsOrigin(values.get("KIDDOSPROUT_ACCOUNT_ORIGIN")),
  "KIDDOSPROUT_ACCOUNT_ORIGIN must be one exact HTTPS origin with no trailing slash or path.");
assert.ok(MANAGED_SUPABASE_URL.test(values.get("SUPABASE_URL")),
  "SUPABASE_URL must be the managed project origin https://<project-ref>.supabase.co.");
const publishableKey = values.get("SUPABASE_PUBLISHABLE_KEY");
assert.ok(MODERN_PUBLISHABLE_KEY.test(publishableKey) || legacyKeyRole(publishableKey) === "anon",
  "SUPABASE_PUBLISHABLE_KEY must be a browser-safe publishable/anon key, never a secret or service-role key.");
const turnstileSiteKey = values.get("TURNSTILE_SITE_KEY");
assert.ok(SAFE_TURNSTILE_SITE_KEY.test(turnstileSiteKey) && !TURNSTILE_TEST_SITE_KEYS.has(turnstileSiteKey),
  "TURNSTILE_SITE_KEY must be a real production site key, not an official test key.");

console.log("Sprout Tutor first-deploy settings are present and valid; no values were printed.");
