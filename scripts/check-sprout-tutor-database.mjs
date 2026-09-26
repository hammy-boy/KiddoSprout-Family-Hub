import { lstat, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const MAX_FILE_BYTES = 16 * 1024;
const MAX_RESPONSE_BYTES = 16 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;
const MANAGED_SUPABASE_URL = /^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.supabase\.co$/i;
const MODERN_PUBLISHABLE_KEY = /^sb_publishable_[A-Za-z0-9_-]{12,}$/;

function legacyKeyRole(value) {
  const parts = String(value || "").split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return "";
  try {
    return String(JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"))?.role || "").toLowerCase();
  } catch {
    return "";
  }
}

export function readDatabaseSettings(source) {
  const values = new Map();
  for (const [index, rawLine] of String(source).split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) throw new Error(`Invalid .env.production entry on line ${index + 1}.`);
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values.set(match[1], value);
  }

  const url = String(values.get("SUPABASE_URL") || "");
  const key = String(values.get("SUPABASE_PUBLISHABLE_KEY") || "");
  if (!MANAGED_SUPABASE_URL.test(url)) {
    throw new Error("SUPABASE_URL must be the managed project origin https://<project-ref>.supabase.co.");
  }
  if (!MODERN_PUBLISHABLE_KEY.test(key) && legacyKeyRole(key) !== "anon") {
    throw new Error("SUPABASE_PUBLISHABLE_KEY must be a browser-safe publishable/anon key.");
  }
  return { url, key };
}

async function boundedJson(response) {
  const declaredLength = Number(response.headers.get("Content-Length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new Error("The Supabase readiness response was unexpectedly large.");
  }
  if (!String(response.headers.get("Content-Type") || "").toLowerCase().includes("json") || !response.body) {
    await response.body?.cancel();
    throw new Error("Supabase returned an invalid readiness response.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let total = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("The Supabase readiness response was unexpectedly large.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Supabase returned invalid JSON during the readiness check.");
  }
}

export async function verifyTutorApprovalRpc(source, fetchImpl = globalThis.fetch) {
  const { url, key } = readDatabaseSettings(source);
  const endpoint = new URL("/rest/v1/rpc/sprout_tutor_active_child_approval", url);
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        apikey: key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ p_expected_child_id: "readiness-check" }),
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (error) {
    throw new Error("Could not reach the configured Supabase project to verify the tutor migration.", {
      cause: error
    });
  }

  const payload = await boundedJson(response);
  const permissionDenied = (
    (response.status === 401 || response.status === 403)
    && String(payload?.code || "") === "42501"
    && /permission denied for function sprout_tutor_active_child_approval/i.test(
      String(payload?.message || "")
    )
  );
  if (!permissionDenied) {
    if (response.ok) {
      throw new Error("The tutor approval RPC is exposed to anonymous callers; restore its authenticated-only grant before deployment.");
    }
    throw new Error("The tutor approval RPC is missing or unavailable. Apply the checked-in Supabase migrations before deployment.");
  }
  return true;
}

export async function verifyTutorApprovalRpcFile(file = ".env.production", fetchImpl = globalThis.fetch) {
  const resolvedFile = resolve(file);
  const info = await lstat(resolvedFile).catch(() => null);
  if (!info?.isFile() || info.size <= 0 || info.size > MAX_FILE_BYTES) {
    throw new Error("Create the ignored, small .env.production file before checking the tutor database.");
  }
  return verifyTutorApprovalRpc(await readFile(resolvedFile, "utf8"), fetchImpl);
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  try {
    await verifyTutorApprovalRpcFile(process.argv[2] || ".env.production");
    console.log("Sprout Tutor approval storage is installed and protected; no key or family data was printed.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "The tutor database readiness check failed.");
    process.exitCode = 1;
  }
}
