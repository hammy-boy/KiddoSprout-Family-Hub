import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const [source, index] = await Promise.all([
  readFile(new URL("../human-check.js", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8")
]);

class ElementMock {
  constructor(id = "") {
    this.id = id;
    this.hidden = false;
    this.isConnected = true;
    this.className = "";
    this.dataset = {};
    this.attributes = new Map();
    this.textContent = "";
    this.disabled = false;
    this.children = [];
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  insertAdjacentElement(_position, element) {
    element.isConnected = this.isConnected;
  }

  contains(element) {
    return this.children.includes(element);
  }

  closest() {
    return null;
  }

  remove() {
    this.isConnected = false;
  }

  focus() {
    document.activeElement = this;
  }
}

const elements = new Map();
const container = new ElementMock("human-check");
const status = new ElementMock("human-check-status");
const startControl = new ElementMock("human-check-start");
startControl.dataset.state = "checking";
startControl.disabled = true;
startControl.setAttribute("aria-controls", container.id);
status.hidden = false;
status.textContent = "Starting the safety check…";
status.dataset.state = "notice";
elements.set(container.id, container);
elements.set(status.id, status);
elements.set(startControl.id, startControl);

let nextWidgetId = 0;
const renderCalls = [];
const widgetTokens = new Map();
const removedWidgets = [];
const turnstile = {
  render(target, options) {
    const widgetId = `widget-${++nextWidgetId}`;
    renderCalls.push({ target, options, widgetId });
    widgetTokens.set(widgetId, "");
    return widgetId;
  },
  getResponse(widgetId) {
    return widgetTokens.get(widgetId) || "";
  },
  reset(widgetId) {
    widgetTokens.set(widgetId, "");
  },
  remove(widgetId) {
    removedWidgets.push(widgetId);
    widgetTokens.delete(widgetId);
  }
};

const document = {
  activeElement: startControl,
  body: new ElementMock("body"),
  documentElement: new ElementMock("html"),
  scripts: [],
  head: { appendChild() {} },
  createElement() {
    return new ElementMock();
  },
  getElementById(id) {
    return elements.get(id) || null;
  },
  querySelector(selector) {
    return selector.startsWith("#") ? elements.get(selector.slice(1)) || null : null;
  },
  querySelectorAll(selector) {
    return selector === "[aria-controls]" ? [startControl] : [];
  }
};

const windowObject = {
  KIDDO_SPROUT_SUPABASE: { turnstileSiteKey: "1x00000000000000000000AA" },
  clearTimeout,
  document,
  setTimeout,
  turnstile
};

vm.runInNewContext(source, {
  document,
  Element: ElementMock,
  Error,
  Map,
  Object,
  Promise,
  Set,
  String,
  TypeError,
  WeakMap,
  window: windowObject
});

const api = windowObject.KiddoSproutHumanCheck;
assert.ok(api, "Human-check API was not installed.");

// Two callers can race while the external script promise resolves. Only the
// newest request may create a widget; otherwise two challenge iframes and stale
// callbacks can occupy the same account form.
// Browsers normally move focus to body when the clicked start control becomes
// disabled, so the helper must provide a meaningful loading focus target.
document.activeElement = document.body;
const firstRender = api.render(container, { statusElement: status });
assert.equal(status.hidden, false, "The caller's live startup status was hidden while Turnstile loaded.");
assert.equal(status.textContent, "Starting the safety check…", "The caller's startup message was cleared.");
assert.equal(document.activeElement, container, "Starting the challenge dumped keyboard focus onto the document body.");
assert.equal(container.getAttribute("tabindex"), "-1", "The loading challenge needs a programmatic focus target.");
const secondRender = api.render(container, { statusElement: status });
assert.equal(status.hidden, false, "A replacement render hid the supplied startup status.");
assert.equal(status.textContent, "Starting the safety check…", "A replacement render cleared the supplied startup status.");
await assert.rejects(firstRender, (error) => error?.code === "render-superseded");
const controller = await secondRender;
assert.equal(renderCalls.length, 1);
assert.equal(renderCalls[0].target, container);
assert.equal(controller.widgetId, "widget-1");

const tokenChanges = [];
const acceptedTokens = [];
controller.remove();
assert.equal(container.getAttribute("tabindex"), null, "Removing the challenge must restore the container's original tabindex.");

const freshController = await api.render(container, {
  statusElement: status,
  onToken(token) {
    acceptedTokens.push(token);
  },
  onTokenChange(token) {
    tokenChanges.push(token);
  }
});
const freshCall = renderCalls.at(-1);
widgetTokens.set(freshController.widgetId, "accepted-token");
freshCall.options.callback("accepted-token");
assert.equal(freshController.getToken(), "accepted-token");
assert.deepEqual(acceptedTokens, ["accepted-token"]);

assert.equal(freshController.remove(), true);
assert.equal(freshController.getToken(), "");
freshCall.options.callback("late-token");
freshCall.options["expired-callback"]();
freshCall.options["timeout-callback"]();
freshCall.options["unsupported-callback"]();
freshCall.options["error-callback"]("late-error");
assert.deepEqual(acceptedTokens, ["accepted-token"], "A removed widget delivered a stale success callback.");
assert.deepEqual(tokenChanges, ["accepted-token", ""], "Removed widgets must clear, but never restore, their token.");
assert.equal(api.remove(freshController.widgetId), false);
assert.ok(removedWidgets.includes(freshController.widgetId));

async function assertFocusedChallengeReturnsToStart(callbackName, optionName) {
  startControl.dataset.state = "checking";
  startControl.disabled = true;
  startControl.setAttribute("aria-disabled", "true");
  const challengeFrame = new ElementMock(`${callbackName}-frame`);
  container.children = [challengeFrame];
  let callbackController = null;
  const focusController = await api.render(container, {
    statusElement: status,
    [optionName](firstArgument, secondArgument) {
      const nextController = optionName === "onError" ? secondArgument : firstArgument;
      callbackController = nextController;
      nextController.remove();
      challengeFrame.isConnected = false;
      document.activeElement = document.body;
      startControl.dataset.state = "idle";
      startControl.disabled = false;
      startControl.setAttribute("aria-disabled", "false");
    }
  });
  document.activeElement = challengeFrame;
  const focusCall = renderCalls.at(-1);
  focusCall.options[callbackName](callbackName === "error-callback" ? "test-error" : undefined);
  await Promise.resolve();
  assert.equal(callbackController, focusController, `${callbackName} did not receive its challenge controller.`);
  assert.equal(document.activeElement, startControl, `${callbackName} left focus on the page body after removing the focused challenge.`);
}

await assertFocusedChallengeReturnsToStart("expired-callback", "onExpired");
await assertFocusedChallengeReturnsToStart("error-callback", "onError");
await assertFocusedChallengeReturnsToStart("timeout-callback", "onTimeout");

startControl.dataset.state = "checking";
startControl.disabled = true;
startControl.setAttribute("aria-disabled", "true");
const externalFocus = new ElementMock("external-focus");
const noStealController = await api.render(container, {
  statusElement: status,
  onExpired(nextController) {
    nextController.remove();
    startControl.dataset.state = "idle";
    startControl.disabled = false;
    startControl.setAttribute("aria-disabled", "false");
  }
});
document.activeElement = externalFocus;
renderCalls.at(-1).options["expired-callback"]();
await Promise.resolve();
assert.equal(noStealController.getToken(), "");
assert.equal(document.activeElement, externalFocus, "Challenge cleanup stole focus from another visible control.");

// If widget creation itself fails, the caller first restores its idle button;
// the helper must then return focus from the temporary loading container.
const workingRender = turnstile.render;
turnstile.render = () => { throw new Error("render unavailable"); };
startControl.dataset.state = "checking";
startControl.disabled = true;
startControl.setAttribute("aria-disabled", "true");
document.activeElement = document.body;
let startupErrorCode = "";
await assert.rejects(api.render(container, {
  statusElement: status,
  onError(errorCode) {
    startupErrorCode = errorCode;
    startControl.dataset.state = "idle";
    startControl.disabled = false;
    startControl.setAttribute("aria-disabled", "false");
  }
}), /render unavailable/);
await Promise.resolve();
assert.equal(startupErrorCode, "render-failed");
assert.equal(document.activeElement, startControl, "A failed widget start stranded focus on the loading container.");
assert.equal(container.getAttribute("tabindex"), null);
turnstile.render = workingRender;

const detached = new ElementMock("detached-human-check");
const detachedStatus = new ElementMock("detached-human-check-status");
detached.isConnected = false;
elements.set(detached.id, detached);
elements.set(detachedStatus.id, detachedStatus);
const callsBeforeDetachedRender = renderCalls.length;
await assert.rejects(
  api.render(detached, { statusElement: detachedStatus }),
  (error) => error?.code === "container-disconnected"
);
assert.equal(renderCalls.length, callsBeforeDetachedRender, "A detached account form rendered a challenge widget.");

for (const [startId, statusId] of [
  ["loginHumanCheckStart", "loginHumanCheckStatus"],
  ["signupHumanCheckStart", "signupHumanCheckStatus"],
  ["recoveryHumanCheckStart", "recoveryHumanCheckStatus"]
]) {
  const tag = index.match(new RegExp(`<button[^>]*id=["']${startId}["'][^>]*>`))?.[0] || "";
  assert.match(tag, new RegExp(`aria-describedby=["']${statusId}["']`), `${startId} must expose its current instructions.`);
}

console.log("Human-check safety passed: render races, detached forms, stale callbacks, and challenge focus restoration are contained.");
