import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createConnection, createServer as createNetServer } from "node:net";

const CAPTCHA_TOKEN = "captcha-token-super-secret";
const SUPABASE_KEY = "sb_publishable_blocker-test-key";

async function freePort() {
  const server = createNetServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForPort(port) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const connected = await new Promise((resolve) => {
      const socket = createConnection({ host: "127.0.0.1", port });
      socket.once("connect", () => { socket.destroy(); resolve(true); });
      socket.once("error", () => resolve(false));
    });
    if (connected) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("The blocker API did not start in time.");
}

function startAuthMock(port) {
  const requests = [];
  const users = {
    "parent-token": {
        id: "parent-1",
        email: "parent@example.test",
        password: "parent-account-password",
        email_confirmed_at: "2026-01-01T00:00:00Z"
      },
      "unverified-token": {
        id: "parent-unverified",
        email: "unverified@example.test",
        password: "unverified-account-password",
        email_confirmed_at: null
      },
      "parent-two-token": {
        id: "parent-2",
        email: "parent-two@example.test",
        password: "parent-two-account-password",
        email_confirmed_at: "2026-01-01T00:00:00Z"
      },
      "parent-three-token": {
        id: "parent-3",
        email: "parent-three@example.test",
        password: "parent-three-account-password",
        email_confirmed_at: "2026-01-01T00:00:00Z"
      }
  };
  function send(response, status, value) {
    const body = JSON.stringify(value);
    response.writeHead(status, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body)
    });
    response.end(body);
  }
  const server = createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/auth/v1/user") {
      const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
      const user = users[token];
      requests.push({ method: request.method, url: request.url, token, apikey: request.headers.apikey });
      return user ? send(response, 200, {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at
      }) : send(response, 401, { error: "invalid" });
    }
    if (request.method === "POST" && request.url === "/auth/v1/token?grant_type=password") {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      } catch (error) {
        return send(response, 400, { error: "invalid json" });
      }
      requests.push({
        method: request.method,
        url: request.url,
        apikey: request.headers.apikey,
        authorization: request.headers.authorization,
        body
      });
      const user = Object.values(users).find((candidate) => candidate.email === body.email);
      if (!user || body.password !== user.password
          || body?.gotrue_meta_security?.captcha_token !== CAPTCHA_TOKEN) {
        return send(response, 400, { error: "invalid credentials or captcha" });
      }
      return send(response, 200, {
        access_token: "temporary-reauth-access-token",
        refresh_token: "temporary-reauth-refresh-token",
        user: { id: user.id, email: user.email }
      });
    }
    return send(response, 404, { error: "not found" });
  });
  server.listen(port, "0.0.0.0");
  return once(server, "listening").then(() => ({ server, requests }));
}

function assertPrivateResponseHeaders(response) {
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0, must-revalidate");
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.equal(response.headers.get("expires"), "0");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.match(response.headers.get("vary") || "", /(?:^|,\s*)Authorization(?:,|$)/i);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("cross-origin-resource-policy"), "same-origin");
  assert.match(response.headers.get("content-security-policy") || "", /default-src 'none'/);
  assert.equal(response.headers.get("access-control-allow-origin"), null,
    "private APIs must never opt into cross-origin browser reads");
}

async function api(port, pathname, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    ...options,
    headers: {
      Connection: "close",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  assertPrivateResponseHeaders(response);
  return response;
}

const fixtureRoot = await mkdtemp(join(tmpdir(), "kiddosprout-blocker-api-"));
const downloads = join(fixtureRoot, "downloads");
await mkdir(downloads);
const macPath = join(downloads, "mac.zip");
const windowsPath = join(downloads, "windows-x64.zip");
const windowsArmPath = join(downloads, "windows-arm64.zip");
const zipPrefix = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const macFixture = Buffer.concat([zipPrefix, Buffer.from("mac-fixture")]);
const windowsFixture = Buffer.concat([zipPrefix, Buffer.from("windows-x64-fixture")]);
const windowsArmFixture = Buffer.concat([zipPrefix, Buffer.from("windows-arm64-fixture")]);
await writeFile(macPath, macFixture);
await writeFile(windowsPath, windowsFixture);
await writeFile(windowsArmPath, windowsArmFixture);
const checksumFixture = [
  `${createHash("sha256").update(macFixture).digest("hex")}  KiddoSproutBlocker-macOS-v0.3.1-test.zip`,
  `${createHash("sha256").update(windowsFixture).digest("hex")}  KiddoSproutBlocker-Windows-x64-v0.1.0-test.zip`,
  `${createHash("sha256").update(windowsArmFixture).digest("hex")}  KiddoSproutBlocker-Windows-arm64-v0.1.0-test.zip`,
  ""
].join("\n");

const authPort = await freePort();
const apiPort = await freePort();
const authMock = await startAuthMock(authPort);
const blocker = spawn(process.execPath, [new URL("../server/blocker-api.mjs", import.meta.url).pathname], {
  env: {
    ...process.env,
    PORT: String(apiPort),
    SUPABASE_URL: `http://0.0.0.0:${authPort}`,
    SUPABASE_PUBLISHABLE_KEY: SUPABASE_KEY,
    BLOCKER_PIN_STORE: join(fixtureRoot, "pins.json"),
    BLOCKER_MAC_DOWNLOAD_PATH: macPath,
    BLOCKER_WINDOWS_X64_DOWNLOAD_PATH: windowsPath,
    BLOCKER_WINDOWS_ARM64_DOWNLOAD_PATH: windowsArmPath,
    BLOCKER_MAX_STORE_RECORDS: "2",
    BLOCKER_MAC_VERSION: "0.3.1-test",
    BLOCKER_WINDOWS_VERSION: "0.1.0-test"
  },
  stdio: ["ignore", "ignore", "inherit"]
});

try {
  await waitForPort(apiPort);

  let response = await api(apiPort, "/health");
  assert.equal(response.status, 200);
  let payload = await response.json();
  assert.deepEqual(payload, { ok: true }, "health must not disclose installer names, versions, or readiness");

  response = await api(apiPort, "/checksums");
  assert.equal(response.status, 200);
  assert.equal(await response.text(), checksumFixture);
  assert.match(response.headers.get("content-disposition") || "", /SHA256SUMS\.txt/);

  await writeFile(macPath, "changed-after-container-start");
  response = await api(apiPort, "/checksums");
  assert.equal(response.status, 200);
  assert.equal(await response.text(), checksumFixture,
    "immutable container artifacts must reuse the bounded checksum result instead of rehashing on every request");

  response = await api(apiPort, "/status?platform=windows");
  assert.equal(response.status, 401, "status must require a parent session");

  response = await api(apiPort, "/status?platform=windows", { token: "unverified-token" });
  assert.equal(response.status, 403, "status must reject an unverified parent email");
  payload = await response.json();
  assert.equal(payload.code, "email_not_verified");

  response = await api(apiPort, "/download/windows", {
    method: "POST",
    token: "unverified-token",
    body: { pin: "2468", confirmPin: "2468" }
  });
  assert.equal(response.status, 403, "downloads must reject an unverified parent email before creating a PIN");
  payload = await response.json();
  assert.equal(payload.code, "email_not_verified");

  response = await api(apiPort, "/status?platform=windows", { token: "parent-token" });
  assert.equal(response.status, 200);
  payload = await response.json();
  assert.equal(payload.pinConfigured, false);
  assert.equal(payload.platform, "Windows");
  assert.equal(payload.architecture, "x64");

  response = await api(apiPort, "/status?platform=mac", { token: "parent-token" });
  assert.equal(response.status, 200);
  payload = await response.json();
  assert.equal(payload.artifact.ready, false, "a non-ZIP artifact must not be advertised as ready");

  response = await api(apiPort, "/status?platform=linux", { token: "parent-token" });
  assert.equal(response.status, 400, "an unknown platform must not silently return the Mac artifact");
  payload = await response.json();
  assert.equal(payload.code, "unsupported_platform");

  response = await api(apiPort, "/download/windows", {
    method: "POST",
    token: "parent-token",
    body: { pin: "2468", confirmPin: "1357" }
  });
  assert.equal(response.status, 400, "first-download PIN confirmation must match");

  response = await api(apiPort, "/download/windows", {
    method: "POST",
    token: "parent-token",
    body: { pin: "2468", confirmPin: "2468" }
  });
  assert.equal(response.status, 400, "a signed-in browser alone must not be able to claim the first parent PIN");
  payload = await response.json();
  assert.equal(payload.code, "reauthentication_required");

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    response = await api(apiPort, "/download/windows", {
      method: "POST",
      token: "parent-two-token",
      body: {
        pin: "1357",
        confirmPin: "1357",
        accountPassword: "wrong-parent-password",
        captchaToken: CAPTCHA_TOKEN
      }
    });
    assert.equal(response.status, 403, `failed parent check ${attempt} must be rejected`);
    payload = await response.json();
    assert.equal(payload.code, "reauthentication_failed");
    if (attempt === 1) {
      const pendingStore = JSON.parse(await readFile(join(fixtureRoot, "pins.json"), "utf8"));
      assert.equal(Boolean(pendingStore["parent-2"]?.hash), false,
        "a failed first-time parent check must not create a blocker PIN");
      assert.equal(pendingStore["parent-2"]?.security?.reauthFailures?.length, 1,
        "first-time reauthentication failures must be durable before a PIN exists");
      response = await api(apiPort, "/status?platform=windows", { token: "parent-two-token" });
      assert.equal(response.status, 200, "a pending failure record must remain a valid unconfigured account state");
      assert.equal((await response.json()).pinConfigured, false);
    }
  }

  const parentTwoReauthCount = authMock.requests.filter((entry) =>
    entry.method === "POST" && entry.body?.email === "parent-two@example.test"
  ).length;
  response = await api(apiPort, "/download/windows", {
    method: "POST",
    token: "parent-two-token",
    body: {
      pin: "1357",
      confirmPin: "1357",
      accountPassword: "parent-two-account-password",
      captchaToken: CAPTCHA_TOKEN
    }
  });
  assert.equal(response.status, 429, "durable parent-check failures must lock first-time enrollment");
  payload = await response.json();
  assert.equal(payload.code, "reauthentication_locked");
  assert.equal(authMock.requests.filter((entry) =>
    entry.method === "POST" && entry.body?.email === "parent-two@example.test"
  ).length, parentTwoReauthCount, "locked enrollment must not call the password endpoint again");

  const enrollmentBody = {
    pin: "2468",
    confirmPin: "2468",
    accountPassword: "parent-account-password",
    captchaToken: CAPTCHA_TOKEN
  };
  const concurrentEnrollment = await Promise.all([
    api(apiPort, "/download/windows", { method: "POST", token: "parent-token", body: enrollmentBody }),
    api(apiPort, "/download/windows", { method: "POST", token: "parent-token", body: enrollmentBody })
  ]);
  assert.deepEqual(concurrentEnrollment.map((item) => item.status), [200, 200],
    "simultaneous first downloads with the same PIN must converge on one enrollment");
  assert.equal(authMock.requests.filter((entry) =>
    entry.method === "POST" && entry.body?.email === "parent@example.test"
  ).length, 1, "a queued duplicate must verify the newly saved PIN instead of repeating parent reauthentication");
  for (const enrollmentResponse of concurrentEnrollment) {
    assert.equal(
      enrollmentResponse.headers.get("x-kiddosprout-sha256"),
      createHash("sha256").update(windowsFixture).digest("hex"),
      "each protected archive response must include the digest of the downloaded bytes"
    );
    assert.deepEqual(Buffer.from(await enrollmentResponse.arrayBuffer()), windowsFixture);
    assert.match(enrollmentResponse.headers.get("content-disposition") || "", /KiddoSproutBlocker-Windows-x64-v0\.1\.0-test\.zip/);
    assert.equal(enrollmentResponse.headers.get("cache-control"), "private, no-store, max-age=0, must-revalidate");
  }

  response = await api(apiPort, "/download/windows-arm64", {
    method: "POST",
    token: "parent-token",
    body: { pin: "0000", confirmPin: "0000" }
  });
  assert.equal(response.status, 403, "later downloads must verify the saved PIN");

  response = await api(apiPort, "/download/windows-arm64", {
    method: "POST",
    token: "parent-token",
    body: { pin: "2468", confirmPin: "2468" }
  });
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), windowsArmFixture);

  response = await api(apiPort, "/download/windows", {
    method: "POST",
    token: "parent-three-token",
    body: {
      pin: "8642",
      confirmPin: "8642",
      accountPassword: "parent-three-account-password",
      captchaToken: CAPTCHA_TOKEN
    }
  });
  assert.equal(response.status, 507, "a full PIN store must reject the new record before replacing the valid file");
  payload = await response.json();
  assert.equal(payload.code, "pin_store_full");
  const capacityStore = JSON.parse(await readFile(join(fixtureRoot, "pins.json"), "utf8"));
  assert.deepEqual(Object.keys(capacityStore).sort(), ["parent-1", "parent-2"],
    "a rejected extra family must not poison the persisted PIN store");
  response = await api(apiPort, "/status?platform=windows", { token: "parent-token" });
  assert.equal(response.status, 200, "the last valid PIN store must remain readable after a capacity rejection");
  assert.equal((await response.json()).pinConfigured, true);

  const validStoreText = await readFile(join(fixtureRoot, "pins.json"), "utf8");
  await writeFile(join(fixtureRoot, "pins.json"), JSON.stringify({
    "parent-1": { version: 1, salt: "broken", hash: "broken" }
  }));
  response = await api(apiPort, "/status?platform=mac", { token: "parent-token" });
  assert.equal(response.status, 500, "a corrupt PIN record must fail closed instead of pretending a PIN is usable");
  payload = await response.json();
  assert.equal(payload.code, "pin_store_error");
  await writeFile(join(fixtureRoot, "pins.json"), validStoreText);

  response = await api(apiPort, "/download/linux", {
    method: "POST",
    token: "parent-token",
    body: { pin: "2468", confirmPin: "2468" }
  });
  assert.equal(response.status, 404);

  response = await api(apiPort, "/pin/reset", {
    method: "POST",
    token: "parent-token",
    body: { pin: "2468" }
  });
  assert.equal(response.status, 404,
    "the API must not expose an unaudited PIN reset path that bypasses parent recovery requirements");

  const concurrentGuesses = await Promise.all(
    Array.from({ length: 8 }, (_, index) => api(apiPort, "/download/windows", {
      method: "POST",
      token: "parent-token",
      body: { pin: String(1000 + index), confirmPin: String(1000 + index) }
    }))
  );
  const guessStatuses = concurrentGuesses.map((guess) => guess.status);
  assert.equal(guessStatuses.filter((status) => status === 403).length, 5, "only five guesses may enter PIN verification");
  assert.equal(guessStatuses.filter((status) => status === 429).length, 3,
    "per-user serialization must apply the durable lock to guesses queued behind the fifth failure");

  response = await api(apiPort, "/download/windows", {
    method: "POST",
    token: "parent-token",
    body: { pin: "2468", confirmPin: "2468" }
  });
  assert.equal(response.status, 429, "the persistent five-attempt lockout must apply before another PIN derivation");

  const store = JSON.parse(await readFile(join(fixtureRoot, "pins.json"), "utf8"));
  assert.ok(store["parent-1"]?.hash);
  assert.equal(JSON.stringify(store).includes("2468"), false, "the raw PIN must never be stored");
  assert.equal(JSON.stringify(store).includes("parent-account-password"), false,
    "the parent account password must never be stored");
  assert.equal(JSON.stringify(store).includes(CAPTCHA_TOKEN), false,
    "the one-use safety-check token must never be stored");
  assert.equal(store["parent-1"].failedAttempts.length, 5, "failed-attempt lockout state must be persisted");
  const reauthenticationRequests = authMock.requests.filter((entry) => entry.method === "POST");
  assert.ok(reauthenticationRequests.length >= 6);
  for (const request of reauthenticationRequests) {
    assert.equal(request.apikey, SUPABASE_KEY);
    assert.equal(request.authorization, undefined,
      "fresh password verification must not accidentally forward the caller's bearer session");
  }
  console.log("Blocker API Mac and Windows download tests passed.");
} finally {
  const exitPromise = once(blocker, "exit");
  blocker.kill("SIGTERM");
  let exitResult = await Promise.race([
    exitPromise,
    new Promise((resolve) => setTimeout(() => resolve(null), 1000))
  ]);
  if (!exitResult) {
    blocker.kill("SIGKILL");
    exitResult = await exitPromise;
  }
  assert.deepEqual(exitResult, [0, null],
    "a running Blocker API must drain and exit cleanly when Docker sends SIGTERM");
  await new Promise((resolve) => authMock.server.close(resolve));
}
