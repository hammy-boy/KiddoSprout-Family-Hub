import { existsSync, readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";

const REQUIRED_SMTP_NAMES = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
const SUPPORTED_SECURE_PORTS = new Set(["465", "587", "2465", "2587"]);
const LOCAL_OR_PLACEHOLDER_HOST = /^(?:localhost|127(?:\.\d+){0,3}|0\.0\.0\.0|inbucket|mailpit|[^.]+\.local)$/i;
const PLACEHOLDER_VALUE = /^(?:your[_-]|replace[_-]?me|change[_-]?me|example(?:\.|$)|password$|api[_-]?key$)/i;
const EMAIL_ADDRESS = /^[^\s<>@]+@[^\s<>@]+$/;
const MANAGED_SUPABASE_URL = /^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.supabase\.co\/?$/i;
const MODERN_PUBLISHABLE_KEY = /^sb_publishable_[A-Za-z0-9_-]{12,}$/;
const SAFE_TURNSTILE_SITE_KEY = /^[A-Za-z0-9_-]{20,}$/;
const TURNSTILE_TEST_SITE_KEYS = new Set([
  "1x00000000000000000000AA",
  "2x00000000000000000000AB",
  "1x00000000000000000000BB",
  "2x00000000000000000000BB",
  "3x00000000000000000000FF"
]);

function unescapeDoubleQuoted(value) {
  return value.replace(/\\([\\"`$])/g, "$1");
}

function isDnsHostname(value) {
  const hostname = String(value || "");
  if (!hostname || hostname.length > 253 || hostname.endsWith(".")) return false;
  const labels = hostname.split(".");
  return labels.length >= 2 && labels.every((label) => (
    label.length <= 63
    && /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label)
  ));
}

function isBareEmailAddress(value) {
  const email = String(value || "");
  if (!EMAIL_ADDRESS.test(email) || email.length > 254) return false;
  const at = email.lastIndexOf("@");
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return Boolean(
    local
    && local.length <= 64
    && !local.startsWith(".")
    && !local.endsWith(".")
    && !local.includes("..")
    && isDnsHostname(domain)
  );
}

function legacyKeyRole(value) {
  const parts = String(value || "").split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return "";
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return String(payload?.role || "").toLowerCase();
  } catch (error) {
    return "";
  }
}

export function isBrowserSafeSupabaseKey(value) {
  const key = String(value || "").trim();
  return MODERN_PUBLISHABLE_KEY.test(key) || legacyKeyRole(key) === "anon";
}

export function parseDotEnv(source) {
  const values = {};
  for (const sourceLine of String(source || "").split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = unescapeDoubleQuoted(value.slice(1, -1));
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    values[match[1]] = value;
  }
  return values;
}

export function assessLocalEmailReadiness(environment = {}) {
  const value = (name) => String(environment[name] || "").trim();
  const configuredNames = REQUIRED_SMTP_NAMES.filter((name) => Boolean(value(name)));
  const missingNames = REQUIRED_SMTP_NAMES.filter((name) => !value(name));
  const errors = [];
  const warnings = [];
  const configured = configuredNames.length > 0;

  if (!configured) {
    errors.push("External SMTP is not configured.");
  } else if (missingNames.length) {
    errors.push(`SMTP configuration is incomplete; missing ${missingNames.join(", ")}.`);
  }

  const host = value("SMTP_HOST");
  const port = value("SMTP_PORT");
  const user = value("SMTP_USER");
  const password = value("SMTP_PASS");
  const from = value("SMTP_FROM");

  if (host && (LOCAL_OR_PLACEHOLDER_HOST.test(host) || PLACEHOLDER_VALUE.test(host) || !isDnsHostname(host))) {
    errors.push("SMTP_HOST must be a real external provider DNS hostname without a URL scheme or port.");
  }
  if (port && !SUPPORTED_SECURE_PORTS.has(port)) {
    errors.push("SMTP_PORT must use a supported encrypted SMTP port: 465, 587, 2465, or 2587.");
  }
  if (user && PLACEHOLDER_VALUE.test(user)) {
    errors.push("SMTP_USER still contains a placeholder.");
  }
  if (password && PLACEHOLDER_VALUE.test(password)) {
    errors.push("SMTP_PASS still contains a placeholder.");
  }
  if (from && (!isBareEmailAddress(from) || /\.local$/i.test(from))) {
    errors.push("SMTP_FROM must be a bare, real email address on an allowed sending domain.");
  }

  const resend = host.toLowerCase() === "smtp.resend.com";
  if (resend && user.toLowerCase() !== "resend") {
    errors.push("Resend SMTP requires SMTP_USER=resend.");
  }
  if (resend && /@resend\.dev$/i.test(from)) {
    errors.push("Resend's test domain is not production-ready; use an address on a verified sending domain.");
  }

  if (configured && errors.length === 0) {
    warnings.push("Syntax is ready, but only a real signup, resend, and recovery test can prove delivery.");
  }

  return Object.freeze({
    ready: configured && errors.length === 0,
    configured,
    provider: resend ? "Resend" : "SMTP",
    missingNames: Object.freeze([...missingNames]),
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings)
  });
}

export function formatEmailReadiness(report) {
  const lines = [report.ready
    ? `PASS: ${report.provider} settings are syntactically ready for the local Supabase Auth stack.`
    : "NOT READY: local Supabase Auth cannot safely send account email yet."];
  report.errors.forEach((message) => lines.push(`- ${message}`));
  report.warnings.forEach((message) => lines.push(`- ${message}`));
  lines.push("- Sender display name is fixed to KiddoSprout in supabase/config.toml.");
  lines.push("- No credential value was printed or sent over the network.");
  return lines.join("\n");
}

export function assessHostedEmailReadiness(environment = {}) {
  const value = (name) => String(environment[name] || "").trim();
  const errors = [];
  const warnings = [];
  const publicDemoOnly = value("PUBLIC_DEMO_ONLY");
  const supabaseUrl = value("SUPABASE_URL");
  const publishableKey = value("SUPABASE_PUBLISHABLE_KEY") || value("SUPABASE_ANON_KEY");
  const turnstileSiteKey = value("TURNSTILE_SITE_KEY");

  if (publicDemoOnly !== "false") {
    errors.push("PUBLIC_DEMO_ONLY is not false, so hosted account email remains intentionally inaccessible.");
  }
  if (!MANAGED_SUPABASE_URL.test(supabaseUrl) || /your[-_]project/i.test(supabaseUrl)) {
    errors.push("SUPABASE_URL must be the real managed HTTPS project URL.");
  }
  if (!publishableKey || /your[-_]supabase/i.test(publishableKey)) {
    errors.push("SUPABASE_PUBLISHABLE_KEY must be the project's browser-safe publishable key.");
  } else if (!isBrowserSafeSupabaseKey(publishableKey)) {
    errors.push("SUPABASE_PUBLISHABLE_KEY is not a browser-safe publishable or legacy anon key; never expose a secret or service-role key.");
  }
  if (
    !turnstileSiteKey
    || /your[-_]cloudflare/i.test(turnstileSiteKey)
    || TURNSTILE_TEST_SITE_KEYS.has(turnstileSiteKey)
    || !SAFE_TURNSTILE_SITE_KEY.test(turnstileSiteKey)
  ) {
    errors.push("TURNSTILE_SITE_KEY must be a real production sitekey, not an official test key.");
  }
  if (value("AUTH_EMAIL_DELIVERY_READY") !== "true") {
    errors.push("AUTH_EMAIL_DELIVERY_READY must remain false until the owner completes real hosted delivery tests.");
  }

  if (errors.length === 0) {
    warnings.push("Deployment flags are consistent, but this offline check cannot inspect Supabase SMTP, DNS verification, provider events, or an inbox.");
    warnings.push("Keep the flag true only while hosted signup, resend, confirmation, login, and recovery delivery are working.");
  }

  return Object.freeze({ ready: errors.length === 0, errors: Object.freeze(errors), warnings: Object.freeze(warnings) });
}

export function formatHostedEmailReadiness(report) {
  const lines = [report.ready
    ? "PASS: deployment flags declare hosted email account mode ready."
    : "NOT READY: hosted email account mode must remain unavailable."];
  report.errors.forEach((message) => lines.push(`- ${message}`));
  report.warnings.forEach((message) => lines.push(`- ${message}`));
  lines.push("- No key or credential value was printed or sent over the network.");
  return lines.join("\n");
}

function loadEnvironment() {
  const envUrl = new URL("../.env", import.meta.url);
  const fromFile = existsSync(envUrl) ? parseDotEnv(readFileSync(envUrl, "utf8")) : {};
  return { ...fromFile, ...process.env };
}

const invokedPath = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;
if (invokedPath) {
  const hosted = process.argv.includes("--hosted");
  const report = hosted
    ? assessHostedEmailReadiness(loadEnvironment())
    : assessLocalEmailReadiness(loadEnvironment());
  process.stdout.write(`${hosted ? formatHostedEmailReadiness(report) : formatEmailReadiness(report)}\n`);
  if (!report.ready) process.exitCode = 1;
}
