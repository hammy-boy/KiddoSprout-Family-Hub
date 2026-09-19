(() => {
  "use strict";

  const parameters = new URLSearchParams(window.location.search);
  const title = String(parameters.get("title") || "This game").trim().slice(0, 100);
  const detail = String(parameters.get("detail") || "A parent rule is keeping this space paused.").trim().slice(0, 240);
  document.getElementById("blocked-target").textContent = title;
  document.getElementById("blocked-detail").textContent = detail;
  document.getElementById("go-back").addEventListener("click", () => {
    const blockedURL = window.location.href;
    window.history.back();
    window.setTimeout(() => {
      if (window.location.href === blockedURL) window.location.replace("about:blank");
    }, 500);
  });
})();
