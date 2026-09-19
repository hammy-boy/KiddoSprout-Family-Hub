(function () {
  "use strict";

  if (window.KiddoHubGate) return;

  const DEMO_ACTIVE_KEY = "kiddosprout.demo.v1.active";
  const DEMO_STATE_KEY = "kiddosprout.demo.v1.family";
  const DEFAULT_RULES = Object.freeze({
    studio: "request",
    explore: "allowed",
    move: "allowed",
    story: "allowed",
    arcade: "request"
  });
  let authenticatedState = null;
  let authenticatedOwnerId = "";

  function publicDemoOnly() {
    return window.KIDDO_SPROUT_SUPABASE?.publicDemoOnly === true;
  }

  function demoActive() {
    if (publicDemoOnly()) return true;
    if (window.KiddoSproutDemo?.active?.() === true) return true;
    try {
      return window.sessionStorage.getItem(DEMO_ACTIVE_KEY) === "1";
    } catch (error) {
      return false;
    }
  }

  function readStoredState(storage, key) {
    try {
      const state = JSON.parse(storage.getItem(key) || "null");
      return state && typeof state === "object" && !Array.isArray(state) ? state : null;
    } catch (error) {
      return null;
    }
  }

  function readDemoState() {
    try {
      const state = window.KiddoSproutDemo?.read?.();
      if (state && typeof state === "object" && !Array.isArray(state)) return state;
    } catch (error) {
      // Fall back to the namespaced tab storage for standalone cached pages.
    }
    return readStoredState(window.sessionStorage, DEMO_STATE_KEY);
  }

  function writeDemoState(state) {
    if (!state || typeof state !== "object" || Array.isArray(state)) return false;
    try {
      if (window.KiddoSproutDemo?.write) return window.KiddoSproutDemo.write(state) === true;
      window.sessionStorage.setItem(DEMO_STATE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      return false;
    }
  }

  function readState() {
    const state = demoActive() ? readDemoState() : authenticatedState;
    return cloneState(state);
  }

  async function writeAuthenticatedState(state) {
    if (!authenticatedState || !authenticatedOwnerId || !state || typeof state !== "object" || Array.isArray(state)) return false;
    const save = window.KiddoSproutFamilyState?.save;
    if (typeof save !== "function") return false;
    const expectedOwnerId = authenticatedOwnerId;
    const saved = await save(state, { expectedOwnerId });
    if (!saved) return false;
    const currentSession = await window.KiddoSproutSession?.validate?.();
    if (String(currentSession?.user?.id || "") !== expectedOwnerId) return false;
    authenticatedState = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : state;
    return true;
  }

  function writeState(state) {
    if (demoActive()) return writeDemoState(state);
    return writeAuthenticatedState(state);
  }

  function cloneState(state) {
    try {
      const clone = JSON.parse(JSON.stringify(state));
      return clone && typeof clone === "object" && !Array.isArray(clone) ? clone : null;
    } catch (error) {
      return null;
    }
  }

  function getRule(state, appId) {
    if (!state || !state.parentAccountCreated) return "locked";
    const child = state.children && state.children[state.activeChild];
    if (!child) return "locked";
    const rule = child.appRules?.[appId] || DEFAULT_RULES[appId] || "request";
    return ["allowed", "request", "blocked"].includes(rule) ? rule : "request";
  }

  function pointSkipLinkAt(target, fallbackId) {
    const skipLink = document.querySelector(".skip-link");
    if (!skipLink || !target) return;
    if (!target.id) target.id = fallbackId;
    target.setAttribute("tabindex", "-1");
    skipLink.setAttribute("href", `#${target.id}`);
  }

  function focusGateOutcome(lock, titleNode, messageNode) {
    if (!lock) return;
    if (titleNode) {
      if (!titleNode.id) titleNode.id = "hub-lock-title";
      lock.setAttribute("aria-labelledby", titleNode.id);
    }
    if (messageNode) {
      if (!messageNode.id) messageNode.id = "hub-lock-message";
      lock.setAttribute("aria-describedby", messageNode.id);
    }
    lock.focus?.({ preventScroll: true });
  }

  function visibleGateNodes() {
    return {
      page: document.querySelector("[data-hub-page]"),
      lock: document.querySelector("[data-hub-lock]"),
      titleNode: document.querySelector("[data-lock-title]"),
      messageNode: document.querySelector("[data-lock-message]")
    };
  }

  function showCheckingState(nodes) {
    const { page, lock, titleNode, messageNode } = nodes;
    page && page.classList.add("hidden");
    lock && lock.classList.remove("hidden");
    if (lock) lock.setAttribute("aria-busy", "true");
    if (titleNode) titleNode.textContent = "Checking family access…";
    if (messageNode) {
      messageNode.textContent = "Please wait while KiddoSprout securely checks the parent account.";
      messageNode.setAttribute("role", "status");
      messageNode.setAttribute("aria-live", "polite");
      messageNode.setAttribute("aria-atomic", "true");
    }
    pointSkipLinkAt(lock, "hub-lock-content");
  }

  function showGateMessage(nodes, heading, message) {
    const { page, lock, titleNode, messageNode } = nodes;
    page && page.classList.add("hidden");
    lock && lock.classList.remove("hidden");
    lock?.removeAttribute?.("aria-busy");
    if (titleNode) titleNode.textContent = heading;
    if (messageNode) messageNode.textContent = message;
    pointSkipLinkAt(lock, "hub-lock-content");
    focusGateOutcome(lock, titleNode, messageNode);
    return false;
  }

  function normalizeRequest(request) {
    if (!Array.isArray(request)) return null;
    const title = String(request[0] || "").trim();
    if (!title || title.toLowerCase() === "no request" || title.toLowerCase() === "no request yet") return null;
    return [
      title.slice(0, 100),
      String(request[1] || "Request from Child Mode").slice(0, 240),
      String(request[2] || title.slice(0, 1)).slice(0, 3),
      String(request[3] || "appDownload"),
      ...request.slice(4).map((value) => String(value ?? ""))
    ];
  }

  function syncRequestView(child) {
    child.pending = child.requests.length;
    child.currentRequest = child.requests[0]
      ? [...child.requests[0]]
      : ["No request", "No pending request", "-"];
  }

  function queueAccessRequest(sourceState, appId, title) {
    const state = cloneState(sourceState);
    const child = state && state.children && state.children[state.activeChild];
    if (!child) return { result: "failed", state: null };
    const reportedCount = Number.isFinite(Number(child.pending))
      ? Math.max(0, Math.floor(Number(child.pending)))
      : 0;
    const legacyRequest = normalizeRequest(child.currentRequest);
    child.requests = Array.isArray(child.requests)
      ? child.requests.map(normalizeRequest).filter(Boolean).slice(0, 100)
      : [];
    if (
      legacyRequest
      && reportedCount > child.requests.length
      && child.requests.length < 100
      && !child.requests.some((request) => JSON.stringify(request) === JSON.stringify(legacyRequest))
    ) {
      child.requests.push(legacyRequest);
    }

    const request = normalizeRequest([
      title,
      title + " requested from a connected hub page",
      String(title || "").slice(0, 1),
      "appAccess",
      appId
    ]);
    const alreadyQueued = child.requests.some((queued) => queued[3] === "appAccess" && queued[4] === String(appId));
    const added = !alreadyQueued && request && child.requests.length < 100;
    if (added) child.requests.push(request);
    syncRequestView(child);
    return {
      state,
      result: alreadyQueued ? "existing" : added ? "added" : "full"
    };
  }

  function requestDemoAccess(appId, title) {
    const queued = queueAccessRequest(readDemoState(), appId, title);
    if (!queued.state || !writeDemoState(queued.state)) return "failed";
    return queued.result;
  }

  async function requestAuthenticatedAccess(state, appId, title) {
    const queued = queueAccessRequest(state, appId, title);
    if (!queued.state) return "failed";
    if (queued.result === "existing") return "existing";
    if (queued.result === "full") return "full";
    return await writeAuthenticatedState(queued.state) ? "added" : "failed";
  }

  function showRuleOutcome(state, appId, title, requestResult, nodes) {
    const rule = getRule(state, appId);
    const { page, lock, titleNode, messageNode } = nodes;
    lock?.removeAttribute?.("aria-busy");
    if (rule === "allowed") {
      page && page.classList.remove("hidden");
      lock && lock.classList.add("hidden");
      pointSkipLinkAt(page, "main-content");
      return true;
    }
    page && page.classList.add("hidden");
    lock && lock.classList.remove("hidden");
    pointSkipLinkAt(lock, "hub-lock-content");
    if (titleNode) {
      titleNode.textContent = rule === "blocked"
        ? title + " is blocked"
        : rule === "locked" && demoActive()
          ? "Open the KiddoSprout demo first"
          : rule === "locked"
            ? "Child profile needed"
            : "Parent approval needed";
    }
    if (messageNode) {
      if (rule === "blocked") {
        messageNode.textContent = demoActive()
          ? "The fictional demo profile currently blocks this hub. Change its rule from the demo parent dashboard."
          : "KiddoSprout parent settings blocked this hub for the current child profile.";
      } else if (requestResult === "added") {
        messageNode.textContent = demoActive()
          ? "A practice request was saved in this demo tab. Open the demo parent dashboard here to review it."
          : "A request was sent to the parent dashboard. Come back after it is approved.";
      } else if (requestResult === "existing") {
        messageNode.textContent = demoActive()
          ? "This practice request is already waiting in the demo parent dashboard."
          : "This request is already waiting in the parent dashboard.";
      } else if (requestResult === "full") {
        messageNode.textContent = "The parent request list is full. Ask a parent to review the waiting requests first.";
      } else if (demoActive()) {
        messageNode.textContent = "Open the main KiddoSprout demo and choose its fictional child profile. No parent request was sent.";
      } else {
        messageNode.textContent = "Open KiddoSprout and choose a child profile first. No parent request was sent.";
      }
    }
    focusGateOutcome(lock, titleNode, messageNode);
    return false;
  }

  function protectDemo(appId, title) {
    const state = readDemoState();
    const rule = getRule(state, appId);
    const requestResult = rule === "request" ? requestDemoAccess(appId, title) : "none";
    return showRuleOutcome(readDemoState() || state, appId, title, requestResult, visibleGateNodes());
  }

  async function protectAuthenticated(appId, title) {
    const nodes = visibleGateNodes();
    authenticatedState = null;
    authenticatedOwnerId = "";
    showCheckingState(nodes);
    if (
      typeof window.KiddoSproutSession?.validate !== "function"
      || typeof window.KiddoSproutFamilyState?.load !== "function"
    ) {
      return showGateMessage(
        nodes,
        "Family access unavailable",
        "KiddoSprout cannot safely check parent settings on this page. Return to the Child Site and try again."
      );
    }
    try {
      const session = await window.KiddoSproutSession.validate();
      if (!session?.access_token || !session?.user?.id || !session?.user?.email) {
        return showGateMessage(
          nodes,
          "Parent sign-in needed",
          "A parent must sign in to KiddoSprout before this hub can check its permission. No request was sent."
        );
      }
      const expectedOwnerId = String(session.user.id);
      const state = await window.KiddoSproutFamilyState.load({ expectedOwnerId });
      if (!state || typeof state !== "object" || Array.isArray(state)) {
        return showGateMessage(
          nodes,
          "Family setup needed",
          "Open the parent dashboard and finish the family setup before using this hub. No request was sent."
        );
      }
      const currentSession = await window.KiddoSproutSession.validate();
      if (String(currentSession?.user?.id || "") !== expectedOwnerId) {
        return showGateMessage(
          nodes,
          "Parent account changed",
          "Return to the Child Site and reopen this hub from the current parent account. No request was sent."
        );
      }
      authenticatedOwnerId = expectedOwnerId;
      authenticatedState = state;
      const rule = getRule(state, appId);
      const requestResult = rule === "request"
        ? await requestAuthenticatedAccess(state, appId, title)
        : "none";
      if (rule === "request" && requestResult === "failed") {
        authenticatedState = null;
        return showGateMessage(
          nodes,
          "Request could not be sent",
          "KiddoSprout could not safely save this request. Return to the Child Site and try again later."
        );
      }
      return showRuleOutcome(authenticatedState, appId, title, requestResult, nodes);
    } catch (error) {
      authenticatedState = null;
      authenticatedOwnerId = "";
      return showGateMessage(
        nodes,
        "Family access unavailable",
        "KiddoSprout could not securely check the parent account. Reconnect, return to the Child Site, and try again."
      );
    }
  }

  window.KiddoHubGate = Object.freeze({
    demoActive,
    publicDemoOnly,
    readState,
    writeState,
    protect(appId, title) {
      return demoActive() ? protectDemo(appId, title) : protectAuthenticated(appId, title);
    }
  });
}());
