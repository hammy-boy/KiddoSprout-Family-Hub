import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { browserSafeSupabaseKey, internalSupabaseUrl } from "../server/account-service-config.mjs";
import {
  buildLocalBrowserConfig,
  serializeLocalBrowserConfig
} from "./create-local-supabase-config.mjs";

const publishableKey = "sb_publishable_security-regression-key";
const siteKey = "1x00000000000000000000AA";
const jwt = (role) => [
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify({ role })).toString("base64url"),
  "signature"
].join(".");

assert.equal(internalSupabaseUrl("https://safe-project.supabase.co/"), "https://safe-project.supabase.co");
assert.equal(internalSupabaseUrl("https://safe-project.supabase.co:4443"), "");
assert.equal(internalSupabaseUrl("https://attacker.example"), "");
assert.equal(internalSupabaseUrl("http://safe-project.supabase.co"), "");
assert.equal(internalSupabaseUrl("http://0.0.0.0:54321"), "http://0.0.0.0:54321");
assert.equal(internalSupabaseUrl("http://127.0.0.1:54321"), "http://host.docker.internal:54321");

assert.equal(browserSafeSupabaseKey(publishableKey), publishableKey);
assert.equal(browserSafeSupabaseKey(jwt("anon")), jwt("anon"));
assert.equal(browserSafeSupabaseKey(jwt("service_role")), "");
assert.equal(browserSafeSupabaseKey("sb_secret_private-server-key"), "");
assert.equal(browserSafeSupabaseKey("arbitrary-key"), "");

const localConfig = buildLocalBrowserConfig({
  SUPABASE_URL: "http://127.0.0.1:54321/",
  SUPABASE_PUBLISHABLE_KEY: publishableKey,
  TURNSTILE_SITE_KEY: siteKey,
  AUTH_EMAIL_DELIVERY_READY: "true",
  GOOGLE_AUTH_READY: "false"
});
assert.equal(localConfig.url, "http://127.0.0.1:54321");
assert.equal(localConfig.emailDeliveryReady, true);
assert.equal(localConfig.googleAuthReady, false);
assert.match(serializeLocalBrowserConfig(localConfig), /Object\.freeze\(\{/);

for (const unsafeEnvironment of [
  { SUPABASE_URL: "https://attacker.example", SUPABASE_PUBLISHABLE_KEY: publishableKey, TURNSTILE_SITE_KEY: siteKey },
  { SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_PUBLISHABLE_KEY: "sb_secret_private", TURNSTILE_SITE_KEY: siteKey },
  { SUPABASE_URL: "https://safe-project.supabase.co", SUPABASE_PUBLISHABLE_KEY: publishableKey, TURNSTILE_SITE_KEY: siteKey },
  { SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_PUBLISHABLE_KEY: publishableKey, TURNSTILE_SITE_KEY: siteKey, AUTH_EMAIL_DELIVERY_READY: "yes" }
]) {
  assert.throws(() => buildLocalBrowserConfig(unsafeEnvironment));
}

const publicConfig = buildLocalBrowserConfig({
  PUBLIC_DEMO_ONLY: "true",
  SUPABASE_PUBLISHABLE_KEY: "sb_secret_must-not-ship"
});
assert.deepEqual(publicConfig, { publicDemoOnly: true });
assert.doesNotMatch(serializeLocalBrowserConfig(publicConfig), /secret|publishableKey|turnstile/i);

const [launcher, blockerDockerfile, bankDockerfile, voiceDockerfile] = await Promise.all([
  readFile(new URL("./create-local-supabase-config.sh", import.meta.url), "utf8"),
  readFile(new URL("../Dockerfile.blocker", import.meta.url), "utf8"),
  readFile(new URL("../Dockerfile.bank", import.meta.url), "utf8"),
  readFile(new URL("../Dockerfile.voice", import.meta.url), "utf8")
]);
assert.doesNotMatch(launcher, /\.\s+\.\/\.env|source\s+\.env/);
assert.match(launcher, /create-local-supabase-config\.mjs/);
for (const dockerfile of [blockerDockerfile, bankDockerfile, voiceDockerfile]) {
  assert.match(dockerfile, /COPY server\/account-service-config\.mjs \/app\/account-service-config\.mjs/);
}

console.log("Account service configuration checks passed: trusted origins, browser-safe keys, and non-executing local .env handling.");
