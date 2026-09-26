import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = await readFile(new URL("../kiddosprout_python.py", import.meta.url), "utf8");
const probe = String.raw`
import json
import kiddosprout_python as app

paths = [
    "/",
    "/style.css?v=68",
    "/offline.html",
    "/learning-path.html",
    "/learning-path.css?v=1",
    "/learning-curriculum.js?v=1",
    "/learning-path.js?v=1",
    "/service-worker.js",
    "/recipe-catalog-v5342473ad68b.js",
    "/family-tech-hub-v01232923b55c.avif",
    "/family-tech-hub-v0fb9d85f0464.webp",
    "/assets/story-living-ink-attic.jpg",
    "/assets/story-living-ink-attic-v0c3699b67546.webp",
    "/games/",
    "/games/snake-game/index.html",
    "/games/arcade-shell.css",
    "/games/snake-game/game.js",
    "/Game%201.game",
    "/games/snake-game/icon.svg",
    "/games/draft/index.html",
    "/.env",
    "/server/bank-api.mjs",
    "/assets/story-ethan-leo-art-ch1.json",
    "/../.env",
    "/missing.html",
]
results = {}
for path in paths:
    body, content_type, status = app.read_static_file(path)
    results[path] = {
        "status": status,
        "content_type": content_type,
        "sample": body[:80].decode("utf-8", errors="replace"),
    }

application_status = []
body = app.application(
    {"REQUEST_METHOD": "POST", "PATH_INFO": "/api/bank/status"},
    lambda status, headers: application_status.append({"status": status, "headers": dict(headers)}),
)
results["application_post"] = {
    "status": application_status[0]["status"],
    "cache": application_status[0]["headers"].get("Cache-Control"),
    "csp": application_status[0]["headers"].get("Content-Security-Policy"),
    "body": b"".join(body).decode("utf-8", errors="replace"),
}
for name, path, query in (
    ("application_worker", "/service-worker.js", ""),
    ("application_recipe_catalog", "/recipe-catalog-v5342473ad68b.js", ""),
    ("application_style_versioned", "/style.css", "v=30"),
    ("application_style_unversioned", "/style.css", ""),
    ("application_config_query", "/supabase-config.js", "v=30"),
    ("application_missing", "/missing.html", ""),
):
    captured = []
    body = app.application(
        {"REQUEST_METHOD": "GET", "PATH_INFO": path, "QUERY_STRING": query},
        lambda status, headers: captured.append({"status": status, "headers": dict(headers)}),
    )
    results[name] = {
        "status": captured[0]["status"],
        "cache": captured[0]["headers"].get("Cache-Control"),
        "content_type": captured[0]["headers"].get("Content-Type"),
        "csp": captured[0]["headers"].get("Content-Security-Policy"),
        "sample": b"".join(body)[:80].decode("utf-8", errors="replace"),
    }
print(json.dumps(results))
`;

const result = spawnSync("python3", ["-c", probe], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }
});
assert.equal(result.status, 0, result.stderr || "Python preview probe failed.");
const responses = JSON.parse(result.stdout);
const STATIC_CONTENT_SECURITY_POLICY = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://cdn.plaid.com; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co http://127.0.0.1:* ws://127.0.0.1:* http://localhost:* ws://localhost:* https://www.themealdb.com https://en.wikipedia.org https://production.plaid.com https://sandbox.plaid.com https://development.plaid.com; frame-src https://challenges.cloudflare.com https://cdn.plaid.com; worker-src 'self'; manifest-src 'self'; font-src 'self'";
const API_CONTENT_SECURITY_POLICY = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

assert.equal(responses["/"].status, 200);
assert.match(responses["/"].content_type, /^text\/html/);
assert.match(responses["/"].sample, /<!doctype html>/i);
assert.equal(responses["/style.css?v=68"].status, 200);
assert.equal(responses["/style.css?v=68"].content_type, "text/css; charset=utf-8");
assert.equal(responses["/offline.html"].status, 200,
  "The service worker's required offline fallback must be available in the legacy preview.");
assert.match(responses["/offline.html"].content_type, /^text\/html/);
assert.equal(responses["/learning-path.html"].status, 200,
  "The Homeschool Hub must be available without starting Docker.");
assert.match(responses["/learning-path.html"].content_type, /^text\/html/);
assert.equal(responses["/learning-path.css?v=1"].content_type, "text/css; charset=utf-8");
assert.equal(responses["/learning-curriculum.js?v=1"].content_type, "text/javascript; charset=utf-8");
assert.equal(responses["/learning-path.js?v=1"].content_type, "text/javascript; charset=utf-8");
assert.equal(responses["/service-worker.js"].status, 200,
  "The legacy preview must continue to serve the install worker from the root scope.");
assert.equal(responses["/recipe-catalog-v5342473ad68b.js"].status, 200,
  "The legacy preview must serve the exact content-addressed recipe catalogue.");
assert.equal(responses["/recipe-catalog-v5342473ad68b.js"].content_type, "text/javascript; charset=utf-8");
assert.equal(responses["/family-tech-hub-v01232923b55c.avif"].content_type, "image/avif");
assert.equal(responses["/family-tech-hub-v0fb9d85f0464.webp"].content_type, "image/webp");
assert.equal(responses["/assets/story-living-ink-attic.jpg"].status, 200);
assert.equal(responses["/assets/story-living-ink-attic.jpg"].content_type, "image/jpeg");
assert.equal(responses["/assets/story-living-ink-attic-v0c3699b67546.webp"].status, 200);
assert.equal(responses["/assets/story-living-ink-attic-v0c3699b67546.webp"].content_type, "image/webp");
assert.equal(responses["/games/"].status, 200,
  "The legacy preview must resolve the Sprout Arcade directory to its reviewed chooser.");
assert.match(responses["/games/"].content_type, /^text\/html/);
assert.equal(responses["/games/snake-game/index.html"].status, 200,
  "Reviewed nested game pages must be available in the loopback preview.");
assert.match(responses["/games/snake-game/index.html"].content_type, /^text\/html/);
assert.equal(responses["/games/arcade-shell.css"].content_type, "text/css; charset=utf-8");
assert.equal(responses["/games/snake-game/game.js"].content_type, "text/javascript; charset=utf-8");
assert.equal(responses["/Game%201.game"].status, 200,
  "The clearly labelled Mac Chess match must download from the loopback preview.");
assert.equal(responses["/Game%201.game"].content_type, "application/octet-stream");

for (const path of [
  "/.env",
  "/server/bank-api.mjs",
  "/assets/story-ethan-leo-art-ch1.json",
  "/games/snake-game/icon.svg",
  "/games/draft/index.html",
  "/../.env",
  "/missing.html"
]) {
  assert.equal(responses[path].status, 404, `${path} must stay outside the legacy preview allow-list.`);
  assert.match(responses[path].content_type, /^text\/html/,
    `${path} must use the same branded HTML 404 as Docker and the hosted preview.`);
  assert.match(responses[path].sample, /<!doctype html>/i);
}

assert.match(responses.application_post.status, /^405 /,
  "The legacy preview must not expose its obsolete unauthenticated APIs.");
assert.equal(responses.application_post.cache, "no-store");
assert.equal(responses.application_post.csp, API_CONTENT_SECURITY_POLICY,
  "Even the legacy API rejection must remain non-executable.");
assert.match(responses.application_post.body, /Docker services/);
assert.match(responses.application_worker.status, /^200 /);
assert.equal(responses.application_worker.cache, "no-store",
  "The legacy preview must not let a stale HTTP-cached worker delay PWA updates.");
assert.equal(responses.application_worker.csp, STATIC_CONTENT_SECURITY_POLICY,
  "The Python preview must match the Docker and Cloudflare browser CSP exactly.");
assert.doesNotMatch(responses.application_worker.csp, /(?:^|;)\s*script-src[^;]*\shttps:(?:\s|;|$)/,
  "The Python preview must not allow scripts from every HTTPS origin.");
assert.doesNotMatch(responses.application_worker.csp, /'unsafe-eval'/);
assert.equal(responses.application_recipe_catalog.cache, "public, max-age=31536000, immutable",
  "The content-addressed recipe catalogue should not be downloaded again on every visit.");
assert.equal(responses.application_style_versioned.cache, "no-cache",
  "A manual CSS query token must not create a year-long stale-code risk in the WSGI preview.");
assert.equal(responses.application_style_unversioned.cache, "no-cache",
  "An unversioned stylesheet must revalidate rather than hiding edits.");
assert.equal(responses.application_config_query.cache, "no-store",
  "A query token must never make generated account configuration cacheable.");
assert.match(source, /query_string = environ\.get\("QUERY_STRING", ""\)[\s\S]*?cache_path = f"\{request_path\}\?\{query_string\}"/,
  "The WSGI cache classifier must retain the query for any future query-sensitive policy.");
assert.match(responses.application_missing.status, /^404 /);
assert.equal(responses.application_missing.cache, "no-store",
  "A branded deep-link error must not be reused after that route is added.");
assert.match(responses.application_missing.content_type, /^text\/html/);
assert.match(responses.application_missing.sample, /<!doctype html>/i);
assert.match(source, /ThreadingHTTPServer\(\("127\.0\.0\.1", port\)/,
  "The legacy Python preview must bind only to loopback.");
assert.match(source, /settings\["port"\] in \{465, 2465\}[\s\S]*?smtplib\.SMTP_SSL/,
  "Implicit-TLS SMTP ports must use SMTP_SSL rather than attempting STARTTLS.");
assert.match(source, /settings\["port"\] not in \{465, 2465\}[\s\S]*?smtp\.starttls\(context=tls_context\)/,
  "STARTTLS SMTP ports must upgrade using a certificate-validating TLS context.");
assert.match(source, /PUBLIC_FILES = frozenset/,
  "The legacy Python preview needs a positive static-file allow-list.");
assert.match(source, /STATIC_SECURITY_HEADERS = \(/,
  "The legacy Python preview must send browser security headers.");
assert.doesNotMatch(source, /PUBLIC_STORY_ASSET[\s\S]{0,160}?\bsvg\b/i,
  "The legacy preview must not publish active SVG files through the broad story-art allow-list.");
assert.match(source, /def static_cache_control\(url_path, status\):[\s\S]*?"\/service-worker\.js"[\s\S]*?return "no-store"/,
  "The legacy preview must not HTTP-cache the service-worker script or error pages.");
const jsonResponse = source.match(/def json_response\(handler, status, payload\):([\s\S]*?)\n\ndef /)?.[1] || "";
assert.match(jsonResponse, /Cache-Control", "no-store"/,
  "Legacy API rejection bodies must never be cached.");
assert.match(jsonResponse, /for name, value in API_SECURITY_HEADERS/,
  "Legacy API rejection bodies must carry the stricter non-executable API headers.");
const postHandler = source.match(/    def do_POST\(self\):([\s\S]*?)\n    def do_GET/)?.[1] || "";
assert.doesNotMatch(postHandler, /handle_api_post/,
  "The legacy preview must not expose the obsolete recovery or bank endpoints.");

console.log("Python preview safety passed: loopback-only serving, strict public allow-list, real 404s, and obsolete APIs disabled.");
