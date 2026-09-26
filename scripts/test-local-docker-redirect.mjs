import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../local-docker-redirect.js", import.meta.url), "utf8");

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.style = { cssText: "" };
    this.id = "";
    this.textContent = "";
    this.type = "";
    this.href = "";
  }

  append(...children) {
    this.children.push(...children);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener(name, callback) {
    this.listeners.set(name, callback);
  }

  click() {
    this.listeners.get("click")?.({ currentTarget: this });
  }
}

function findById(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children || []) {
    const match = findById(child, id);
    if (match) return match;
  }
  return null;
}

function createDocument() {
  const body = new FakeElement("body");
  const listeners = new Map();
  return {
    body,
    createElement: (name) => new FakeElement(name),
    getElementById: (id) => findById(body, id),
    addEventListener: (name, callback) => listeners.set(name, callback),
    fire: (name) => listeners.get(name)?.()
  };
}

async function flushPromises() {
  await new Promise((resolve) => setImmediate(resolve));
}

async function runRedirect(href, fetchImplementation) {
  const initial = new URL(href);
  const replacements = [];
  const fetches = [];
  const document = createDocument();
  const timers = new Map();
  let nextTimer = 1;
  const location = {
    protocol: initial.protocol,
    hostname: initial.hostname,
    port: initial.port,
    pathname: initial.pathname,
    search: initial.search,
    hash: initial.hash,
    replace: (value) => replacements.push(value)
  };
  const window = {
    location,
    setTimeout(callback, delay) {
      const id = nextTimer++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    }
  };
  const fetch = async (url, options) => {
    fetches.push({ url, options });
    return fetchImplementation(url, options, fetches.length);
  };

  vm.runInNewContext(source, {
    AbortController,
    Error,
    Set,
    URL,
    document,
    fetch,
    window
  });
  await flushPromises();
  return { document, fetches, replacements, timers };
}

const ready = await runRedirect(
  "http://127.0.0.1:5500/blocker-setup.html?demo=1#download",
  async () => ({ ok: false, type: "opaque" })
);
assert.equal(ready.fetches.length, 1);
assert.equal(ready.fetches[0].url, "http://127.0.0.1:8001/healthz");
assert.deepEqual(
  {
    method: ready.fetches[0].options.method,
    mode: ready.fetches[0].options.mode,
    cache: ready.fetches[0].options.cache,
    credentials: ready.fetches[0].options.credentials,
    referrerPolicy: ready.fetches[0].options.referrerPolicy
  },
  {
    method: "GET",
    mode: "no-cors",
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer"
  },
  "The local hand-off must probe the Docker health endpoint without cookies or referrer data."
);
assert.deepEqual(
  ready.replacements,
  ["http://127.0.0.1:8001/blocker-setup.html?demo=1#download"],
  "A healthy Docker app should receive the requested page, query, and fragment."
);
assert.equal(ready.timers.size, 0, "A completed health probe must clear its timeout.");

const canonicalizedDockerOrigin = await runRedirect(
  "http://localhost:8001/story-theater.html?book=rainbow#reader",
  async () => ({ ok: false, type: "opaque" })
);
assert.equal(canonicalizedDockerOrigin.fetches[0]?.url, "http://127.0.0.1:8001/healthz",
  "The localhost alias must verify the canonical Docker origin before leaving the current page.");
assert.deepEqual(
  canonicalizedDockerOrigin.replacements,
  ["http://127.0.0.1:8001/story-theater.html?book=rainbow#reader"],
  "The Docker alias must converge on one origin so sessions, PWA data, and permissions are not split."
);

const stopped = await runRedirect(
  "http://localhost:5500/story-theater.html",
  async () => { throw new TypeError("connection refused"); }
);
assert.deepEqual(stopped.replacements, [], "A failed health check must leave the current preview page open.");
const notice = stopped.document.getElementById("kiddosprout-local-app-unavailable");
assert.ok(notice, "A failed health check must show an actionable local-app message.");
assert.equal(notice.getAttribute("role"), "alert");
assert.equal(notice.getAttribute("aria-live"), "assertive");
assert.match(notice.children[0].textContent, /isn’t running locally/i);
assert.match(notice.children[1].textContent, /Open Docker Desktop.*start KiddoSprout.*try again/i);
assert.equal(notice.children[2].tagName, "BUTTON");
assert.equal(notice.children[2].getAttribute("aria-describedby"), notice.children[1].id);
assert.equal(notice.children[3].tagName, "A");
assert.equal(notice.children[3].href, "https://hammy-boy.github.io/KiddoSprout-Family-Hub/");
assert.match(notice.children[3].textContent, /Open online KiddoSprout/i,
  "A stopped local stack must offer the permanent online site without requiring Docker.");

let retryAttempt = 0;
const retryable = await runRedirect(
  "http://0.0.0.0:5500/index.html",
  async () => {
    retryAttempt += 1;
    if (retryAttempt === 1) throw new TypeError("connection refused");
    return { ok: false, type: "opaque" };
  }
);
const retryButton = retryable.document.getElementById("kiddosprout-local-app-unavailable").children[2];
retryButton.click();
assert.equal(retryButton.getAttribute("aria-disabled"), "true");
assert.match(retryButton.textContent, /Checking KiddoSprout/);
await flushPromises();
assert.deepEqual(retryable.replacements, ["http://127.0.0.1:8001/index.html"]);
assert.equal(retryButton.getAttribute("aria-disabled"), null);
assert.equal(retryButton.textContent, "Try KiddoSprout again");

for (const untouched of [
  "https://kiddosprout.example/blocker-setup.html",
  "http://kiddosprout.example:5500/blocker-setup.html",
  "http://127.0.0.1:8001/blocker-setup.html"
]) {
  const result = await runRedirect(untouched, async () => ({ ok: true, type: "basic" }));
  assert.equal(result.fetches.length, 0, `${untouched} must not probe the private Docker app.`);
  assert.equal(result.replacements.length, 0, `${untouched} must not redirect.`);
  assert.equal(result.document.body.children.length, 0, `${untouched} must not show a local-only warning.`);
}

console.log("Local Docker redirect tests passed: health probe, safe fallback, retry, and domain isolation.");
