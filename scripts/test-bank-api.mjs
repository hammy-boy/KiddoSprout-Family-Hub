import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const projectRoot = new URL("../", import.meta.url);
const bankServerPath = new URL("server/bank-api.mjs", projectRoot);
const BANK_HOST = "127.0.0.1";
const MOCK_BIND_HOST = "::1";
const MOCK_URL_HOST = "[::1]";
const PLAID_SECRET = "plaid-secret-must-never-be-logged";
const ACCESS_TOKEN = "access-token-super-secret";
const PUBLIC_TOKEN = "public-token-super-secret";
const CAPTCHA_TOKEN = "captcha-token-super-secret";
const SUPABASE_KEY = "sb_publishable_bank-test-key";
const TOKEN_KEY = Buffer.alloc(32, 7).toString("base64");
const WRONG_TOKEN_KEY = Buffer.alloc(32, 8).toString("base64");
const USERS = new Map(
  ["a", "b", "c", "d", "e", "f", "g", "h"].map((suffix) => {
    const id = `user-${suffix}`;
    return [`${id}-token`, {
      id,
      email: `${id}@example.test`,
      password: `${id}-account-password`,
      verified: suffix !== "f"
    }];
  })
);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const storedUserKey = (id) => `u_${createHash("sha256").update(id).digest("hex")}`;

function jsonResponse(response, status, body, contentType = "application/json") {
  const payload = Buffer.from(JSON.stringify(body));
  response.writeHead(status, { "Content-Type": contentType, "Content-Length": String(payload.length) });
  response.end(payload);
}

async function requestJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function listen(server, host = MOCK_BIND_HOST) {
  server.listen(0, host);
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return address.port;
}

async function closeServer(server) {
  if (!server.listening) return;
  server.close();
  await once(server, "close");
}

async function unusedPort() {
  const server = createServer();
  const port = await listen(server, BANK_HOST);
  await closeServer(server);
  return port;
}

function startSupabaseMock() {
  const requests = [];
  const state = {
    reauthenticationDelayMs: 0,
    userStatus: 0,
    reauthenticationStatus: 0,
    userContentType: "application/json"
  };
  const server = createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/auth/v1/user") {
      requests.push({
        method: request.method,
        url: request.url,
        apikey: request.headers.apikey,
        authorization: request.headers.authorization
      });
      const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
      const user = USERS.get(token);
      if (state.userStatus) return jsonResponse(response, state.userStatus, { error: "temporary auth response" });
      if (!user) return jsonResponse(response, 401, { error: "invalid token" });
      return jsonResponse(response, 200, {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.verified ? "2026-01-01T00:00:00Z" : null
      }, state.userContentType);
    }

    if (request.method === "POST" && request.url === "/auth/v1/token?grant_type=password") {
      let body;
      try {
        body = await requestJsonBody(request);
      } catch (error) {
        return jsonResponse(response, 400, { error: "invalid json" });
      }
      requests.push({
        method: request.method,
        url: request.url,
        apikey: request.headers.apikey,
        authorization: request.headers.authorization,
        body
      });
      if (state.reauthenticationStatus) {
        return jsonResponse(response, state.reauthenticationStatus, { error: "temporary reauthentication response" });
      }
      const delay = state.reauthenticationDelayMs;
      if (delay) await sleep(delay);
      const user = [...USERS.values()].find((candidate) => candidate.email === body.email);
      if (body.password === "mismatched-account-password"
          && body?.gotrue_meta_security?.captcha_token === CAPTCHA_TOKEN) {
        return jsonResponse(response, 200, {
          access_token: "temporary-mismatched-access-token",
          refresh_token: "temporary-mismatched-refresh-token",
          user: { id: "different-user", email: body.email }
        });
      }
      if (!user || body.password !== user.password
          || body?.gotrue_meta_security?.captcha_token !== CAPTCHA_TOKEN) {
        return jsonResponse(response, 400, { error: "invalid credentials or captcha" });
      }
      return jsonResponse(response, 200, {
        access_token: "temporary-reauth-access-token",
        refresh_token: "temporary-reauth-refresh-token",
        user: { id: user.id, email: user.email }
      });
    }

    requests.push({ method: request.method, url: request.url });
    return jsonResponse(response, 404, { error: "not found" });
  });
  return { server, requests, state };
}

function startPlaidMock() {
  const requests = [];
  const state = { onExchange: null };
  let linkCounter = 0;
  const server = createServer(async (request, response) => {
    let body;
    try {
      body = await requestJsonBody(request);
    } catch (error) {
      return jsonResponse(response, 400, { error_code: "INVALID_JSON" });
    }
    requests.push({
      method: request.method,
      url: request.url,
      plaidVersion: request.headers["plaid-version"],
      contentType: request.headers["content-type"],
      body
    });
    if (request.method !== "POST" || body.client_id !== "test-client" || body.secret !== PLAID_SECRET) {
      return jsonResponse(response, 401, { error_code: "INVALID_CREDENTIALS" });
    }
    if (request.url === "/link/token/create") {
      linkCounter += 1;
      return jsonResponse(response, 200, {
        link_token: `link-token-${linkCounter}`,
        expiration: "2030-01-01T00:00:00Z",
        request_id: "safe-request-id"
      });
    }
    if (request.url === "/item/public_token/exchange") {
      if (body.public_token !== PUBLIC_TOKEN) {
        return jsonResponse(response, 400, { error_code: "INVALID_PUBLIC_TOKEN" });
      }
      if (state.onExchange) {
        const hook = state.onExchange;
        state.onExchange = null;
        await hook();
      }
      return jsonResponse(response, 200, {
        access_token: ACCESS_TOKEN,
        item_id: "item-test",
        request_id: "safe-request-id"
      });
    }
    if (request.url === "/accounts/balance/get") {
      if (body.access_token !== ACCESS_TOKEN) {
        return jsonResponse(response, 400, { error_code: "INVALID_ACCESS_TOKEN" });
      }
      return jsonResponse(response, 200, {
        accounts: [
          {
            account_id: "plaid-current-1",
            name: "Everyday Current",
            mask: "4321",
            official_name: "Example Bank Current Account",
            type: "depository",
            subtype: "checking",
            balances: { available: 32.15, current: 40.25, iso_currency_code: "GBP" }
          },
          {
            account_id: "plaid-balance-pending",
            name: "Balance Pending",
            mask: "9876",
            balances: { available: null, current: false, iso_currency_code: "GBP" }
          },
          {
            account_id: "plaid-malformed-balance",
            name: "Malformed Balance",
            mask: "1111",
            balances: { available: "12.34", current: true, iso_currency_code: "GBP" }
          }
        ],
        request_id: "safe-request-id"
      });
    }
    if (request.url === "/item/remove") {
      if (body.access_token !== ACCESS_TOKEN) {
        return jsonResponse(response, 400, { error_code: "INVALID_ACCESS_TOKEN" });
      }
      return jsonResponse(response, 200, { removed: true, request_id: "safe-request-id" });
    }
    return jsonResponse(response, 404, { error_code: "UNKNOWN_ROUTE" });
  });
  return { server, requests, state };
}

function bankEnvironment({
  port,
  storePath,
  keyPath,
  supabasePort,
  plaidPort,
  demoMode,
  plaidConfigured = true,
  encryptionKey = plaidConfigured ? TOKEN_KEY : "",
  extraEnv = {}
}) {
  return {
    ...process.env,
    NODE_ENV: "test",
    PORT: String(port),
    SUPABASE_URL: `http://${MOCK_URL_HOST}:${supabasePort}`,
    SUPABASE_PUBLISHABLE_KEY: SUPABASE_KEY,
    SUPABASE_ANON_KEY: "",
    BANK_DEMO_MODE: demoMode ? "true" : "false",
    BANK_STORE_PATH: storePath,
    BANK_TOKEN_KEY_PATH: keyPath,
    BANK_TOKEN_ENCRYPTION_KEY: encryptionKey,
    BANK_PIN_FAILURE_LIMIT: "3",
    BANK_PIN_FAILURE_WINDOW_MS: "600000",
    BANK_REAUTH_FAILURE_LIMIT: "2",
    BANK_REAUTH_FAILURE_WINDOW_MS: "600000",
    BANK_AUTH_TIMEOUT_MS: "250",
    BANK_PROVIDER_TIMEOUT_MS: "250",
    PLAID_CLIENT_ID: plaidConfigured ? "test-client" : "",
    PLAID_SECRET: plaidConfigured ? PLAID_SECRET : "",
    PLAID_BASE_URL: `http://${MOCK_URL_HOST}:${plaidPort}`,
    PLAID_COUNTRY_CODES: "GB,US",
    PLAID_PRODUCTS: "auth,transactions",
    ...extraEnv
  };
}

function spawnBank(options) {
  const output = { stdout: "", stderr: "" };
  const child = spawn(process.execPath, [bankServerPath.pathname], {
    cwd: projectRoot.pathname,
    env: bankEnvironment(options),
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { output.stdout += chunk; });
  child.stderr.on("data", (chunk) => { output.stderr += chunk; });
  return { child, output, baseUrl: `http://${BANK_HOST}:${options.port}` };
}

async function startBank(options) {
  const instance = spawnBank(options);
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (instance.child.exitCode !== null) {
      throw new Error(`Bank API exited before startup (${instance.child.exitCode}).\n${instance.output.stderr}`);
    }
    try {
      const response = await fetch(`${instance.baseUrl}/health`, { signal: AbortSignal.timeout(500) });
      if (response.ok) return instance;
    } catch (error) {
      // The child may still be starting.
    }
    await sleep(50);
  }
  instance.child.kill("SIGKILL");
  throw new Error(`Bank API did not become healthy.\n${instance.output.stderr}`);
}

async function expectStartupFailure(options) {
  const instance = spawnBank(options);
  const [exitCode] = await Promise.race([
    once(instance.child, "exit"),
    sleep(4_000).then(() => {
      instance.child.kill("SIGKILL");
      throw new Error("Bank API unexpectedly stayed alive with invalid startup configuration.");
    })
  ]);
  assert.notEqual(exitCode, 0);
  assert.match(instance.output.stderr, /startup validation failed/i);
  return instance.output;
}

async function stopBank(instance) {
  if (!instance || instance.child.exitCode !== null) return;
  const exitPromise = once(instance.child, "exit");
  instance.child.kill("SIGTERM");
  let exitResult = await Promise.race([
    exitPromise,
    sleep(2_000).then(() => null)
  ]);
  if (!exitResult) {
    instance.child.kill("SIGKILL");
    exitResult = await exitPromise;
  }
  assert.deepEqual(exitResult, [0, null],
    "a running Bank API must drain and exit cleanly when Docker sends SIGTERM");
}

async function api(instance, pathname, { token, body = {}, rawBody, contentType = "application/json" } = {}) {
  const headers = {};
  if (contentType) headers["Content-Type"] = contentType;
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${instance.baseUrl}${pathname}`, {
    method: "POST",
    headers,
    body: rawBody === undefined ? JSON.stringify(body) : rawBody,
    signal: AbortSignal.timeout(5_000)
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    payload = { unparsed: text };
  }
  assertPrivateResponseHeaders(response);
  return { status: response.status, body: payload };
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

function firstConnectBody(suffix, pin) {
  return {
    pin,
    confirmPin: pin,
    accountPassword: `user-${suffix}-account-password`,
    captchaToken: CAPTCHA_TOKEN
  };
}

const countPlaid = (mock, pathname) => mock.requests.filter((request) => request.url === pathname).length;

function assertSecretFree(output) {
  const combined = `${output.stdout}\n${output.stderr}`;
  const secrets = [
    PLAID_SECRET,
    ACCESS_TOKEN,
    PUBLIC_TOKEN,
    CAPTCHA_TOKEN,
    TOKEN_KEY,
    WRONG_TOKEN_KEY,
    ...USERS.keys(),
    ...[...USERS.values()].map((user) => user.password)
  ];
  for (const secret of secrets) assert.equal(combined.includes(secret), false);
}

function assertPrivateDataNotPersisted(stored) {
  const secrets = [
    PLAID_SECRET,
    ACCESS_TOKEN,
    PUBLIC_TOKEN,
    CAPTCHA_TOKEN,
    "item-test",
    ...USERS.keys(),
    ...[...USERS.values()].map((user) => user.password)
  ];
  for (const secret of secrets) assert.equal(stored.includes(secret), false);
  assert.doesNotMatch(stored, /"pin"\s*:\s*"\d{4,8}"/);
}

const tempDirectory = await mkdtemp(join(tmpdir(), "kiddosprout-bank-test-"));
const storePath = join(tempDirectory, "private", "bank-links.json");
const keyPath = join(tempDirectory, "private", "bank-token.key");
const supabaseMock = startSupabaseMock();
const plaidMock = startPlaidMock();
const supabasePort = await listen(supabaseMock.server);
const plaidPort = await listen(plaidMock.server);
let bank;
const bankOutputs = [];

try {
  bank = await startBank({ port: await unusedPort(), storePath, keyPath, supabasePort, plaidPort, demoMode: false });
  bankOutputs.push(bank.output);

  const healthResponse = await fetch(`${bank.baseUrl}/health`);
  assert.equal(healthResponse.status, 200);
  assertPrivateResponseHeaders(healthResponse);
  assert.deepEqual(await healthResponse.json(), { ok: true },
    "health must not disclose bank-provider or demo configuration");

  let result = await api(bank, "/status");
  assert.equal(result.status, 401);
  assert.equal(result.body.code, "login_required");
  result = await api(bank, "/status", { token: "invalid-token" });
  assert.equal(result.status, 401);
  assert.equal(result.body.code, "session_expired");
  supabaseMock.state.userStatus = 429;
  result = await api(bank, "/status", { token: "user-a-token" });
  supabaseMock.state.userStatus = 0;
  assert.equal(result.status, 429);
  assert.equal(result.body.code, "account_service_rate_limited");
  supabaseMock.state.userContentType = "text/html";
  result = await api(bank, "/status", { token: "user-a-token" });
  supabaseMock.state.userContentType = "application/json";
  assert.equal(result.status, 503);
  assert.equal(result.body.code, "account_service_unavailable");
  result = await api(bank, "/connect-demo", { token: "user-a-token", body: firstConnectBody("a", "1234") });
  assert.equal(result.status, 503);
  assert.equal(result.body.code, "bank_demo_disabled");

  await stopBank(bank);
  bank = await startBank({
    port: await unusedPort(), storePath, keyPath, supabasePort, plaidPort,
    demoMode: true, plaidConfigured: false
  });
  bankOutputs.push(bank.output);

  result = await api(bank, "/status", { token: "user-a-token", body: { parentId: "user-b" } });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    configured: true,
    hasConnection: false,
    connected: false,
    pinConfigured: false,
    mode: "demo",
    demo: false,
    connectionIssue: false,
    canConnect: true,
    canView: false,
    canDisconnect: false,
    institution: null,
    provider: null
  });
  result = await api(bank, "/status", { token: "user-a-token", contentType: "text/plain" });
  assert.equal(result.status, 415);
  assert.equal(result.body.code, "unsupported_media_type");
  result = await api(bank, "/status", {
    token: "user-a-token",
    rawBody: JSON.stringify({ padding: "x".repeat(17 * 1024) })
  });
  assert.equal(result.status, 413);
  assert.equal(result.body.code, "request_too_large");

  result = await api(bank, "/connect-demo", {
    token: "user-a-token", body: { pin: "1234", confirmPin: "4321" }
  });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "pin_mismatch");
  result = await api(bank, "/connect-demo", {
    token: "user-a-token", body: { pin: "1234", confirmPin: "1234" }
  });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "reauthentication_required");
  result = await api(bank, "/connect-demo", {
    token: "user-a-token",
    body: { ...firstConnectBody("a", "1234"), accountPassword: "wrong-parent-password" }
  });
  assert.equal(result.status, 403);
  assert.equal(result.body.code, "reauthentication_failed");
  result = await api(bank, "/connect-demo", {
    token: "user-a-token", body: { ...firstConnectBody("a", "1234"), parentId: "user-b" }
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.demo, true);
  assert.ok(result.body.accounts.every((account) => account.demo && account.currency === "GBP"));

  const reauth = supabaseMock.requests.find((request) =>
    request.method === "POST" && request.body?.password === "user-a-account-password"
  );
  assert.ok(reauth);
  assert.equal(reauth.body.email, "user-a@example.test");
  assert.equal(reauth.body.gotrue_meta_security.captcha_token, CAPTCHA_TOKEN);
  assert.equal(reauth.apikey, SUPABASE_KEY);
  assert.equal(reauth.authorization, undefined);

  result = await api(bank, "/connect-demo", { token: "user-a-token", body: { pin: "9999" } });
  assert.equal(result.status, 403,
    "an idempotent demo-connect retry must still require the correct saved PIN");
  result = await api(bank, "/connect-demo", { token: "user-a-token", body: { pin: "1234" } });
  assert.equal(result.status, 200);
  assert.equal(result.body.alreadyConnected, true,
    "a repeated completed demo connect should converge without creating another record");
  result = await api(bank, "/link-token", { token: "user-a-token", body: { pin: "1234" } });
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "bank_already_connected");

  result = await api(bank, "/status", { token: "user-b-token" });
  assert.equal(result.body.connected, false);
  assert.equal(result.body.pinConfigured, false);
  result = await api(bank, "/accounts", { token: "user-b-token", body: { pin: "5678" } });
  assert.equal(result.status, 404);
  assert.equal(result.body.code, "pin_not_configured");
  result = await api(bank, "/accounts", { token: "user-a-token" });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "invalid_pin");
  result = await api(bank, "/accounts", { token: "user-a-token", body: { pin: "9999" } });
  assert.equal(result.status, 403);
  result = await api(bank, "/accounts", { token: "user-a-token", body: { pin: "1234" } });
  assert.equal(result.status, 200);
  assert.equal(result.body.demo, true);

  await stopBank(bank);
  bank = await startBank({ port: await unusedPort(), storePath, keyPath, supabasePort, plaidPort, demoMode: true });
  bankOutputs.push(bank.output);

  result = await api(bank, "/link-token", {
    token: "user-b-token", body: { ...firstConnectBody("b", "5678"), parentId: "user-a" }
  });
  assert.equal(result.status, 200);
  const conflictingSession = result.body.linkSessionId;
  const linkRequest = plaidMock.requests.find((request) => request.url === "/link/token/create");
  assert.ok(linkRequest);
  assert.equal(linkRequest.plaidVersion, "2020-09-14");
  assert.deepEqual(linkRequest.body.country_codes, ["GB", "US"]);
  assert.deepEqual(linkRequest.body.products, ["auth", "transactions"]);
  assert.match(linkRequest.body.user.client_user_id, /^u_[0-9a-f]{64}$/);

  result = await api(bank, "/exchange-public-token", {
    token: "user-a-token", body: { publicToken: PUBLIC_TOKEN, linkSessionId: conflictingSession }
  });
  assert.equal(result.status, 403);
  assert.equal(result.body.code, "link_session_forbidden");
  result = await api(bank, "/connect-demo", { token: "user-b-token", body: { pin: "5678" } });
  assert.equal(result.status, 200);
  const exchangeCount = countPlaid(plaidMock, "/item/public_token/exchange");
  result = await api(bank, "/exchange-public-token", {
    token: "user-b-token", body: { publicToken: PUBLIC_TOKEN, linkSessionId: conflictingSession }
  });
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "bank_already_connected");
  assert.equal(countPlaid(plaidMock, "/item/public_token/exchange"), exchangeCount);
  result = await api(bank, "/exchange-public-token", {
    token: "user-b-token", body: { publicToken: PUBLIC_TOKEN, linkSessionId: conflictingSession }
  });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "invalid_link_session");
  result = await api(bank, "/disconnect", { token: "user-b-token", body: { pin: "5678" } });
  assert.equal(result.status, 200);

  result = await api(bank, "/link-token", { token: "user-b-token", body: { pin: "5678" } });
  assert.equal(result.status, 200);
  const linkSession = result.body.linkSessionId;
  result = await api(bank, "/exchange-public-token", {
    token: "user-b-token", body: { publicToken: PUBLIC_TOKEN, linkSessionId: linkSession }
  });
  assert.equal(result.status, 200);
  result = await api(bank, "/status", { token: "user-b-token" });
  assert.equal(result.body.provider, "Plaid");
  assert.equal(result.body.institution, null,
    "the generic provider name must not be presented as the user's bank institution");
  const exchangesAfterConnection = countPlaid(plaidMock, "/item/public_token/exchange");
  result = await api(bank, "/exchange-public-token", {
    token: "user-b-token", body: { publicToken: PUBLIC_TOKEN, linkSessionId: linkSession }
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.alreadyConnected, true);
  assert.equal(countPlaid(plaidMock, "/item/public_token/exchange"), exchangesAfterConnection,
    "a repeated completed exchange must not reuse the one-time provider token");

  result = await api(bank, "/accounts", { token: "user-b-token" });
  assert.equal(result.status, 400);
  result = await api(bank, "/accounts", { token: "user-b-token", body: { pin: "0000" } });
  assert.equal(result.status, 403);
  result = await api(bank, "/accounts", { token: "user-b-token", body: { pin: "5678" } });
  assert.equal(result.status, 200);
  assert.equal(result.body.accounts[0].current, 40.25);
  assert.equal(result.body.accounts[0].currency, "GBP");
  result = await api(bank, "/link-token", { token: "user-b-token", body: { pin: "5678" } });
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "bank_already_connected");

  const stored = await readFile(storePath, "utf8");
  const persistedPlaidConnection = structuredClone(
    JSON.parse(stored).users[storedUserKey("user-b")].connection
  );
  assertPrivateDataNotPersisted(stored);
  assert.match(stored, /"algorithm": "aes-256-gcm"/);
  assert.match(stored, /"algorithm": "scrypt"/);
  assert.equal((await stat(storePath)).mode & 0o777, 0o600);
  assert.equal((await stat(dirname(storePath))).mode & 0o777, 0o700);
  await assert.rejects(stat(keyPath), (error) => error?.code === "ENOENT");

  await stopBank(bank);
  bankOutputs.push(await expectStartupFailure({
    port: await unusedPort(), storePath, keyPath, supabasePort, plaidPort,
    demoMode: true, encryptionKey: WRONG_TOKEN_KEY
  }));
  bank = await startBank({ port: await unusedPort(), storePath, keyPath, supabasePort, plaidPort, demoMode: true });
  bankOutputs.push(bank.output);

  result = await api(bank, "/exchange-public-token", {
    token: "user-b-token", body: { publicToken: PUBLIC_TOKEN, linkSessionId: linkSession }
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.alreadyConnected, true,
    "a completed exchange retry should remain idempotent after the Bank API restarts");
  assert.equal(countPlaid(plaidMock, "/item/public_token/exchange"), exchangesAfterConnection);

  result = await api(bank, "/accounts", { token: "user-b-token", body: { pin: "5678" } });
  assert.equal(result.status, 200);
  assert.equal(result.body.accounts[0].name, "Everyday Current");
  assert.equal(result.body.accounts[0].mask, "4321");
  assert.deepEqual(
    Object.keys(result.body.accounts[0]).sort(),
    ["available", "currency", "current", "demo", "mask", "name"].sort()
  );
  assert.equal(result.body.accounts[1].available, null);
  assert.equal(result.body.accounts[1].current, null,
    "missing or malformed provider balances must not be misreported as zero");
  assert.equal(result.body.accounts[2].available, null);
  assert.equal(result.body.accounts[2].current, null,
    "numeric-looking strings and booleans from a provider must not become balances");

  const burst = await Promise.all([
    ...Array.from({ length: 7 }, () => api(bank, "/accounts", {
      token: "user-a-token", body: { pin: "9999" }
    })),
    api(bank, "/accounts", { token: "user-b-token", body: { pin: "5678" } })
  ]);
  assert.deepEqual(
    burst.slice(0, 7).map((entry) => entry.status).sort((a, b) => a - b),
    [403, 403, 403, 429, 429, 429, 429]
  );
  assert.equal(burst[7].status, 200);
  result = await api(bank, "/accounts", { token: "user-a-token", body: { pin: "1234" } });
  assert.equal(result.status, 429);

  await stopBank(bank);
  bank = await startBank({ port: await unusedPort(), storePath, keyPath, supabasePort, plaidPort, demoMode: true });
  bankOutputs.push(bank.output);
  result = await api(bank, "/accounts", { token: "user-a-token", body: { pin: "1234" } });
  assert.equal(result.status, 429);
  assert.equal(result.body.code, "pin_locked");

  result = await api(bank, "/disconnect", { token: "user-b-token", body: { pin: "5678" } });
  assert.equal(result.status, 200);
  assert.equal(result.body.providerRevocationConfirmed, true);
  assert.ok(plaidMock.requests.some((request) => request.url === "/item/remove"));
  result = await api(bank, "/disconnect", { token: "user-b-token" });
  assert.equal(result.status, 200);
  assert.equal(result.body.alreadyDisconnected, true,
    "retrying a completed disconnect should be a safe no-op without enrolling or checking a new PIN");
  assert.equal(result.body.providerRevocationConfirmed, null);
  result = await api(bank, "/status", { token: "user-b-token" });
  assert.equal(result.body.pinConfigured, true);
  assert.equal(result.body.connected, false);
  result = await api(bank, "/accounts", { token: "user-b-token", body: { pin: "5678" } });
  assert.equal(result.status, 409);

  result = await api(bank, "/connect-demo", { token: "user-f-token", body: firstConnectBody("f", "2468") });
  assert.equal(result.status, 403);
  assert.equal(result.body.code, "email_not_verified");
  result = await api(bank, "/connect-demo", {
    token: "user-e-token",
    body: { ...firstConnectBody("e", "2468"), accountPassword: "mismatched-account-password" }
  });
  assert.equal(result.status, 403);
  assert.equal(result.body.code, "reauthentication_failed");

  supabaseMock.state.reauthenticationStatus = 429;
  result = await api(bank, "/connect-demo", { token: "user-h-token", body: firstConnectBody("h", "9753") });
  supabaseMock.state.reauthenticationStatus = 0;
  assert.equal(result.status, 429);
  assert.equal(result.body.code, "account_service_rate_limited");
  result = await api(bank, "/connect-demo", { token: "user-h-token", body: firstConnectBody("h", "9753") });
  assert.equal(result.status, 200, "a temporary account-service rate limit must not count as a bad password");

  const reauthBurst = await Promise.all(Array.from({ length: 2 }, () => api(bank, "/connect-demo", {
    token: "user-c-token",
    body: { ...firstConnectBody("c", "2468"), accountPassword: "wrong-parent-password" }
  })));
  assert.deepEqual(reauthBurst.map((entry) => entry.status), [403, 403]);
  result = await api(bank, "/connect-demo", { token: "user-c-token", body: firstConnectBody("c", "2468") });
  assert.equal(result.status, 429);
  assert.equal(result.body.code, "reauthentication_locked");

  await stopBank(bank);
  bank = await startBank({ port: await unusedPort(), storePath, keyPath, supabasePort, plaidPort, demoMode: true });
  bankOutputs.push(bank.output);
  result = await api(bank, "/connect-demo", { token: "user-c-token", body: firstConnectBody("c", "2468") });
  assert.equal(result.status, 429);

  supabaseMock.state.reauthenticationDelayMs = 500;
  result = await api(bank, "/connect-demo", { token: "user-g-token", body: firstConnectBody("g", "1357") });
  supabaseMock.state.reauthenticationDelayMs = 0;
  assert.equal(result.status, 503);
  assert.equal(result.body.code, "account_service_unavailable");

  await stopBank(bank);
  const providerDisabledStore = JSON.parse(await readFile(storePath, "utf8"));
  providerDisabledStore.users[storedUserKey("user-b")].connection = persistedPlaidConnection;
  await writeFile(storePath, `${JSON.stringify(providerDisabledStore, null, 2)}\n`, { mode: 0o600 });
  bank = await startBank({
    port: await unusedPort(), storePath, keyPath, supabasePort, plaidPort,
    demoMode: false, plaidConfigured: false
  });
  bankOutputs.push(bank.output);
  result = await api(bank, "/status", { token: "user-b-token" });
  assert.equal(result.body.connected, true);
  assert.equal(result.body.mode, "plaid");
  assert.equal(result.body.canView, false);
  assert.equal(result.body.canDisconnect, true);
  result = await api(bank, "/disconnect", { token: "user-b-token", body: { pin: "5678" } });
  assert.equal(result.status, 200,
    "a parent must be able to remove KiddoSprout's encrypted token if provider configuration disappears");
  assert.equal(result.body.providerRevocationConfirmed, false);
  result = await api(bank, "/status", { token: "user-h-token" });
  assert.equal(result.body.configured, false);
  assert.equal(result.body.connected, true);
  assert.equal(result.body.mode, "demo");
  assert.equal(result.body.canConnect, false);
  assert.equal(result.body.canView, true);
  assert.equal(result.body.canDisconnect, true);
  result = await api(bank, "/disconnect", { token: "user-h-token", body: { pin: "9753" } });
  assert.equal(result.status, 200, "an existing demo connection must remain removable after demo mode is disabled");
  assert.equal(result.body.providerRevocationConfirmed, true);

  const damagedStore = JSON.parse(await readFile(storePath, "utf8"));
  const userHKey = storedUserKey("user-h");
  assert.ok(damagedStore.users[userHKey]?.pin);
  damagedStore.users[userHKey].connection = { mode: "damaged", connectedAt: "2026-01-01T00:00:00.000Z" };
  await writeFile(storePath, `${JSON.stringify(damagedStore, null, 2)}\n`, { mode: 0o600 });
  result = await api(bank, "/status", { token: "user-h-token" });
  assert.equal(result.body.connectionIssue, true);
  assert.equal(result.body.connected, true);
  assert.equal(result.body.canView, false);
  assert.equal(result.body.canDisconnect, true);
  result = await api(bank, "/disconnect", { token: "user-h-token", body: { pin: "9753" } });
  assert.equal(result.status, 200, "a parent must be able to remove a damaged local connection record");
  assert.equal(result.body.providerRevocationConfirmed, false);

  const missingPinStore = JSON.parse(await readFile(storePath, "utf8"));
  missingPinStore.users[userHKey].connection = { mode: "damaged", connectedAt: "2026-01-02T00:00:00.000Z" };
  delete missingPinStore.users[userHKey].pin;
  await writeFile(storePath, `${JSON.stringify(missingPinStore, null, 2)}\n`, { mode: 0o600 });
  result = await api(bank, "/status", { token: "user-h-token" });
  assert.equal(result.body.pinConfigured, false);
  assert.equal(result.body.connectionIssue, true);
  result = await api(bank, "/disconnect", { token: "user-h-token", body: firstConnectBody("h", "8642") });
  assert.equal(result.status, 200,
    "a damaged connection without a PIN must be recoverable after fresh parent verification");

  await stopBank(bank);
  const capacityStorePath = join(tempDirectory, "capacity", "bank-links.json");
  const capacityKeyPath = join(tempDirectory, "capacity", "bank-token.key");
  bank = await startBank({
    port: await unusedPort(),
    storePath: capacityStorePath,
    keyPath: capacityKeyPath,
    supabasePort,
    plaidPort,
    demoMode: true,
    plaidConfigured: false,
    extraEnv: { BANK_MAX_STORE_USERS: "1" }
  });
  bankOutputs.push(bank.output);
  result = await api(bank, "/connect-demo", { token: "user-d-token", body: firstConnectBody("d", "8642") });
  assert.equal(result.status, 200);
  result = await api(bank, "/connect-demo", { token: "user-e-token", body: firstConnectBody("e", "9753") });
  assert.equal(result.status, 507, "a full bank store must reject a new family before replacing the valid file");
  assert.equal(result.body.code, "bank_store_full");
  const capacityStore = JSON.parse(await readFile(capacityStorePath, "utf8"));
  assert.deepEqual(Object.keys(capacityStore.users), [storedUserKey("user-d")],
    "a rejected extra family must not poison the persisted bank store");
  result = await api(bank, "/status", { token: "user-d-token" });
  assert.equal(result.status, 200);
  assert.equal(result.body.connected, true,
    "the last valid bank store must remain readable after a capacity rejection");

  await stopBank(bank);
  const pinCapacityStorePath = join(tempDirectory, "pin-capacity", "bank-links.json");
  const userDPinRecord = structuredClone(capacityStore.users[storedUserKey("user-d")].pin);
  const futureFailures = Array.from({ length: 3 }, (_, index) => Date.now() + (index + 1) * 24 * 60 * 60 * 1000);
  const pinCapacityStore = {
    version: 1,
    users: {
      [storedUserKey("user-d")]: {
        pin: structuredClone(userDPinRecord),
        connection: { mode: "demo", connectionId: "pin-capacity-d", connectedAt: "2026-01-01T00:00:00.000Z" },
        security: { pinFailures: futureFailures }
      },
      [storedUserKey("user-e")]: {
        pin: structuredClone(userDPinRecord),
        connection: { mode: "demo", connectionId: "pin-capacity-e", connectedAt: "2026-01-01T00:00:00.000Z" }
      }
    }
  };
  await mkdir(dirname(pinCapacityStorePath), { recursive: true });
  await writeFile(pinCapacityStorePath, `${JSON.stringify(pinCapacityStore, null, 2)}\n`, { mode: 0o600 });
  bank = await startBank({
    port: await unusedPort(),
    storePath: pinCapacityStorePath,
    keyPath: join(tempDirectory, "pin-capacity", "bank-token.key"),
    supabasePort,
    plaidPort,
    demoMode: true,
    plaidConfigured: false,
    extraEnv: { BANK_MAX_PENDING_PIN_DERIVATIONS: "1" }
  });
  bankOutputs.push(bank.output);
  result = await api(bank, "/accounts", { token: "user-d-token", body: { pin: "8642" } });
  assert.equal(result.status, 200,
    "future-dated failure records must not lock a parent out after a clock correction");
  const pinBurst = await Promise.all([
    api(bank, "/accounts", { token: "user-d-token", body: { pin: "1111" } }),
    api(bank, "/accounts", { token: "user-e-token", body: { pin: "2222" } })
  ]);
  assert.deepEqual(pinBurst.map((entry) => entry.status).sort((a, b) => a - b), [403, 503],
    "the service must reject excess memory-hard PIN derivations before queuing them");
  assert.ok(pinBurst.some((entry) => entry.body.code === "pin_checker_busy"));
  const afterPinBurst = JSON.parse(await readFile(pinCapacityStorePath, "utf8"));
  const recordedPinFailures = Object.values(afterPinBurst.users)
    .flatMap((entry) => entry?.security?.pinFailures || []);
  assert.equal(recordedPinFailures.length, 1,
    "a capacity rejection must not be recorded as an incorrect PIN guess");

  bankOutputs.push(await expectStartupFailure({
    port: await unusedPort(),
    storePath: join(tempDirectory, "missing-key", "bank-links.json"),
    keyPath: join(tempDirectory, "missing-key", "bank-token.key"),
    supabasePort,
    plaidPort,
    demoMode: false,
    encryptionKey: ""
  }));

  bankOutputs.push(await expectStartupFailure({
    port: await unusedPort(),
    storePath: join(tempDirectory, "partial-plaid", "bank-links.json"),
    keyPath: join(tempDirectory, "partial-plaid", "bank-token.key"),
    supabasePort,
    plaidPort,
    demoMode: false,
    plaidConfigured: false,
    extraEnv: { PLAID_CLIENT_ID: "only-one-credential" }
  }));
  bankOutputs.push(await expectStartupFailure({
    port: await unusedPort(),
    storePath: join(tempDirectory, "insecure-plaid", "bank-links.json"),
    keyPath: join(tempDirectory, "insecure-plaid", "bank-token.key"),
    supabasePort,
    plaidPort,
    demoMode: false,
    extraEnv: { PLAID_BASE_URL: "http://bank-provider.example.test" }
  }));
  bankOutputs.push(await expectStartupFailure({
    port: await unusedPort(),
    storePath: join(tempDirectory, "untrusted-plaid", "bank-links.json"),
    keyPath: join(tempDirectory, "untrusted-plaid", "bank-token.key"),
    supabasePort,
    plaidPort,
    demoMode: false,
    extraEnv: { PLAID_BASE_URL: "https://bank-provider.example.test" }
  }));

  const corruptStorePath = join(tempDirectory, "corrupt", "bank-links.json");
  await mkdir(dirname(corruptStorePath), { recursive: true });
  await writeFile(corruptStorePath, "not-json", { mode: 0o600 });
  bankOutputs.push(await expectStartupFailure({
    port: await unusedPort(),
    storePath: corruptStorePath,
    keyPath: join(tempDirectory, "corrupt", "bank-token.key"),
    supabasePort,
    plaidPort,
    demoMode: true,
    plaidConfigured: false
  }));

  await stopBank(bank);
  const compensationStore = join(tempDirectory, "compensation", "bank-links.json");
  bank = await startBank({
    port: await unusedPort(),
    storePath: compensationStore,
    keyPath: join(tempDirectory, "compensation", "bank-token.key"),
    supabasePort,
    plaidPort,
    demoMode: false
  });
  bankOutputs.push(bank.output);
  result = await api(bank, "/link-token", { token: "user-d-token", body: firstConnectBody("d", "8642") });
  assert.equal(result.status, 200);
  const compensationSession = result.body.linkSessionId;
  const removesBefore = countPlaid(plaidMock, "/item/remove");
  const compensationBackup = `${compensationStore}.backup`;
  plaidMock.state.onExchange = async () => {
    await rename(compensationStore, compensationBackup);
    await mkdir(compensationStore);
  };
  result = await api(bank, "/exchange-public-token", {
    token: "user-d-token", body: { publicToken: PUBLIC_TOKEN, linkSessionId: compensationSession }
  });
  assert.equal(result.status, 500);
  assert.equal(result.body.code, "bank_store_error");
  assert.equal(countPlaid(plaidMock, "/item/remove"), removesBefore + 1);
  assertPrivateDataNotPersisted(await readFile(compensationBackup, "utf8"));

  const lookups = supabaseMock.requests.filter((request) => request.method === "GET");
  const reauthentications = supabaseMock.requests.filter((request) => request.method === "POST");
  assert.ok(lookups.length >= 40);
  assert.ok(lookups.every((request) => request.url === "/auth/v1/user"));
  assert.ok(lookups.every((request) => request.apikey === SUPABASE_KEY));
  assert.ok(reauthentications.length >= 6);
  assert.ok(reauthentications.every((request) => request.url === "/auth/v1/token?grant_type=password"));
  assert.ok(reauthentications.every((request) => request.apikey === SUPABASE_KEY));

  for (const output of bankOutputs) assertSecretFree(output);
  console.log("Bank API tests passed: reauthentication, rate limits, media/config validation, connection recovery, Plaid, encryption, and persistence.");
} finally {
  await stopBank(bank);
  for (const output of bankOutputs) assertSecretFree(output);
  await closeServer(supabaseMock.server);
  await closeServer(plaidMock.server);
  await rm(tempDirectory, { recursive: true, force: true });
}
