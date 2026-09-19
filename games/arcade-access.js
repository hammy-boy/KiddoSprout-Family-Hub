(function () {
  "use strict";

  const script = document.currentScript;
  const root = String(script?.dataset?.root || "");
  const gameFiles = String(script?.dataset?.files || "")
    .split(",")
    .map((file) => file.trim())
    .filter(Boolean);

  function loadScript(src, optional = false) {
    return new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = src;
      tag.async = false;
      tag.addEventListener("load", resolve, { once: true });
      tag.addEventListener("error", () => {
        tag.remove();
        if (optional) resolve();
        else reject(new Error(`Could not load ${src}`));
      }, { once: true });
      document.body.append(tag);
    });
  }

  function showLoadFailure(message) {
    const page = document.querySelector("[data-hub-page]");
    const lock = document.querySelector("[data-hub-lock]");
    const title = document.querySelector("[data-lock-title]");
    const detail = document.querySelector("[data-lock-message]");
    page?.classList.add("hidden");
    lock?.classList.remove("hidden");
    if (title) title.textContent = "The game could not open";
    if (detail) detail.textContent = message;
    if (lock) {
      lock.setAttribute("tabindex", "-1");
      lock.focus({ preventScroll: true });
    }
  }

  async function prepareArcade() {
    // Public builds generate this safe flag-only file. A plain source checkout
    // may not have it yet, so its absence must not block tab-scoped demo state.
    if (!window.KIDDO_SPROUT_SUPABASE) {
      await loadScript(`${root}supabase-config.js?v=7`, true);
    }
    if (!window.KiddoSproutDemo) await loadScript(`${root}demo-mode.js?v=2`);
    if (!window.KiddoSproutSession) await loadScript(`${root}auth-session.js?v=7`);
    if (!window.KiddoSproutFamilyState) await loadScript(`${root}family-state-cloud.js?v=2`);
    if (!window.KiddoHubGate) await loadScript(`${root}kid-hub-gate.js?v=9`);

    const allowed = await Promise.resolve(window.KiddoHubGate.protect("arcade", "Sprout Arcade"));
    if (!allowed) return;

    for (const file of gameFiles) {
      await loadScript(file);
    }
    document.documentElement.dataset.arcadeLoaded = "true";
  }

  prepareArcade().catch(() => {
    showLoadFailure("KiddoSprout could not safely check or load this game. Return to the Child Site and try again.");
  });
}());
