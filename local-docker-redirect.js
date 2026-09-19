(() => {
  "use strict";

  const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
  if (window.location.protocol !== "http:" || !localHosts.has(window.location.hostname)) return;
  // Keep one canonical loopback origin. `localhost:8001` and
  // `127.0.0.1:8001` have separate storage, cookies, PWA registrations, and
  // permissions even though they reach the same Docker service.
  if (window.location.hostname === "127.0.0.1" && window.location.port === "8001") return;

  const candidate = window.location.pathname.split("/").filter(Boolean).pop() || "index.html";
  const page = /^[a-z0-9_-]+\.html$/i.test(candidate) ? candidate : "index.html";
  const target = new URL(`/${page}`, "http://127.0.0.1:8001");
  target.search = window.location.search;
  target.hash = window.location.hash;

  const healthEndpoint = new URL("/healthz", target.origin);
  const probeTimeoutMs = 1_200;
  let checking = false;

  function afterBodyIsReady(callback) {
    if (document.body) {
      callback();
      return;
    }
    document.addEventListener("DOMContentLoaded", callback, { once: true });
  }

  function showLocalAppUnavailable() {
    afterBodyIsReady(() => {
      if (document.getElementById("kiddosprout-local-app-unavailable")) return;

      const notice = document.createElement("section");
      notice.id = "kiddosprout-local-app-unavailable";
      notice.setAttribute("role", "alert");
      notice.setAttribute("aria-live", "assertive");
      notice.setAttribute("aria-atomic", "true");
      notice.style.cssText = "position:fixed;inset:1rem 1rem auto;z-index:2147483647;box-sizing:border-box;max-width:46rem;margin:auto;padding:1rem 1.15rem;border:3px solid #58d6c9;border-radius:18px;background:#082f3a;color:#fff;box-shadow:0 16px 48px rgba(0,0,0,.35);font:600 16px/1.45 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

      const heading = document.createElement("strong");
      heading.style.cssText = "display:block;margin:0 0 .3rem;font-size:1.15rem";
      heading.textContent = "KiddoSprout isn’t running locally";

      const detail = document.createElement("span");
      detail.id = "kiddosprout-local-app-unavailable-detail";
      detail.style.cssText = "display:block;font-weight:500";
      detail.textContent = "This page has stayed open. Open Docker Desktop and start KiddoSprout, then try again.";

      const retry = document.createElement("button");
      retry.type = "button";
      retry.setAttribute("aria-describedby", detail.id);
      retry.style.cssText = "min-height:44px;margin-top:.8rem;padding:.55rem 1rem;border:2px solid #fff;border-radius:12px;background:#fff;color:#082f3a;font:800 16px/1.2 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;cursor:pointer";
      retry.textContent = "Try KiddoSprout again";
      retry.addEventListener("click", () => probeAndRedirect({ retry, notice }));

      notice.append(heading, detail, retry);
      document.body.append(notice);
    });
  }

  async function probeAndRedirect(elements = {}) {
    if (checking) return;
    checking = true;

    const { retry, notice } = elements;
    if (retry) {
      retry.setAttribute("aria-disabled", "true");
      retry.textContent = "Checking KiddoSprout…";
    }
    notice?.setAttribute("aria-busy", "true");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), probeTimeoutMs);

    try {
      // The Docker health response is cross-origin from other local preview
      // ports. An opaque no-CORS response still proves that the loopback HTTP
      // service answered; a stopped container rejects or times out instead.
      const response = await fetch(healthEndpoint.href, {
        method: "GET",
        mode: "no-cors",
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: controller.signal
      });
      if (!response || (response.ok !== true && response.type !== "opaque")) {
        throw new Error("KiddoSprout health check failed.");
      }
      window.location.replace(target.href);
    } catch (error) {
      showLocalAppUnavailable();
    } finally {
      window.clearTimeout(timeout);
      checking = false;
      notice?.removeAttribute("aria-busy");
      if (retry) {
        retry.removeAttribute("aria-disabled");
        retry.textContent = "Try KiddoSprout again";
      }
    }
  }

  probeAndRedirect();
})();
