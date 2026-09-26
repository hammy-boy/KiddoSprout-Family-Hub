import assert from "node:assert/strict";

const MAX_RESPONSE_BYTES = 512 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;
const rawDeploymentUrl = process.argv[2] || process.env.KIDDOSPROUT_DEPLOYMENT_URL || "";

function deploymentOrigin(value) {
  let parsed;
  try {
    parsed = new URL(String(value).trim());
  } catch {
    throw new Error("Pass the deployed HTTPS origin, for example https://kiddosprout.example.workers.dev");
  }
  if (
    parsed.protocol !== "https:"
    || parsed.username
    || parsed.password
    || parsed.search
    || parsed.hash
    || (parsed.pathname !== "/" && parsed.pathname !== "")
  ) {
    throw new Error("The deployment URL must be one exact HTTPS origin with no path, query, or credentials.");
  }
  return parsed.origin;
}

async function boundedText(response) {
  const declaredLength = Number(response.headers.get("Content-Length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new Error("The deployment returned an unexpectedly large response.");
  }
  if (!response.body) throw new Error("The deployment returned an empty response.");

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
        throw new Error("The deployment returned an unexpectedly large response.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

async function request(origin, pathname, accept) {
  let response;
  try {
    response = await fetch(new URL(pathname, `${origin}/`), {
      method: "GET",
      headers: { Accept: accept, Origin: origin },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (error) {
    throw new Error(`Could not reach ${pathname} on the deployed Worker.`, { cause: error });
  }
  return { response, text: await boundedText(response) };
}

function parseBrowserConfiguration(source) {
  const prefix = "Object.freeze(";
  const start = source.indexOf(prefix);
  const end = source.lastIndexOf(");");
  if (start < 0 || end <= start) throw new Error("The hosted browser configuration has an unexpected format.");
  try {
    return JSON.parse(source.slice(start + prefix.length, end));
  } catch (error) {
    throw new Error("The hosted browser configuration is not valid JSON.", { cause: error });
  }
}

const origin = deploymentOrigin(rawDeploymentUrl);

const health = await request(origin, "/api/sprout-tutor/health", "application/json");
assert.equal(health.response.status, 200,
  `Sprout Tutor readiness failed (${health.response.status}). Check the four required Cloudflare secrets.`);
assert.match(health.response.headers.get("Content-Type") || "", /^application\/json\b/i);
assert.equal(health.response.headers.get("Access-Control-Allow-Origin"), origin);
assert.match(health.response.headers.get("Cache-Control") || "", /no-store/i);
const healthPayload = JSON.parse(health.text);
assert.equal(healthPayload.status, "configured",
  "The credential-free deployment check must not claim that any parent is authorized to use AI.");
assert.equal(healthPayload.authentication, "parent-account");

const browserConfig = await request(origin, "/supabase-config.js?deployment-check=1", "application/javascript");
assert.equal(browserConfig.response.status, 200);
assert.match(browserConfig.response.headers.get("Content-Type") || "", /^application\/javascript\b/i);
assert.match(browserConfig.response.headers.get("Cache-Control") || "", /no-store/i);
const config = parseBrowserConfiguration(browserConfig.text);
assert.equal(config.publicDemoOnly, false,
  "The Worker is still serving demo mode. KIDDOSPROUT_ACCOUNT_ORIGIN must exactly match this origin.");
assert.match(String(config.url || ""), /^https:\/\/[a-z0-9-]+\.supabase\.co$/i);
assert.ok(String(config.publishableKey || "").length >= 20);
assert.ok(String(config.turnstileSiteKey || "").length >= 20);

const page = await request(origin, "/sprout-tutor.html", "text/html");
assert.equal(page.response.status, 200);
assert.match(page.response.headers.get("Content-Type") || "", /^text\/html\b/i);
const contentSecurityPolicy = page.response.headers.get("Content-Security-Policy") || "";
const supabaseOrigin = new URL(config.url).origin;
const supabaseRealtimeOrigin = `wss://${new URL(config.url).host}`;
assert.match(contentSecurityPolicy, /(?:^|;)\s*script-src[^;]*https:\/\/challenges\.cloudflare\.com(?:\s|;|$)/,
  "The live CSP does not allow the official Turnstile script origin.");
assert.match(contentSecurityPolicy, /(?:^|;)\s*frame-src[^;]*https:\/\/challenges\.cloudflare\.com(?:\s|;|$)/,
  "The live CSP does not allow the official Turnstile frame origin.");
assert.ok(contentSecurityPolicy.includes(`connect-src 'self' ${supabaseOrigin} ${supabaseRealtimeOrigin}`),
  "The live CSP does not allow this deployment's exact Supabase HTTPS and WSS origins.");
assert.doesNotMatch(contentSecurityPolicy, /https:\/\/\*\.supabase\.co|wss:\/\/\*\.supabase\.co/,
  "The live CSP must not allow every Supabase project.");
assert.match(page.text, /Sprout Tutor/i);

console.log(`Sprout Tutor cloud deployment is configured at ${origin}/sprout-tutor.html`);
console.log("A signed-in, email-confirmed parent with active-child approval must still pass the authenticated readiness check.");
console.log("The check did not print or store any account key or parent session.");
