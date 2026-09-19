import { chmodSync, existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isBrowserSafeSupabaseKey, parseDotEnv } from "./email-readiness.mjs";

const MANAGED_SUPABASE_URL = /^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.supabase\.co$/i;
const LOCAL_SUPABASE_URL = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/i;
const SAFE_TURNSTILE_SITE_KEY = /^[A-Za-z0-9_-]{20,}$/;
const TURNSTILE_TEST_SITE_KEYS = new Set([
  "1x00000000000000000000AA",
  "2x00000000000000000000AB",
  "1x00000000000000000000BB",
  "2x00000000000000000000BB",
  "3x00000000000000000000FF"
]);

function booleanSetting(environment, name, fallback = false) {
  const raw = String(environment[name] ?? "").trim();
  if (!raw) return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${name} must be exactly true or false.`);
}

function normalizedSupabaseUrl(value) {
  const candidate = String(value || "").trim().replace(/\/+$/, "");
  if (!MANAGED_SUPABASE_URL.test(candidate) && !LOCAL_SUPABASE_URL.test(candidate)) return "";
  try {
    const parsed = new URL(candidate);
    if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") return "";
    const port = parsed.port ? Number(parsed.port) : 0;
    if (parsed.port && (!Number.isSafeInteger(port) || port < 1 || port > 65_535)) return "";
    return candidate;
  } catch (error) {
    return "";
  }
}

export function buildLocalBrowserConfig(environment) {
  if (booleanSetting(environment, "PUBLIC_DEMO_ONLY", false)) {
    return Object.freeze({ publicDemoOnly: true });
  }

  const url = normalizedSupabaseUrl(environment.SUPABASE_URL);
  const publishableKey = String(
    environment.SUPABASE_PUBLISHABLE_KEY || environment.SUPABASE_ANON_KEY || ""
  ).trim();
  const turnstileSiteKey = String(environment.TURNSTILE_SITE_KEY || "").trim();
  if (!url || !publishableKey || !turnstileSiteKey) {
    throw new Error("Browser account configuration is incomplete. Use npm run dev for the Docker app.");
  }
  if (!isBrowserSafeSupabaseKey(publishableKey)) {
    throw new Error("SUPABASE_PUBLISHABLE_KEY must be a browser-safe publishable or legacy anon key.");
  }
  if (!SAFE_TURNSTILE_SITE_KEY.test(turnstileSiteKey)) {
    throw new Error("TURNSTILE_SITE_KEY is not a valid sitekey.");
  }
  if (TURNSTILE_TEST_SITE_KEYS.has(turnstileSiteKey) && !LOCAL_SUPABASE_URL.test(url)) {
    throw new Error("Cloudflare test sitekeys are allowed only with the local Supabase stack.");
  }

  const clientId = String(environment.GOOGLE_OAUTH_CLIENT_ID || "").trim();
  const clientSecret = String(environment.GOOGLE_OAUTH_CLIENT_SECRET || "").trim();
  if (Boolean(clientId) !== Boolean(clientSecret)) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must either both be set or both be empty.");
  }
  const googleAuthReady = booleanSetting(environment, "GOOGLE_AUTH_READY", false)
    || Boolean(clientId && clientSecret);

  return Object.freeze({
    publicDemoOnly: false,
    url,
    publishableKey,
    turnstileSiteKey,
    emailDeliveryReady: booleanSetting(environment, "AUTH_EMAIL_DELIVERY_READY", false),
    googleAuthReady: googleAuthReady
  });
}

export function serializeLocalBrowserConfig(config) {
  return `// Generated for local testing. Do not commit this file.\nwindow.KIDDO_SPROUT_SUPABASE = Object.freeze(${JSON.stringify(config, null, 2)});\n`;
}

function main() {
  const projectDirectory = resolve(process.argv[2] || new URL("../", import.meta.url).pathname);
  const environmentPath = resolve(projectDirectory, ".env");
  const targetPath = resolve(projectDirectory, "supabase-config.js");
  const temporaryPath = `${targetPath}.tmp`;
  if (!existsSync(environmentPath)) {
    throw new Error("Missing .env. Copy .env.example to .env first.");
  }
  const fileEnvironment = parseDotEnv(readFileSync(environmentPath, "utf8"));
  chmodSync(environmentPath, 0o600);
  const config = buildLocalBrowserConfig({ ...fileEnvironment, ...process.env });
  try {
    writeFileSync(temporaryPath, serializeLocalBrowserConfig(config), { encoding: "utf8", mode: 0o600 });
    renameSync(temporaryPath, targetPath);
    chmodSync(targetPath, 0o644);
  } catch (error) {
    try {
      unlinkSync(temporaryPath);
    } catch (cleanupError) {
      // Keep the original failure; the temporary file only contains browser-safe settings.
    }
    throw error;
  }
  console.log("Created supabase-config.js for local testing. It is ignored by Git.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(String(error?.message || "Could not create local browser configuration."));
    process.exitCode = 1;
  }
}
