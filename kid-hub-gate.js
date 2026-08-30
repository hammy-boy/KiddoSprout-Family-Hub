(function () {
  const STATE_KEY = "kiddosproutState";

  function getRule(appId) {
    try {
      const state = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
      if (!state || !state.parentAccountCreated) return "locked";
      const child = state.children && state.children[state.activeChild];
      if (!child) return "locked";
      const rules = child.appRules || {};
      return rules[appId] || "allowed";
    } catch (error) {
      return "locked";
    }
  }

  function requestAccess(appId, title) {
    try {
      const state = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
      const child = state && state.children && state.children[state.activeChild];
      if (!child) return;
      child.pending = Number(child.pending || 0) + 1;
      child.currentRequest = [title, title + " requested from a connected hub page", title.slice(0, 1), "appAccess", appId];
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (error) {
      // The main hub will ask again if storage is unavailable.
    }
  }

  window.KiddoHubGate = {
    protect(appId, title) {
      const rule = getRule(appId);
      const page = document.querySelector("[data-hub-page]");
      const lock = document.querySelector("[data-hub-lock]");
      if (rule === "allowed") {
        page && page.classList.remove("hidden");
        lock && lock.classList.add("hidden");
        return;
      }
      if (rule === "request") {
        requestAccess(appId, title);
      }
      page && page.classList.add("hidden");
      lock && lock.classList.remove("hidden");
      const titleNode = document.querySelector("[data-lock-title]");
      const messageNode = document.querySelector("[data-lock-message]");
      if (titleNode) titleNode.textContent = rule === "blocked" ? title + " is blocked" : "Parent approval needed";
      if (messageNode) {
        messageNode.textContent = rule === "blocked"
          ? "KiddoSprout parent settings blocked this hub for the current child profile."
          : "A request was sent to the parent dashboard. Come back after it is approved.";
      }
    }
  };
}());
