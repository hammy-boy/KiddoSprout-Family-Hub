import { Buffer } from "node:buffer";

const MANAGED_SUPABASE_HOSTNAME = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.supabase\.co$/i;
const MODERN_PUBLISHABLE_KEY = /^sb_publishable_[A-Za-z0-9_-]{12,}$/;
const LOCAL_HOSTNAMES = new Set([
  "127.0.0.1",
  "localhost",
  "::1",
  "0.0.0.0",
  "host.docker.internal"
]);

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

export function browserSafeSupabaseKey(value) {
  const key = String(value || "").trim();
  return MODERN_PUBLISHABLE_KEY.test(key) || legacyKeyRole(key) === "anon" ? key : "";
}

export function internalSupabaseUrl(value) {
  const raw = String(value || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  try {
    const url = new URL(raw);
    const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    const local = LOCAL_HOSTNAMES.has(hostname);
    const managed = MANAGED_SUPABASE_HOSTNAME.test(hostname);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") return "";
    if (managed && (url.protocol !== "https:" || url.port)) return "";
    if (local && url.protocol !== "http:") return "";
    if (!managed && !local) return "";
    if (["127.0.0.1", "localhost"].includes(hostname)) url.hostname = "host.docker.internal";
    return url.toString().replace(/\/+$/, "");
  } catch (error) {
    return "";
  }
}
