import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  checkPublicPreview,
  composeCommandArguments,
  newestQuickTunnelUrl,
  parseComposePs,
  PUBLIC_PAGE_SMOKE_PATHS,
  quickTunnelHasExpired,
  recoverExpiredQuickTunnel,
  requireHealthyPublicOrigins,
  requireHealthyPublicServices,
  requireSafePublicConnector,
  validateQuickTunnelUrl
} from "./public-preview-status.mjs";

const SERVICES = ["kiddosprout", "voice-api", "blocker-api", "bank-api", "cloudflared"];
const CURRENT_URL = "https://newest-safe-preview.trycloudflare.com/";
const STATIC_CONTENT_SECURITY_POLICY = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://cdn.plaid.com; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co http://127.0.0.1:* ws://127.0.0.1:* http://localhost:* ws://localhost:* https://www.themealdb.com https://en.wikipedia.org https://production.plaid.com https://sandbox.plaid.com https://development.plaid.com; frame-src https://challenges.cloudflare.com https://cdn.plaid.com; worker-src 'self'; manifest-src 'self'; font-src 'self'";
const SMOKE_REQUEST_PATHS = [
  "/healthz",
  "/supabase-config.js",
  ...PUBLIC_PAGE_SMOKE_PATHS,
  "/service-worker.js",
  "/manifest.webmanifest",
  "/kiddosprout_logo_128.png",
  "/kiddosprout_logo_192.png",
  "/kiddosprout_logo.png",
  "/api/story-voices",
  "/api/blocker/checksums",
  "/api/bank/status",
  "/Dockerfile"
];

function serviceRecord(service, overrides = {}) {
  return {
    Service: service,
    Project: "kiddosprout-public-preview",
    State: "running",
    Health: "healthy",
    Publishers: [{ URL: "", TargetPort: service === "kiddosprout" ? 80 : 8787, PublishedPort: 0, Protocol: "tcp" }],
    ...overrides
  };
}

const healthyRecords = SERVICES.map((service) => serviceRecord(service));
const jsonLines = healthyRecords.map((record) => JSON.stringify(record)).join("\n");
assert.deepEqual(parseComposePs(jsonLines), healthyRecords);
assert.deepEqual(parseComposePs(JSON.stringify(healthyRecords)), healthyRecords);
assert.deepEqual(requireHealthyPublicServices(healthyRecords), SERVICES);
assert.deepEqual(requireHealthyPublicOrigins(healthyRecords), SERVICES.filter((service) => service !== "cloudflared"));
assert.equal(requireSafePublicConnector(healthyRecords), true);
assert.equal(requireSafePublicConnector(healthyRecords.filter((record) => record.Service !== "cloudflared")), false);
assert.throws(
  () => requireSafePublicConnector(healthyRecords.map((record) =>
    record.Service === "cloudflared"
      ? { ...record, Publishers: [{ URL: "0.0.0.0", PublishedPort: 2000, TargetPort: 2000 }] }
      : record)),
  /unexpectedly publishes a host port/
);

for (const unsafe of [
  "http://example.trycloudflare.com/",
  "https://127.0.0.1/",
  "https://trycloudflare.com/",
  "https://preview.trycloudflare.com.evil.example/",
  "https://preview.trycloudflare.com:8443/",
  "https://parent@preview.trycloudflare.com/",
  "https://preview.trycloudflare.com/private",
  "https://preview.trycloudflare.com/?next=local",
  "https://preview_name.trycloudflare.com/"
]) {
  assert.throws(() => validateQuickTunnelUrl(unsafe), /safe HTTPS Quick Tunnel|valid public URL/);
}
assert.equal(validateQuickTunnelUrl(CURRENT_URL), CURRENT_URL);

const multiUrlLogs = `
cloudflared-1 | See https://developers.cloudflare.com/cloudflare-one/ for help.
cloudflared-1 | https://older-safe-preview.trycloudflare.com
cloudflared-1 | reconnecting
cloudflared-1 | ${CURRENT_URL}
`;
assert.equal(newestQuickTunnelUrl(multiUrlLogs), CURRENT_URL,
  "The status command must select the last safe URL from the current connector logs.");
assert.throws(() => newestQuickTunnelUrl("https://127.0.0.1:8001/"), /do not contain a Quick Tunnel URL/);

const expiredLogs = `${multiUrlLogs}\ncloudflared-1 | ERR registration failed error="Unauthorized: Tunnel not found"\n`;
assert.equal(quickTunnelHasExpired(expiredLogs), true,
  "An Unauthorized: Tunnel not found event after the last URL must identify an expired Quick Tunnel.");
assert.equal(quickTunnelHasExpired(`${expiredLogs}\ncloudflared-1 | ${CURRENT_URL}\n`), false,
  "A newly issued safe URL after an old expiry event must be treated as the current connector session.");
assert.equal(quickTunnelHasExpired(multiUrlLogs), false);

assert.throws(
  () => requireHealthyPublicServices(healthyRecords.filter((record) => record.Service !== "cloudflared")),
  /cloudflared is not running/
);
assert.throws(
  () => requireHealthyPublicServices(healthyRecords.map((record) =>
    record.Service === "cloudflared" ? { ...record, Health: "unhealthy" } : record)),
  /cloudflared is not healthy/
);
assert.throws(
  () => requireHealthyPublicServices(healthyRecords.map((record) =>
    record.Service === "kiddosprout"
      ? { ...record, Publishers: [{ URL: "0.0.0.0", PublishedPort: 8001, TargetPort: 80 }] }
      : record)),
  /unexpectedly publishes a host port/
);
assert.throws(
  () => requireHealthyPublicServices(healthyRecords.map((record) =>
    record.Service === "kiddosprout"
      ? { ...record, Publishers: undefined, Ports: "127.0.0.1:8001->80/tcp" }
      : record)),
  /unexpectedly publishes a host port/,
  "Older Compose JSON must not bypass the no-published-port requirement."
);

const expectedPrefix = composeCommandArguments([]);
assert.deepEqual(expectedPrefix.slice(0, 4), [
  "compose", "--project-name", "kiddosprout-public-preview", "--project-directory"
]);
assert.ok(expectedPrefix.includes(new URL("../docker-compose.yml", import.meta.url).pathname));
assert.ok(expectedPrefix.includes(new URL("../docker-compose.public.yml", import.meta.url).pathname));

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY"
    }
  });
}

const STATIC_SECURITY_HEADERS = Object.freeze({
  "Content-Security-Policy": STATIC_CONTENT_SECURITY_POLICY,
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
});

function staticHeaders(headers = {}) {
  return { ...STATIC_SECURITY_HEADERS, ...headers };
}

function createHarness({
  records = healthyRecords,
  healthStatus = 204,
  apiCode = "public_demo_only",
  logs = multiUrlLogs,
  brokenPage = "",
  missingStaticHeader = ""
} = {}) {
  const commands = [];
  const requests = [];
  const harnessStaticHeaders = (headers = {}) => {
    const result = staticHeaders(headers);
    if (missingStaticHeader) delete result[missingStaticHeader];
    return result;
  };
  return {
    commands,
    requests,
    commandRunner: async (argumentsList) => {
      commands.push(argumentsList);
      if (argumentsList.includes("ps")) return records.map((record) => JSON.stringify(record)).join("\n");
      if (argumentsList.includes("logs")) return logs;
      throw new Error("Unexpected Compose command in test.");
    },
    fetchImpl: async (target, options) => {
      const url = new URL(target);
      requests.push({ url: url.toString(), options });
      if (url.pathname === "/healthz") return new Response(null, { status: healthStatus });
      if (url.pathname === "/supabase-config.js") {
        return new Response("window.KIDDO_SPROUT_SUPABASE = Object.freeze({ publicDemoOnly: true });\n", {
          status: 200,
          headers: harnessStaticHeaders({ "Content-Type": "application/javascript" })
        });
      }
      if (PUBLIC_PAGE_SMOKE_PATHS.includes(url.pathname)) {
        return new Response(
          url.pathname === brokenPage ? "temporary upstream page" : "<!doctype html><html><title>KiddoSprout</title></html>",
          {
            status: url.pathname === brokenPage ? 502 : 200,
            headers: harnessStaticHeaders({ "Content-Type": "text/html; charset=utf-8" })
          }
        );
      }
      if (url.pathname === "/service-worker.js") {
        return new Response('const KIDDOSPROUT_CACHE_VERSION = "shell-v95";\n', {
          status: 200,
          headers: {
            ...harnessStaticHeaders(),
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Content-Type": "application/javascript; charset=utf-8"
          }
        });
      }
      if (url.pathname === "/manifest.webmanifest") {
        return new Response(JSON.stringify({
          name: "KiddoSprout",
          start_url: "./#login",
          scope: "./",
          icons: [
            { src: "kiddosprout_logo_128.png", type: "image/png" },
            { src: "kiddosprout_logo_192.png", type: "image/png" },
            { src: "kiddosprout_logo.png", type: "image/png" }
          ]
        }), {
          status: 200,
          headers: harnessStaticHeaders({ "Content-Type": "application/manifest+json" })
        });
      }
      if (["/kiddosprout_logo_128.png", "/kiddosprout_logo_192.png", "/kiddosprout_logo.png"].includes(url.pathname)) {
        return new Response("png", {
          status: 200,
          headers: harnessStaticHeaders({ "Content-Type": "image/png" })
        });
      }
      if (["/api/story-voices", "/api/blocker/checksums", "/api/bank/status"].includes(url.pathname)) {
        return jsonResponse(403, { code: apiCode });
      }
      if (url.pathname === "/Dockerfile") {
        return new Response("<!doctype html><html><title>KiddoSprout not found</title></html>", {
          status: 404,
          headers: harnessStaticHeaders({ "Content-Type": "text/html; charset=utf-8" })
        });
      }
      throw new Error(`Unexpected public request: ${url.pathname}`);
    }
  };
}

const statusHarness = createHarness();
const statusResult = await checkPublicPreview(statusHarness);
assert.equal(statusResult.url, CURRENT_URL);
assert.equal(statusResult.smoke, false);
assert.equal(statusHarness.commands.length, 2);
for (const command of statusHarness.commands) {
  assert.deepEqual(command.slice(0, 3), ["compose", "--project-name", "kiddosprout-public-preview"]);
  assert.ok(command.includes(new URL("../docker-compose.yml", import.meta.url).pathname));
  assert.ok(command.includes(new URL("../docker-compose.public.yml", import.meta.url).pathname));
}
assert.deepEqual(statusHarness.requests.map(({ url }) => url), [`${CURRENT_URL}healthz`]);
assert.equal(statusHarness.requests[0].options.redirect, "error");

const smokeHarness = createHarness();
const smokeResult = await checkPublicPreview({
  commandRunner: smokeHarness.commandRunner,
  fetchImpl: smokeHarness.fetchImpl,
  smoke: true
});
assert.equal(smokeResult.smoke, true);
assert.deepEqual(smokeHarness.requests.map(({ url }) => new URL(url).pathname), SMOKE_REQUEST_PATHS);

const brokenPageHarness = createHarness({ brokenPage: "/story-theater.html" });
await assert.rejects(() => checkPublicPreview({
  commandRunner: brokenPageHarness.commandRunner,
  fetchImpl: brokenPageHarness.fetchImpl,
  smoke: true
}), /story-theater\.html is not serving the expected KiddoSprout page/);

const insecurePageHarness = createHarness({ missingStaticHeader: "X-Frame-Options" });
await assert.rejects(() => checkPublicPreview({
  commandRunner: insecurePageHarness.commandRunner,
  fetchImpl: insecurePageHarness.fetchImpl,
  smoke: true
}), /required browser security headers/);

const broadScriptCspHarness = createHarness();
const broadScriptFetch = broadScriptCspHarness.fetchImpl;
broadScriptCspHarness.fetchImpl = async (target, options) => {
  const response = await broadScriptFetch(target, options);
  if (new URL(target).pathname === "/") {
    const headers = new Headers(response.headers);
    headers.set("Content-Security-Policy", STATIC_CONTENT_SECURITY_POLICY.replace(
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://cdn.plaid.com",
      "script-src 'self' 'unsafe-inline' https:"
    ));
    return new Response(await response.text(), { status: response.status, headers });
  }
  return response;
};
await assert.rejects(() => checkPublicPreview({
  commandRunner: broadScriptCspHarness.commandRunner,
  fetchImpl: broadScriptCspHarness.fetchImpl,
  smoke: true
}), /required browser security headers/,
"The live audit must reject a CSP that allows scripts from every HTTPS origin.");

const unhealthyHarness = createHarness({
  records: healthyRecords.map((record) => record.Service === "cloudflared" ? { ...record, Health: "unhealthy" } : record)
});
await assert.rejects(() => checkPublicPreview(unhealthyHarness), /cloudflared is not healthy/);
assert.equal(unhealthyHarness.commands.length, 2, "An unhealthy connector may read logs for diagnosis but must not mutate the stack.");
assert.equal(unhealthyHarness.commands.some((command) => command.includes("up")), false,
  "An ordinary status check must never restart public sharing.");
assert.equal(unhealthyHarness.requests.length, 0);

for (const records of [
  healthyRecords.filter((record) => record.Service !== "cloudflared"),
  healthyRecords.map((record) => record.Service === "cloudflared"
    ? { ...record, State: "exited", Health: "" }
    : record)
]) {
  const disconnectedHarness = createHarness({ records, logs: "" });
  await assert.rejects(() => checkPublicPreview(disconnectedHarness), /npm run preview:recover/,
    "A missing or stopped connector status must explain the explicit recovery command.");
  assert.equal(disconnectedHarness.commands.some((command) => command.includes("up")), false,
    "A status check must remain read-only when the connector is missing or stopped.");
}

const expiredHarness = createHarness({
  records: healthyRecords.map((record) => record.Service === "cloudflared" ? { ...record, Health: "unhealthy" } : record),
  logs: expiredLogs
});
await assert.rejects(() => checkPublicPreview(expiredHarness), /npm run preview:recover/);
assert.equal(expiredHarness.commands.some((command) => command.includes("up")), false,
  "Diagnosing an expired Quick Tunnel must remain read-only.");

const failedHealthHarness = createHarness({ healthStatus: 502 });
await assert.rejects(() => checkPublicPreview(failedHealthHarness), /healthz check returned HTTP 502/);

const exposedApiHarness = createHarness({ apiCode: "unexpected" });
await assert.rejects(() => checkPublicPreview({
  commandRunner: exposedApiHarness.commandRunner,
  fetchImpl: exposedApiHarness.fetchImpl,
  smoke: true
}), /is not isolated by public-demo mode/);

{
  let recreated = false;
  const commands = [];
  const requests = [];
  const commandRunner = async (argumentsList) => {
    commands.push(argumentsList);
    if (argumentsList.includes("up")) {
      recreated = true;
      return "";
    }
    if (argumentsList.includes("ps")) {
      const records = recreated
        ? healthyRecords
        : healthyRecords.map((record) => record.Service === "cloudflared" ? { ...record, Health: "unhealthy" } : record);
      return records.map((record) => JSON.stringify(record)).join("\n");
    }
    if (argumentsList.includes("logs")) return recreated ? multiUrlLogs : expiredLogs;
    throw new Error("Unexpected recovery command in test.");
  };
  const fetchImpl = async (target, options) => {
    const url = new URL(target);
    requests.push({ url: url.toString(), options });
    if (url.pathname === "/healthz") return new Response(null, { status: 204 });
    if (url.pathname === "/supabase-config.js") {
      return new Response("window.KIDDO_SPROUT_SUPABASE = Object.freeze({ publicDemoOnly: true });\n", {
        status: 200,
        headers: staticHeaders({ "Content-Type": "application/javascript" })
      });
    }
    if (PUBLIC_PAGE_SMOKE_PATHS.includes(url.pathname)) {
      return new Response("<!doctype html><html><title>KiddoSprout</title></html>", {
        status: 200,
        headers: staticHeaders({ "Content-Type": "text/html; charset=utf-8" })
      });
    }
    if (url.pathname === "/service-worker.js") {
      return new Response('const KIDDOSPROUT_CACHE_VERSION = "shell-v95";\n', {
        status: 200,
        headers: {
          ...STATIC_SECURITY_HEADERS,
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "Content-Type": "application/javascript; charset=utf-8"
        }
      });
    }
    if (url.pathname === "/manifest.webmanifest") {
      return new Response(JSON.stringify({
        name: "KiddoSprout",
        start_url: "./#login",
        scope: "./",
        icons: [
          { src: "kiddosprout_logo_128.png", type: "image/png" },
          { src: "kiddosprout_logo_192.png", type: "image/png" },
          { src: "kiddosprout_logo.png", type: "image/png" }
        ]
      }), {
        status: 200,
        headers: staticHeaders({ "Content-Type": "application/manifest+json" })
      });
    }
    if (["/kiddosprout_logo_128.png", "/kiddosprout_logo_192.png", "/kiddosprout_logo.png"].includes(url.pathname)) {
      return new Response("png", {
        status: 200,
        headers: staticHeaders({ "Content-Type": "image/png" })
      });
    }
    if (["/api/story-voices", "/api/blocker/checksums", "/api/bank/status"].includes(url.pathname)) {
      return jsonResponse(403, { code: "public_demo_only" });
    }
    if (url.pathname === "/Dockerfile") {
      return new Response("<!doctype html><html><title>KiddoSprout not found</title></html>", {
        status: 404,
        headers: staticHeaders({ "Content-Type": "text/html; charset=utf-8" })
      });
    }
    throw new Error(`Unexpected public recovery request: ${url.pathname}`);
  };

  const recovered = await recoverExpiredQuickTunnel({
    commandRunner,
    fetchImpl,
    wait: async () => {},
    attempts: 2
  });
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.url, CURRENT_URL);
  const recoveryCommands = commands.filter((command) => command.includes("up"));
  assert.equal(recoveryCommands.length, 1, "Recovery must recreate the connector exactly once.");
  assert.deepEqual(recoveryCommands[0].slice(-5), ["up", "-d", "--no-deps", "--force-recreate", "cloudflared"]);
  assert.equal(recoveryCommands[0].includes("kiddosprout"), false,
    "Recovery must not start or recreate an origin service.");
  assert.deepEqual(requests.map(({ url }) => new URL(url).pathname), SMOKE_REQUEST_PATHS);
}

{
  const healthyRecoveryHarness = createHarness();
  const unchanged = await recoverExpiredQuickTunnel({
    commandRunner: healthyRecoveryHarness.commandRunner,
    fetchImpl: healthyRecoveryHarness.fetchImpl,
    wait: async () => {}
  });
  assert.equal(unchanged.recovered, false);
  assert.equal(healthyRecoveryHarness.commands.some((command) => command.includes("up")), false,
    "Recovery must preserve a working Quick Tunnel URL.");
}

async function assertDisconnectedConnectorRecovers(initialRecords, description) {
  let recreated = false;
  const commands = [];
  const responseHarness = createHarness();
  const commandRunner = async (argumentsList) => {
    commands.push(argumentsList);
    if (argumentsList.includes("up")) {
      recreated = true;
      return "";
    }
    if (argumentsList.includes("ps")) {
      const records = recreated ? healthyRecords : initialRecords;
      return records.map((record) => JSON.stringify(record)).join("\n");
    }
    if (argumentsList.includes("logs")) return recreated ? multiUrlLogs : "";
    throw new Error("Unexpected disconnected-connector recovery command in test.");
  };

  const recovered = await recoverExpiredQuickTunnel({
    commandRunner,
    fetchImpl: responseHarness.fetchImpl,
    wait: async () => {},
    attempts: 2
  });
  assert.equal(recovered.recovered, true, description);
  assert.equal(recovered.url, CURRENT_URL);
  assert.equal(commands.filter((command) => command.includes("up")).length, 1,
    `${description}: recovery must recreate only the connector once.`);
}

await assertDisconnectedConnectorRecovers(
  healthyRecords.filter((record) => record.Service !== "cloudflared"),
  "A missing public connector must be recoverable"
);
await assertDisconnectedConnectorRecovers(
  healthyRecords.map((record) => record.Service === "cloudflared"
    ? { ...record, State: "exited", Health: "" }
    : record),
  "A stopped public connector must be recoverable"
);

{
  const unsafeOriginHarness = createHarness({
    records: healthyRecords.map((record) => record.Service === "bank-api" ? { ...record, Health: "unhealthy" } : record),
    logs: expiredLogs
  });
  await assert.rejects(() => recoverExpiredQuickTunnel({
    commandRunner: unsafeOriginHarness.commandRunner,
    fetchImpl: unsafeOriginHarness.fetchImpl,
    wait: async () => {}
  }), /bank-api is not healthy/);
  assert.equal(unsafeOriginHarness.commands.some((command) => command.includes("up")), false,
    "Recovery must refuse to create a new public connector while an origin is unhealthy.");
}

const [composeSource, packageSource, readme] = await Promise.all([
  readFile(new URL("../docker-compose.public.yml", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8"),
  readFile(new URL("../README.md", import.meta.url), "utf8")
]);

function serviceBlock(name, nextName) {
  const start = composeSource.indexOf(`  ${name}:`);
  const end = nextName ? composeSource.indexOf(`\n  ${nextName}:`, start) : composeSource.indexOf("\nvolumes:", start);
  assert.ok(start >= 0 && end > start, `Could not locate ${name}'s public Compose block.`);
  return composeSource.slice(start, end);
}

for (const [name, nextName, dockerfile] of [
  ["kiddosprout", "voice-api", "Dockerfile.public"],
  ["voice-api", "blocker-api", "Dockerfile.voice"],
  ["blocker-api", "bank-api", "Dockerfile.blocker"],
  ["bank-api", "cloudflared", "Dockerfile.bank"]
]) {
  const block = serviceBlock(name, nextName);
  assert.match(block, new RegExp(`path: \\.\\/${dockerfile.replace(".", "\\.")}`), `${name} must watch ${dockerfile}.`);
  assert.match(block, /path: \.\/\.dockerignore/, `${name} must rebuild when its Docker context rules change.`);
}

for (const [name, nextName] of [
  ["voice-api", "blocker-api"],
  ["blocker-api", "bank-api"],
  ["bank-api", "cloudflared"]
]) {
  const block = serviceBlock(name, nextName);
  assert.match(block, /extra_hosts:\s*!reset\s*\[\]/,
    `${name} must not inherit the private local stack's host-gateway alias in the public preview.`);
}

const publicWebBlock = serviceBlock("kiddosprout", "voice-api");
assert.match(publicWebBlock, /depends_on:\s*!reset\s*\{\}/,
  "The public web watcher must not recreate and strand its watched API services.");
assert.match(publicWebBlock, /restart:\s*"on-failure:5"/,
  "The public web container needs a bounded retry for a brief Docker-DNS startup race.");

const scripts = JSON.parse(packageSource).scripts;
assert.equal(scripts["preview:status"], "node scripts/public-preview-status.mjs");
assert.equal(scripts["preview:smoke"], "node scripts/public-preview-status.mjs --smoke");
assert.equal(scripts["preview:recover"], "node scripts/public-preview-status.mjs --recover");
assert.match(scripts["test:public-preview"], /test-public-preview-status\.mjs/);
assert.match(readme, /ordinary `npm run preview:status` never starts or recreates public sharing/i,
  "The recovery instructions must say that ordinary status checks remain read-only.");
assert.match(readme, /npm run preview:recover/,
  "The README must document the explicit expired-tunnel recovery command.");
assert.match(readme, /Compose or environment configuration changes are different from watched website files/);
assert.match(readme, /stop the watcher with Ctrl-C[\s\S]*up -d --build[\s\S]*preview:watch/);

console.log("Public preview status checks passed: exact project, newest safe URL, healthy services, live-route smoke contract, and complete image watchers.");
