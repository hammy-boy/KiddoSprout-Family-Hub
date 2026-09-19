#!/usr/bin/env node

const socketUrl = process.argv[2];
const baseUrl = new URL(process.argv[3] || "http://127.0.0.1:8001/");
const requestedWidth = Number.parseInt(process.argv[4] || "390", 10);
const auditWidth = Number.isFinite(requestedWidth)
  ? Math.min(2560, Math.max(280, requestedWidth))
  : 390;

if (!socketUrl) {
  throw new Error("Usage: node scripts/audit-live-browser.mjs <page-websocket-url> [base-url] [viewport-width]");
}

const routes = [
  "",
  "#login",
  "#signup",
  "recipe.html",
  "app_7.html",
  "blocker-setup.html",
  "creator-studio.html",
  "nature-explorer.html",
  "move-breaks.html",
  "story-theater.html",
  "story-voices.html",
  "report_problem.html",
  "offline.html",
  "404.html"
];

const socket = new WebSocket(socketUrl);
const pending = new Map();
const runtimeProblems = [];
const networkProblems = [];
let commandId = 0;

function send(method, params = {}) {
  commandId += 1;
  const id = commandId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (!pending.has(id)) return;
      pending.delete(id);
      reject(new Error(`${method} timed out`));
    }, 15_000);
    pending.set(id, { resolve, reject, timer });
  });
}

function pause(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result || {});
    return;
  }
  if (message.method === "Runtime.exceptionThrown") {
    runtimeProblems.push({
      kind: "exception",
      message: message.params?.exceptionDetails?.exception?.description
        || message.params?.exceptionDetails?.text
        || "Unknown runtime exception"
    });
  }
  if (message.method === "Log.entryAdded" && ["error", "warning"].includes(message.params?.entry?.level)) {
    runtimeProblems.push({
      kind: message.params.entry.level,
      message: message.params.entry.text
    });
  }
  if (message.method === "Network.responseReceived" && Number(message.params?.response?.status) >= 400) {
    networkProblems.push({
      status: message.params.response.status,
      url: message.params.response.url
    });
  }
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Network.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: auditWidth,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true
});

const results = [];
for (const route of routes) {
  runtimeProblems.length = 0;
  networkProblems.length = 0;
  const url = new URL(route, baseUrl).href;
  const navigation = await send("Page.navigate", { url });
  let navigationProblem = navigation.errorText
    ? `Navigation failed: ${navigation.errorText}`
    : "";
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await pause(250);
    const readiness = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: "document.readyState"
    }).catch(() => ({ result: { value: "loading" } }));
    if (readiness.result.value === "complete") break;
  }
  await send("Emulation.setDeviceMetricsOverride", {
    width: auditWidth,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await pause(750);
  const evaluated = await send("Runtime.evaluate", {
    returnByValue: true,
    awaitPromise: true,
    expression: `(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return !element.hidden
          && style.display !== "none"
          && style.visibility !== "hidden"
          && Number(style.opacity) !== 0
          && rect.width > 0
          && rect.height > 0;
      };
      const text = (element) => {
        const labelledBy = String(element.getAttribute("aria-labelledby") || "")
          .split(/\\s+/)
          .filter(Boolean)
          .map((id) => document.getElementById(id)?.textContent || "")
          .join(" ");
        return String(
          element.getAttribute("aria-label")
          || labelledBy
          || element.getAttribute("title")
          || document.querySelector('label[for="' + CSS.escape(element.id || "__none__") + '"]')?.textContent
          || element.closest("label")?.textContent
          || element.textContent
          || element.value
          || ""
        ).trim();
      };
      const nodes = [...document.querySelectorAll("*")];
      const controls = [...document.querySelectorAll("button, a[href], input, select, textarea")].filter(visible);
      const duplicateIds = [...new Set(nodes.map((node) => node.id).filter(Boolean))]
        .filter((id) => document.querySelectorAll("#" + CSS.escape(id)).length > 1);
      const idReferenceAttributes = ["aria-labelledby", "aria-describedby", "aria-controls", "aria-owns", "aria-details"];
      const brokenIdReferences = nodes.flatMap((element) => idReferenceAttributes.flatMap((attribute) => {
        const value = element.getAttribute(attribute);
        if (!value) return [];
        return value.split(/\\s+/).filter(Boolean).filter((id) => !document.getElementById(id)).map((id) => ({
          tag: element.tagName,
          id: element.id,
          attribute,
          target: id
        }));
      }));
      for (const label of document.querySelectorAll("label[for]")) {
        const target = label.getAttribute("for");
        if (target && !document.getElementById(target)) {
          brokenIdReferences.push({ tag: "LABEL", id: label.id, attribute: "for", target });
        }
      }
      const unlabeled = controls.filter((element) => !text(element)).map((element) => ({
        tag: element.tagName,
        id: element.id,
        type: element.getAttribute("type") || ""
      }));
      const brokenImages = [...document.images]
        .filter((image) => visible(image) && image.complete && image.naturalWidth === 0)
        .map((image) => ({ src: image.currentSrc || image.src, alt: image.alt }));
      const tinyFormText = [...document.querySelectorAll("input, select, textarea")]
        .filter(visible)
        .filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < 16)
        .map((element) => ({ id: element.id, size: getComputedStyle(element).fontSize }));
      const implicitSubmitButtons = [...document.querySelectorAll("form button:not([type])")]
        .map((element) => ({ id: element.id, text: text(element).slice(0, 80) }));
      const insideHorizontalScroller = (element) => {
        for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
          const overflowX = getComputedStyle(parent).overflowX;
          if ((overflowX === "auto" || overflowX === "scroll")
              && parent.scrollWidth > parent.clientWidth + 1) return true;
        }
        return false;
      };
      const horizontalOffenders = nodes.filter(visible).filter((element) => !insideHorizontalScroller(element)).map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          id: element.id,
          className: String(element.className || "").slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          text: String(element.textContent || "").trim().slice(0, 70)
        };
      }).filter((item) => item.left < -1 || item.right > innerWidth + 1).slice(0, 20);
      return {
        title: document.title,
        url: location.href,
        viewport: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        duplicateIds,
        brokenIdReferences,
        unlabeled,
        brokenImages,
        tinyFormText,
        implicitSubmitButtons,
        horizontalOffenders
      };
    })()`
  });
  const loadedUrl = String(evaluated.result.value?.url || "");
  if (!navigationProblem && loadedUrl.startsWith("chrome-error://")) {
    navigationProblem = "Chrome loaded its network error page instead of KiddoSprout.";
  }
  if (!navigationProblem) {
    try {
      if (new URL(loadedUrl).origin !== baseUrl.origin) {
        navigationProblem = `Navigation left the audited origin: ${loadedUrl || "unknown URL"}`;
      }
    } catch (error) {
      navigationProblem = `The audited page returned an invalid URL: ${loadedUrl || "empty URL"}`;
    }
  }
  results.push({
    route: route || "index.html",
    navigationProblem,
    ...evaluated.result.value,
    runtimeProblems: [...runtimeProblems],
    networkProblems: [...networkProblems]
  });
}

console.log(JSON.stringify(results, null, 2));
const failedResults = results.filter((result) => (
  result.navigationProblem ||
  Number(result.documentWidth) > Number(result.viewport) ||
  result.duplicateIds?.length ||
  result.brokenIdReferences?.length ||
  result.unlabeled?.length ||
  result.brokenImages?.length ||
  result.tinyFormText?.length ||
  result.implicitSubmitButtons?.length ||
  result.horizontalOffenders?.length ||
  result.runtimeProblems?.length ||
  result.networkProblems?.length
));
if (failedResults.length) {
  console.error(`KiddoSprout browser audit failed on ${failedResults.length} route${failedResults.length === 1 ? "" : "s"}.`);
  process.exitCode = 1;
}
socket.close();
