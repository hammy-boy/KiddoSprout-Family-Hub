import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));
const PUBLIC_PROJECT_NAME = "kiddosprout-public-preview";
const DOCKER_DESKTOP_CLI = "/Applications/Docker.app/Contents/Resources/bin/docker";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 32 * 1024;
const REQUIRED_SERVICES = Object.freeze([
  "kiddosprout",
  "voice-api",
  "blocker-api",
  "bank-api",
  "cloudflared"
]);
const ORIGIN_SERVICES = Object.freeze(REQUIRED_SERVICES.filter((service) => service !== "cloudflared"));
const EXPIRED_TUNNEL_MESSAGE = "The Cloudflare Quick Tunnel has expired (Tunnel not found). Quick Tunnel links are temporary. This status check will not restart public sharing. Run `npm run preview:recover` to explicitly create and verify a new colleague link.";
const API_SMOKE_PATHS = Object.freeze([
  "/api/story-voices",
  "/api/blocker/checksums",
  "/api/bank/status"
]);
const PWA_ICON_SMOKE_PATHS = Object.freeze([
  "/kiddosprout_logo_128.png",
  "/kiddosprout_logo_192.png",
  "/kiddosprout_logo.png"
]);
export const PUBLIC_PAGE_SMOKE_PATHS = Object.freeze([
  "/",
  "/recipe.html",
  "/app_7.html",
  "/blocker-setup.html",
  "/creator-studio.html",
  "/nature-explorer.html",
  "/move-breaks.html",
  "/story-theater.html",
  "/story-voices.html",
  "/report_problem.html",
  "/offline.html",
  "/404.html"
]);

export function composeCommandArguments(commandArguments) {
  return [
    "compose",
    "--project-name", PUBLIC_PROJECT_NAME,
    "--project-directory", PROJECT_ROOT,
    "-f", join(PROJECT_ROOT, "docker-compose.yml"),
    "-f", join(PROJECT_ROOT, "docker-compose.public.yml"),
    "--profile", "public",
    ...commandArguments
  ];
}

export function parseComposePs(source) {
  const text = String(source || "").trim();
  if (!text) throw new Error("The public preview is not running.");

  if (text.startsWith("[")) {
    const value = JSON.parse(text);
    if (!Array.isArray(value)) throw new Error("Docker Compose returned an unexpected status response.");
    return value;
  }

  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function serviceName(entry) {
  return String(entry?.Service || entry?.service || "").trim();
}

function serviceState(entry) {
  return String(entry?.State || entry?.state || "").trim().toLowerCase();
}

function serviceHealth(entry) {
  return String(entry?.Health || entry?.health || "").trim().toLowerCase();
}

function serviceProject(entry) {
  return String(entry?.Project || entry?.project || "").trim();
}

function publishedPorts(entry) {
  const publishers = entry?.Publishers || entry?.publishers;
  const published = Array.isArray(publishers)
    ? publishers.filter((publisher) => Number(publisher?.PublishedPort ?? publisher?.published_port ?? 0) > 0)
    : [];
  // Older Compose releases may omit Publishers while retaining the human
  // mapping in Ports. An arrow is present only for a host-published port.
  const legacyPorts = String(entry?.Ports || entry?.ports || "");
  if (!published.length && legacyPorts.includes("->")) return [{ legacyPorts }];
  return published;
}

function requireHealthyServices(entries, requiredServices) {
  if (!Array.isArray(entries)) throw new Error("Docker Compose returned an unexpected status response.");

  const byService = new Map();
  for (const entry of entries) {
    const name = serviceName(entry);
    if (!requiredServices.includes(name)) continue;
    if (byService.has(name)) throw new Error(`The public preview has more than one ${name} container.`);
    byService.set(name, entry);
  }

  for (const name of requiredServices) {
    const entry = byService.get(name);
    if (!entry) throw new Error(`The public preview service ${name} is not running.`);
    const project = serviceProject(entry);
    if (project && project !== PUBLIC_PROJECT_NAME) {
      throw new Error(`The ${name} container belongs to an unexpected Docker project.`);
    }
    if (serviceState(entry) !== "running") {
      throw new Error(`The public preview service ${name} is not running.`);
    }
    if (serviceHealth(entry) !== "healthy") {
      throw new Error(`The public preview service ${name} is not healthy yet.`);
    }
    if (publishedPorts(entry).length) {
      throw new Error(`The public preview service ${name} unexpectedly publishes a host port.`);
    }
  }

  return requiredServices.slice();
}

export function requireHealthyPublicServices(entries) {
  return requireHealthyServices(entries, REQUIRED_SERVICES);
}

export function requireHealthyPublicOrigins(entries) {
  return requireHealthyServices(entries, ORIGIN_SERVICES);
}

export function requireSafePublicConnector(entries) {
  if (!Array.isArray(entries)) throw new Error("Docker Compose returned an unexpected status response.");
  const connectors = entries.filter((entry) => serviceName(entry) === "cloudflared");
  if (connectors.length > 1) throw new Error("The public preview has more than one cloudflared container.");
  const connector = connectors[0];
  if (!connector) return false;
  const project = serviceProject(connector);
  if (project && project !== PUBLIC_PROJECT_NAME) {
    throw new Error("The cloudflared container belongs to an unexpected Docker project.");
  }
  if (publishedPorts(connector).length) {
    throw new Error("The public preview service cloudflared unexpectedly publishes a host port.");
  }
  return true;
}

export function quickTunnelHasExpired(logSource) {
  const source = String(logSource || "");
  let latestExpiry = -1;
  for (const match of source.matchAll(/Unauthorized:\s*Tunnel not found/gi)) {
    latestExpiry = match.index;
  }
  if (latestExpiry < 0) return false;

  let latestQuickTunnelUrl = -1;
  for (const match of source.matchAll(/https:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[^\s|]*)?/g)) {
    try {
      validateQuickTunnelUrl(match[0]);
      latestQuickTunnelUrl = Math.max(latestQuickTunnelUrl, match.index);
    } catch (error) {
      // Ignore documentation and malformed URLs while ordering connector events.
    }
  }
  return latestExpiry > latestQuickTunnelUrl;
}

export function validateQuickTunnelUrl(value) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch (error) {
    throw new Error("The connector logs do not contain a valid public URL.");
  }

  const hostname = url.hostname.toLowerCase();
  const quickTunnelHost = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.trycloudflare\.com$/;
  if (url.protocol !== "https:" || !quickTunnelHost.test(hostname) || url.port ||
      url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("The connector URL is not a safe HTTPS Quick Tunnel address.");
  }

  url.hostname = hostname;
  return url.toString();
}

export function newestQuickTunnelUrl(logSource) {
  const candidates = String(logSource || "").match(/https:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[^\s|]*)?/g) || [];
  const valid = [];
  for (const candidate of candidates) {
    try {
      valid.push(validateQuickTunnelUrl(candidate));
    } catch (error) {
      // Cloudflared logs also contain documentation and terms-of-use URLs.
    }
  }
  if (!valid.length) throw new Error("The current cloudflared logs do not contain a Quick Tunnel URL.");
  return valid.at(-1);
}

async function boundedText(response, maximumBytes = MAX_RESPONSE_BYTES) {
  const declaredLength = String(response.headers.get("content-length") || "").trim();
  if (/^\d+$/.test(declaredLength) && Number(declaredLength) > maximumBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("The public preview returned an unexpectedly large response.");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      length += value.byteLength;
      if (length > maximumBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error("The public preview returned an unexpectedly large response.");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, length).toString("utf8");
}

async function boundedPrefix(response, maximumBytes = 8 * 1024) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (length < maximumBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      const remaining = maximumBytes - length;
      const chunk = value.byteLength > remaining ? value.subarray(0, remaining) : value;
      chunks.push(Buffer.from(chunk));
      length += chunk.byteLength;
      if (value.byteLength > remaining || length >= maximumBytes) {
        await reader.cancel().catch(() => undefined);
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, length).toString("utf8");
}

function responseMediaType(response) {
  return String(response.headers.get("content-type") || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
}

function responseHeader(response, name) {
  return String(response.headers.get(name) || "").trim().toLowerCase();
}

function requireStaticSecurityHeaders(response, pathname) {
  const csp = responseHeader(response, "content-security-policy");
  const requiredCsp = [
    "default-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://cdn.plaid.com",
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co http://127.0.0.1:* ws://127.0.0.1:* http://localhost:* ws://localhost:* https://www.themealdb.com https://en.wikipedia.org https://production.plaid.com https://sandbox.plaid.com https://development.plaid.com",
    "frame-src https://challenges.cloudflare.com https://cdn.plaid.com",
    "worker-src 'self'",
    "manifest-src 'self'",
    "font-src 'self'"
  ];
  if (responseHeader(response, "x-content-type-options") !== "nosniff" ||
      responseHeader(response, "x-frame-options") !== "deny" ||
      responseHeader(response, "cross-origin-resource-policy") !== "same-origin" ||
      responseHeader(response, "referrer-policy") !== "strict-origin-when-cross-origin" ||
      csp.includes("'unsafe-eval'") ||
      /(?:^|;)\s*script-src[^;]*\shttps:(?:\s|;|$)/.test(csp) ||
      !requiredCsp.every((directive) => csp.includes(directive))) {
    throw new Error(`${pathname} is missing KiddoSprout's required browser security headers.`);
  }
}

function requireApiSecurityHeaders(response, pathname) {
  const csp = responseHeader(response, "content-security-policy");
  const cacheControl = responseHeader(response, "cache-control");
  const requiredCsp = [
    "default-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'"
  ];
  if (!cacheControl.includes("no-store") ||
      responseHeader(response, "x-content-type-options") !== "nosniff" ||
      responseHeader(response, "x-frame-options") !== "deny" ||
      responseHeader(response, "cross-origin-resource-policy") !== "same-origin" ||
      responseHeader(response, "referrer-policy") !== "no-referrer" ||
      response.headers.has("access-control-allow-origin") ||
      !requiredCsp.every((directive) => csp.includes(directive))) {
    throw new Error(`${pathname} is missing KiddoSprout's private API security headers.`);
  }
}

async function requestPublic(fetchImpl, tunnelUrl, pathname, accept) {
  const target = new URL(pathname, tunnelUrl);
  return fetchImpl(target, {
    method: "GET",
    redirect: "error",
    headers: { Accept: accept },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
}

export async function checkPublicPreview({ commandRunner, fetchImpl = globalThis.fetch, smoke = false } = {}) {
  if (typeof commandRunner !== "function") throw new Error("A Docker Compose command runner is required.");
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");

  const statusSource = await commandRunner(composeCommandArguments(["ps", "--format", "json"]));
  const entries = parseComposePs(statusSource);
  let services;
  try {
    services = requireHealthyPublicServices(entries);
  } catch (serviceError) {
    if (/cloudflared/i.test(String(serviceError?.message || ""))) {
      const connector = entries.find((entry) => serviceName(entry) === "cloudflared");
      if (!connector || serviceState(connector) !== "running") {
        throw new Error(`${String(serviceError?.message || serviceError)} Run \`npm run preview:recover\` to explicitly create and verify a new colleague link.`);
      }
      try {
        const failedConnectorLogs = await commandRunner(composeCommandArguments(["logs", "--no-color", "--tail", "500", "cloudflared"]));
        if (quickTunnelHasExpired(failedConnectorLogs)) throw new Error(EXPIRED_TUNNEL_MESSAGE);
      } catch (logError) {
        if (String(logError?.message || "").includes("preview:recover")) throw logError;
      }
    }
    throw serviceError;
  }
  const logSource = await commandRunner(composeCommandArguments(["logs", "--no-color", "--tail", "500", "cloudflared"]));
  if (quickTunnelHasExpired(logSource)) {
    throw new Error(EXPIRED_TUNNEL_MESSAGE);
  }
  const url = newestQuickTunnelUrl(logSource);

  const healthResponse = await requestPublic(fetchImpl, url, "/healthz", "text/plain");
  if (healthResponse.status !== 204) {
    await healthResponse.body?.cancel().catch(() => undefined);
    throw new Error(`The public /healthz check returned HTTP ${healthResponse.status}.`);
  }

  if (smoke) {
    const configResponse = await requestPublic(fetchImpl, url, "/supabase-config.js", "application/javascript");
    const configSource = await boundedText(configResponse);
    if (configResponse.status !== 200 || !/publicDemoOnly:\s*true/.test(configSource) ||
        /(?:publishableKey|turnstileSiteKey|supabase\.co)/i.test(configSource)) {
      throw new Error("The public browser configuration is not the isolated fictional-data demo.");
    }

    for (const pathname of PUBLIC_PAGE_SMOKE_PATHS) {
      const response = await requestPublic(fetchImpl, url, pathname, "text/html");
      const prefix = await boundedPrefix(response);
      if (response.status !== 200 || responseMediaType(response) !== "text/html" ||
          !/(?:<!doctype\s+html|<html\b)/i.test(prefix) || !/KiddoSprout/i.test(prefix)) {
        throw new Error(`${pathname} is not serving the expected KiddoSprout page.`);
      }
      requireStaticSecurityHeaders(response, pathname);
    }

    const workerResponse = await requestPublic(fetchImpl, url, "/service-worker.js", "application/javascript");
    const workerPrefix = await boundedPrefix(workerResponse);
    const workerCacheControl = String(workerResponse.headers.get("cache-control") || "").toLowerCase();
    if (workerResponse.status !== 200 || ![
      "application/javascript",
      "application/x-javascript",
      "text/javascript"
    ].includes(responseMediaType(workerResponse)) ||
        !/const KIDDOSPROUT_CACHE_VERSION = "shell-v[0-9]+";/.test(workerPrefix) ||
        !workerCacheControl.includes("no-store")) {
      throw new Error("The live PWA worker is missing, stale-cacheable, or has the wrong media type.");
    }

    const manifestResponse = await requestPublic(fetchImpl, url, "/manifest.webmanifest", "application/manifest+json");
    const manifestSource = await boundedText(manifestResponse);
    let manifest;
    try {
      manifest = JSON.parse(manifestSource);
    } catch (error) {
      throw new Error("The live PWA manifest is not valid JSON.");
    }
    if (manifestResponse.status !== 200 ||
        !["application/manifest+json", "application/json"].includes(responseMediaType(manifestResponse)) ||
        manifest?.name !== "KiddoSprout" || manifest?.start_url !== "./#login" || manifest?.scope !== "./") {
      throw new Error("The live PWA manifest is missing or does not describe KiddoSprout.");
    }
    requireStaticSecurityHeaders(manifestResponse, "/manifest.webmanifest");

    const manifestIcons = Array.isArray(manifest?.icons) ? manifest.icons : [];
    for (const pathname of PWA_ICON_SMOKE_PATHS) {
      const relativePath = pathname.slice(1);
      if (!manifestIcons.some((icon) => icon?.src === relativePath && icon?.type === "image/png")) {
        throw new Error(`The live PWA manifest is missing ${relativePath}.`);
      }
      const response = await requestPublic(fetchImpl, url, pathname, "image/png");
      await response.body?.cancel().catch(() => undefined);
      if (response.status !== 200 || responseMediaType(response) !== "image/png") {
        throw new Error(`${pathname} is not serving the expected PWA icon.`);
      }
      requireStaticSecurityHeaders(response, pathname);
    }

    for (const pathname of API_SMOKE_PATHS) {
      const response = await requestPublic(fetchImpl, url, pathname, "application/json");
      const source = await boundedText(response);
      let payload;
      try {
        payload = JSON.parse(source);
      } catch (error) {
        throw new Error(`${pathname} did not return the expected public-demo response.`);
      }
      if (response.status !== 403 || payload?.code !== "public_demo_only") {
        throw new Error(`${pathname} is not isolated by public-demo mode.`);
      }
      requireApiSecurityHeaders(response, pathname);
    }

    const privateFileResponse = await requestPublic(fetchImpl, url, "/Dockerfile", "text/plain");
    const privateFilePrefix = await boundedPrefix(privateFileResponse);
    if (privateFileResponse.status !== 404 || responseMediaType(privateFileResponse) !== "text/html" ||
        !/(?:<!doctype\s+html|<html\b)/i.test(privateFilePrefix) || !/KiddoSprout/i.test(privateFilePrefix)) {
      throw new Error("The public server exposed a private project file or lost its branded 404 response.");
    }
    requireStaticSecurityHeaders(privateFileResponse, "/Dockerfile");
  }

  return { url, services, smoke };
}

export async function recoverExpiredQuickTunnel({
  commandRunner,
  fetchImpl = globalThis.fetch,
  wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds)),
  attempts = 16
} = {}) {
  if (typeof commandRunner !== "function") throw new Error("A Docker Compose command runner is required.");
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");
  if (typeof wait !== "function") throw new Error("A recovery wait function is required.");

  // Never rotate a working colleague link. A healthy smoke check is a no-op.
  try {
    const current = await checkPublicPreview({ commandRunner, fetchImpl, smoke: true });
    return { ...current, recovered: false };
  } catch (initialError) {
    const statusSource = await commandRunner(composeCommandArguments(["ps", "--format", "json"]));
    const entries = parseComposePs(statusSource);
    requireHealthyPublicOrigins(entries);
    const connectorPresent = requireSafePublicConnector(entries);
    const connector = entries.find((entry) => serviceName(entry) === "cloudflared");
    const connectorStopped = connectorPresent && serviceState(connector) !== "running";
    if (!connectorStopped && connectorPresent) {
      const logSource = await commandRunner(composeCommandArguments(["logs", "--no-color", "--tail", "500", "cloudflared"]));
      if (!quickTunnelHasExpired(logSource)) {
        throw new Error(`The connector was not restarted because its logs do not show an expired Quick Tunnel. ${String(initialError?.message || initialError)}`);
      }
    }
  }

  await commandRunner(composeCommandArguments([
    "up", "-d", "--no-deps", "--force-recreate", "cloudflared"
  ]));

  let lastError = null;
  const maximumAttempts = Math.max(1, Math.min(60, Number(attempts) || 1));
  for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
    if (attempt > 0) await wait(1500);
    try {
      const result = await checkPublicPreview({ commandRunner, fetchImpl, smoke: true });
      return { ...result, recovered: true };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`A new Quick Tunnel was requested, but it did not become healthy and isolated in time. ${String(lastError?.message || lastError || "Try the status check again.")}`);
}

async function dockerCommand() {
  try {
    await access(DOCKER_DESKTOP_CLI, constants.X_OK);
    return DOCKER_DESKTOP_CLI;
  } catch (error) {
    return "docker";
  }
}

async function main() {
  const unknownArguments = process.argv.slice(2).filter((argument) => argument !== "--smoke" && argument !== "--recover");
  if (unknownArguments.length) throw new Error(`Unknown argument: ${unknownArguments[0]}`);
  const smoke = process.argv.includes("--smoke");
  const recover = process.argv.includes("--recover");
  const docker = await dockerCommand();
  const commandRunner = async (argumentsList) => {
    try {
      const result = await execFileAsync(docker, argumentsList, {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
        timeout: 20_000,
        maxBuffer: 2 * 1024 * 1024
      });
      return result.stdout;
    } catch (error) {
      const detail = String(error?.stderr || error?.message || "Docker Compose failed.").trim().split(/\r?\n/, 1)[0];
      throw new Error(detail || "Docker Compose failed.");
    }
  };

  const result = recover
    ? await recoverExpiredQuickTunnel({ commandRunner })
    : await checkPublicPreview({ commandRunner, smoke });
  console.log(recover && result.recovered
    ? "KiddoSprout created and verified a new temporary Quick Tunnel:"
    : `KiddoSprout public preview is healthy${smoke || recover ? " and isolated" : ""}:`);
  console.log(result.url);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`Public preview check failed: ${String(error?.message || error)}`);
    process.exitCode = 1;
  });
}
