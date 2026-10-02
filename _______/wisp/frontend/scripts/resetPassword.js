import { WISP_LIMITS } from "./config.js";
import {
  bindField,
  hideBanner,
  isValidPassword,
  setLoading,
  showBanner,
  wireVisibilityToggle,
} from "./validation.js";

function captureImplicitRecoveryToken() {
  const fragment = new URLSearchParams(String(window.location.hash || "").replace(/^#/, ""));
  const accessToken = String(fragment.get("access_token") || "");
  const refreshToken = String(fragment.get("refresh_token") || "");
  if (fragment.get("type") !== "recovery") return "";
  if (accessToken.length < 32 || accessToken.length > 8192) return "";
  if (refreshToken.length < 20 || refreshToken.length > 8192) return "";
  return accessToken;
}

// Capture the implicit recovery token before importing the Supabase client.
// Client initialisation consumes and removes the URL fragment.
let incomingRecoveryAccessToken = captureImplicitRecoveryToken();
const { supabase, supabaseConfigError } = await import("./supabaseClient.js");
const form = document.getElementById("reset-password-form");
const password = document.getElementById("password");
const confirmation = document.getElementById("password-confirm");
const banner = document.getElementById("form-banner");
const submitBtn = document.getElementById("submit-btn");

wireVisibilityToggle(document.getElementById("toggle-password"), password);
wireVisibilityToggle(document.getElementById("toggle-password-confirm"), confirmation);

document.getElementById("return-to-login").addEventListener("click", async (event) => {
  event.preventDefault();
  if (supabase) await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  window.location.replace("./login.html");
});

const validatePassword = bindField(
  password,
  document.getElementById("password-error"),
  (value) => isValidPassword(value) && value.length <= WISP_LIMITS.password
    ? ""
    : "Use 8–128 characters, including a letter and a number.",
);
const validateConfirmation = bindField(
  confirmation,
  document.getElementById("password-confirm-error"),
  (value) => value === password.value ? "" : "The passwords do not match.",
);

async function verifiedRecoverySession(accessToken) {
  if (!supabase || !accessToken) return null;

  let resolveRecoveryEvent;
  let recoveryEventSettled = false;
  const recoveryEvent = new Promise((resolve) => {
    resolveRecoveryEvent = resolve;
  });
  const settleRecoveryEvent = (session) => {
    if (recoveryEventSettled) return;
    recoveryEventSettled = true;
    resolveRecoveryEvent(session);
  };
  const { data: listenerData } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      settleRecoveryEvent(session?.access_token === accessToken ? session : null);
    }
  });
  const recoveryEventTimeout = window.setTimeout(() => settleRecoveryEvent(null), 10_000);

  try {
    // getSession waits for the implicit URL exchange to finish. Merely having a
    // normal signed-in session (even if somebody copies its tokens into a fake
    // fragment) is never enough: Supabase must emit PASSWORD_RECOVERY for the
    // exact access token captured from this incoming link.
    const { error: sessionError } = await supabase.auth.getSession();
    if (sessionError) return null;

    const session = await recoveryEvent;
    if (
      !session?.user
      || session.user.is_anonymous
      || session.access_token !== accessToken
    ) {
      return null;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (
      userError
      || !userData?.user
      || userData.user.is_anonymous
      || userData.user.id !== session.user.id
    ) {
      return null;
    }
    return session;
  } finally {
    window.clearTimeout(recoveryEventTimeout);
    listenerData?.subscription?.unsubscribe();
    incomingRecoveryAccessToken = "";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideBanner(banner);
  if (![validatePassword(), validateConfirmation()].every(Boolean)) return;
  setLoading(submitBtn, true, "Saving…", "Save new password");
  try {
    const { error } = await supabase.auth.updateUser({ password: password.value });
    if (error) throw error;
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    form.hidden = true;
    showBanner(banner, "Your password was changed. Return to log in with the new password.", "success");
  } catch (error) {
    console.error("Wisp password update failed.", error);
    showBanner(banner, "The password could not be changed. Request a new reset link and try again.", "error");
  } finally {
    setLoading(submitBtn, false, "Saving…", "Save new password");
  }
});

if (!supabase) {
  showBanner(banner, supabaseConfigError || "The account service is unavailable.", "error");
} else {
  const session = await verifiedRecoverySession(incomingRecoveryAccessToken);
  if (session?.user && !session.user.is_anonymous) {
    hideBanner(banner);
    form.hidden = false;
    password.focus();
  } else {
    // Supabase may already have persisted a recovery session while validating
    // the link. A rejected or timed-out flow must not leave that session able
    // to open a protected Wisp page in this tab.
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    showBanner(banner, "This reset link is invalid or expired. Return to log in and request a new one.", "error");
  }
}
