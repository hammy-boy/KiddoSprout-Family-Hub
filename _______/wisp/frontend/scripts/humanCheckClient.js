const MISSING_CHECK_MESSAGE = "The safety check is not configured. Ask the site owner to add the public Turnstile site key.";

function setStatus(statusElement, message, state = "error") {
  if (!statusElement) return;
  statusElement.hidden = false;
  statusElement.textContent = message;
  statusElement.dataset.state = state;
  statusElement.setAttribute("role", state === "error" ? "alert" : "status");
}

export async function mountHumanCheck(container, statusElement) {
  const siteKey = String(window.KIDDO_SPROUT_SUPABASE?.turnstileSiteKey || "").trim();
  const api = window.KiddoSproutHumanCheck;
  if (!siteKey || !api?.render) {
    setStatus(statusElement, MISSING_CHECK_MESSAGE);
    return null;
  }

  setStatus(statusElement, "Loading the safety check…", "notice");
  try {
    return await api.render(container, {
      statusElement,
      widgetOptions: { theme: "auto", size: "flexible", action: "wisp_auth" },
    });
  } catch (error) {
    console.error("Wisp human check failed to load.", error);
    setStatus(statusElement, "The safety check could not load. Refresh the page and try again.");
    return null;
  }
}

export function captchaToken(controller) {
  return String(controller?.getToken?.() || "").trim();
}

export function resetHumanCheck(controller) {
  controller?.reset?.();
}

export function removeHumanCheck(controller) {
  controller?.remove?.();
}

export { MISSING_CHECK_MESSAGE };
