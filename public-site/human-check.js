(function () {
  "use strict";

  if (window.KiddoSproutHumanCheck) return;

  const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  const SCRIPT_LOAD_TIMEOUT_MS = 20000;
  const controllersByContainer = new WeakMap();
  const controllersByWidget = new Map();
  const statusesByContainer = new WeakMap();
  const renderTicketsByContainer = new WeakMap();
  const startupFocusByContainer = new WeakMap();
  let scriptPromise = null;
  let statusId = 0;

  function configuredSiteKey() {
    return String(window.KIDDO_SPROUT_SUPABASE?.turnstileSiteKey || "").trim();
  }

  function resolveElement(value, label) {
    if (typeof value === "string") {
      const element = document.querySelector(value);
      if (!element) throw new Error(`${label} was not found.`);
      return element;
    }
    if (value instanceof Element) return value;
    throw new TypeError(`${label} must be an element or selector.`);
  }

  function callSafely(callback, ...args) {
    if (typeof callback !== "function") return;
    try {
      callback(...args);
    } catch (error) {
      window.setTimeout(() => {
        throw error;
      }, 0);
    }
  }

  function snapshotStatusElement(element) {
    if (!element) return null;
    return {
      hidden: element.hidden,
      textContent: element.textContent,
      state: element.getAttribute("data-state"),
      ariaLive: element.getAttribute("aria-live"),
      role: element.getAttribute("role")
    };
  }

  function restoreStatusElement(element, snapshot) {
    if (!element || !snapshot) return;
    element.hidden = snapshot.hidden;
    element.textContent = snapshot.textContent;
    if (snapshot.state === null) element.removeAttribute("data-state");
    else element.setAttribute("data-state", snapshot.state);
    if (snapshot.ariaLive === null) element.removeAttribute("aria-live");
    else element.setAttribute("aria-live", snapshot.ariaLive);
    if (snapshot.role === null) element.removeAttribute("role");
    else element.setAttribute("role", snapshot.role);
  }

  function findStartControl(container) {
    if (!container.id || typeof document.querySelectorAll !== "function") return null;
    return Array.from(document.querySelectorAll("[aria-controls]")).find((candidate) =>
      String(candidate.getAttribute("aria-controls") || "").split(/\s+/).includes(container.id)
    ) || null;
  }

  function containerHasDocumentFocus(container) {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    if (activeElement === container) return true;
    return typeof container.contains === "function" && container.contains(activeElement);
  }

  function queueStartControlFocus(container) {
    // Removing Turnstile's focused cross-origin iframe normally moves focus to
    // <body>. Wait until the caller has restored its idle UI, then return the
    // keyboard user to the visible control that starts this exact challenge.
    Promise.resolve().then(() => {
      const activeElement = document.activeElement;
      const focusWasLost = !activeElement
        || activeElement === document.body
        || activeElement === document.documentElement
        || activeElement === container
        || activeElement.isConnected === false;
      if (!focusWasLost) return;

      const startControl = findStartControl(container);
      if (!startControl
        || startControl.isConnected === false
        || startControl.hidden
        || startControl.disabled
        || startControl.getAttribute("aria-hidden") === "true"
        || startControl.getAttribute("aria-disabled") === "true"
        || startControl.closest?.("[hidden], [aria-hidden='true']")) {
        return;
      }
      startControl.focus({ preventScroll: true });
    });
  }

  function preserveStartupFocus(container) {
    const existingFocusState = startupFocusByContainer.get(container);
    if (existingFocusState) return existingFocusState;
    const startControl = findStartControl(container);
    if (!startControl) return null;

    const activeElement = document.activeElement;
    const focusWasOnStart = activeElement === startControl;
    const focusWasLost = !activeElement
      || activeElement === document.body
      || activeElement === document.documentElement;
    const checkIsStarting = startControl.dataset.state === "checking" || startControl.disabled;
    const focusIsOnChallenge = activeElement === container;
    if (!focusWasOnStart && !focusIsOnChallenge && !(focusWasLost && checkIsStarting)) return null;
    if (typeof container.focus !== "function") return null;

    const previousTabIndex = container.getAttribute("tabindex");
    container.setAttribute("tabindex", "-1");
    container.focus({ preventScroll: true });
    const focusState = { previousTabIndex };
    startupFocusByContainer.set(container, focusState);
    return focusState;
  }

  function restoreContainerTabIndex(container, focusState) {
    if (!focusState || startupFocusByContainer.get(container) !== focusState) return;
    startupFocusByContainer.delete(container);
    if (focusState.previousTabIndex === null) container.removeAttribute("tabindex");
    else container.setAttribute("tabindex", focusState.previousTabIndex);
  }

  function createStatusRegion(container, requestedElement) {
    const previousDescription = container.getAttribute("aria-describedby") || "";
    let element = requestedElement ? resolveElement(requestedElement, "Human-check status element") : null;
    const ownsElement = !element;

    if (!element) {
      element = document.createElement("p");
      element.className = "human-check-status";
      container.insertAdjacentElement("afterend", element);
    }

    if (!element.id) {
      do {
        statusId += 1;
      } while (document.getElementById(`human-check-status-${statusId}`));
      element.id = `human-check-status-${statusId}`;
    }
    element.setAttribute("aria-atomic", "true");
    element.setAttribute("aria-live", "polite");
    element.setAttribute("role", "status");
    // A caller can publish a useful live message (for example, "Starting the
    // safety check…") immediately before rendering. Keep that supplied state
    // visible while the remote challenge script loads.
    if (ownsElement) element.hidden = true;

    const describedBy = new Set(previousDescription.split(/\s+/).filter(Boolean));
    describedBy.add(element.id);
    container.setAttribute("aria-describedby", Array.from(describedBy).join(" "));

    function clear() {
      element.hidden = true;
      element.textContent = "";
      element.dataset.state = "";
      element.setAttribute("aria-live", "polite");
      element.setAttribute("role", "status");
    }

    function announce(message, state = "error") {
      element.hidden = false;
      element.textContent = message;
      element.dataset.state = state;
      const isError = state === "error";
      element.setAttribute("aria-live", isError ? "assertive" : "polite");
      element.setAttribute("role", isError ? "alert" : "status");
    }

    function destroy() {
      const currentDescription = new Set((container.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
      currentDescription.delete(element.id);
      if (currentDescription.size) {
        container.setAttribute("aria-describedby", Array.from(currentDescription).join(" "));
      } else {
        container.removeAttribute("aria-describedby");
      }

      if (ownsElement) {
        element.remove();
      } else {
        clear();
      }
    }

    return { announce, clear, destroy, element };
  }

  function loadTurnstile() {
    if (window.turnstile?.render) return Promise.resolve(window.turnstile);
    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise((resolve, reject) => {
      let script = Array.from(document.scripts).find((candidate) => candidate.src === TURNSTILE_SCRIPT_URL);
      const ownsScript = !script;

      if (!script) {
        script = document.createElement("script");
        script.src = TURNSTILE_SCRIPT_URL;
        script.async = true;
        script.defer = true;
        script.dataset.kiddoSproutTurnstile = "true";
      }

      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        script.removeEventListener("load", handleLoad);
        script.removeEventListener("error", handleError);

        if (error) {
          if (ownsScript) script.remove();
          scriptPromise = null;
          reject(error);
          return;
        }
        resolve(window.turnstile);
      };
      const handleLoad = () => {
        if (window.turnstile?.render) {
          finish();
        } else {
          finish(new Error("Cloudflare Turnstile loaded without its browser API."));
        }
      };
      const handleError = () => finish(new Error("Cloudflare Turnstile could not be loaded."));
      const timeoutId = window.setTimeout(
        () => finish(new Error("Cloudflare Turnstile took too long to load.")),
        SCRIPT_LOAD_TIMEOUT_MS
      );

      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
      if (ownsScript) document.head.appendChild(script);
    });

    return scriptPromise;
  }

  function controllerFor(target) {
    if (!target) return null;
    if (typeof target.reset === "function" && typeof target.remove === "function") return target;
    if (target instanceof Element) return controllersByContainer.get(target) || null;
    if (typeof target === "string") {
      const widgetController = controllersByWidget.get(target);
      if (widgetController) return widgetController;
      try {
        const element = document.querySelector(target);
        if (element) return controllersByContainer.get(element) || null;
      } catch (error) {
        return null;
      }
    }
    return controllersByWidget.get(target) || null;
  }

  async function render(containerTarget, options = {}) {
    const container = resolveElement(containerTarget, "Human-check container");
    const requestedStatusElement = options.statusElement
      ? resolveElement(options.statusElement, "Human-check status element")
      : null;
    const requestedStatusSnapshot = snapshotStatusElement(requestedStatusElement);
    const previousController = controllersByContainer.get(container);
    if (previousController) {
      previousController.remove();
    } else {
      statusesByContainer.get(container)?.destroy();
      statusesByContainer.delete(container);
    }

    // Removing an older controller clears caller-owned status elements. Put
    // back the message the caller supplied for this new render before wiring
    // the replacement status region.
    restoreStatusElement(requestedStatusElement, requestedStatusSnapshot);

    const status = createStatusRegion(container, requestedStatusElement);
    statusesByContainer.set(container, status);
    const startupFocus = preserveStartupFocus(container);
    const renderTicket = Object.freeze({});
    renderTicketsByContainer.set(container, renderTicket);
    const sitekey = configuredSiteKey();
    if (!sitekey) {
      const error = new Error("Cloudflare Turnstile is not configured.");
      status.announce("Human verification is not configured. Please contact support.");
      renderTicketsByContainer.delete(container);
      restoreContainerTabIndex(container, startupFocus);
      callSafely(options.onError, "missing-sitekey", error);
      if (startupFocus) queueStartControlFocus(container);
      throw error;
    }

    let turnstile;
    try {
      turnstile = await loadTurnstile();
    } catch (error) {
      status.announce("Human verification could not load. Check your connection and try again.");
      callSafely(options.onError, "script-load-failed", error);
      if (renderTicketsByContainer.get(container) === renderTicket) {
        renderTicketsByContainer.delete(container);
        restoreContainerTabIndex(container, startupFocus);
        if (startupFocus) queueStartControlFocus(container);
      }
      throw error;
    }

    // A second render can begin while the shared Turnstile script is loading.
    // Only the newest request may create a widget in this container.
    if (renderTicketsByContainer.get(container) !== renderTicket) {
      const error = new Error("A newer human-verification check replaced this one.");
      error.code = "render-superseded";
      throw error;
    }
    if (!container.isConnected) {
      renderTicketsByContainer.delete(container);
      if (statusesByContainer.get(container) === status) {
        statusesByContainer.delete(container);
        status.destroy();
      }
      restoreContainerTabIndex(container, startupFocus);
      const error = new Error("The human-verification container is no longer on this page.");
      error.code = "container-disconnected";
      throw error;
    }

    let widgetId = null;
    let token = "";
    let removed = false;

    function updateToken(nextToken) {
      const nextValue = String(nextToken || "");
      if (removed && nextValue) return false;
      token = nextValue;
      callSafely(options.onTokenChange, token);
      return true;
    }

    const controller = Object.freeze({
      get container() {
        return container;
      },
      get widgetId() {
        return widgetId;
      },
      getToken() {
        if (removed || widgetId === null) return "";
        try {
          return turnstile.getResponse(widgetId) || token;
        } catch (error) {
          return token;
        }
      },
      reset() {
        if (removed || widgetId === null) return false;
        updateToken("");
        try {
          turnstile.reset(widgetId);
        } catch (error) {
          status.announce("Human verification could not be reset. Refresh the page and try again.");
          callSafely(options.onError, "reset-failed", error);
          return false;
        }
        status.announce("Human verification was reset. Please confirm you are not a bot again.", "notice");
        callSafely(options.onReset);
        return true;
      },
      remove() {
        if (removed) return false;
        const restoreStartFocus = containerHasDocumentFocus(container);
        removed = true;
        if (widgetId !== null) {
          try {
            turnstile.remove(widgetId);
          } catch (error) {
            // Continue local cleanup if Turnstile already discarded the widget.
          }
          controllersByWidget.delete(widgetId);
        }
        controllersByContainer.delete(container);
        statusesByContainer.delete(container);
        if (renderTicketsByContainer.get(container) === renderTicket) {
          renderTicketsByContainer.delete(container);
        }
        updateToken("");
        status.destroy();
        restoreContainerTabIndex(container, startupFocus);
        callSafely(options.onRemove);
        if (restoreStartFocus) queueStartControlFocus(container);
        return true;
      }
    });

    const callback = options.onToken || options.callback;
    const expiredCallback = options.onExpired || options.onExpire;
    const widgetOptions = Object.assign({}, options.widgetOptions || {}, {
      sitekey,
      callback(nextToken) {
        if (removed || !updateToken(nextToken)) return;
        status.clear();
        callSafely(callback, token, controller);
      },
      "expired-callback"() {
        if (removed) return;
        updateToken("");
        status.announce("Human verification expired. Please confirm you are not a bot again.");
        callSafely(expiredCallback, controller);
      },
      "error-callback"(errorCode) {
        if (removed) return true;
        updateToken("");
        status.announce("Human verification failed. Please try again.");
        callSafely(options.onError, errorCode, controller);
        return true;
      },
      "timeout-callback"() {
        if (removed) return;
        updateToken("");
        status.announce("Human verification timed out. Please try again.");
        callSafely(options.onTimeout, controller);
      },
      "unsupported-callback"() {
        if (removed) return;
        updateToken("");
        status.announce("This browser cannot run human verification. Update your browser or contact support.");
        callSafely(options.onUnsupported, controller);
      }
    });

    try {
      widgetId = turnstile.render(container, widgetOptions);
      if (widgetId === undefined || widgetId === null) {
        throw new Error("Cloudflare Turnstile did not return a widget ID.");
      }
    } catch (error) {
      status.announce("Human verification could not start. Refresh the page and try again.");
      callSafely(options.onError, "render-failed", error);
      if (renderTicketsByContainer.get(container) === renderTicket) {
        renderTicketsByContainer.delete(container);
        restoreContainerTabIndex(container, startupFocus);
        if (startupFocus) queueStartControlFocus(container);
      }
      throw error;
    }

    controllersByContainer.set(container, controller);
    controllersByWidget.set(widgetId, controller);
    return controller;
  }

  function getToken(target) {
    return controllerFor(target)?.getToken() || "";
  }

  function reset(target) {
    return controllerFor(target)?.reset() || false;
  }

  function remove(target) {
    return controllerFor(target)?.remove() || false;
  }

  window.KiddoSproutHumanCheck = Object.freeze({
    getToken,
    load: loadTurnstile,
    remove,
    render,
    reset
  });
})();
