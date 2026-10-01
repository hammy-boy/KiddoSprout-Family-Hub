import {
  authEmailDeliveryReady,
  supabase,
  supabaseConfigError,
} from "./supabaseClient.js";
import { ensureWispProfile } from "./chatData.js";
import { WISP_LIMITS } from "./config.js";
import {
  captchaToken,
  mountHumanCheck,
  removeHumanCheck,
  resetHumanCheck,
} from "./humanCheckClient.js";
import {
  isValidEmail,
  bindField,
  showBanner,
  hideBanner,
  setLoading,
  wireVisibilityToggle,
} from "./validation.js";

const form = document.getElementById("login-form");
const emailInput = document.getElementById("identifier");
const passwordInput = document.getElementById("password");
const banner = document.getElementById("form-banner");
const submitBtn = document.getElementById("submit-btn");
const recoveryBtn = document.getElementById("forgot-password-link");
const checkContainer = document.getElementById("human-check");
const checkStatus = document.getElementById("human-check-status");
let humanCheck = null;

wireVisibilityToggle(document.getElementById("toggle-password"), passwordInput);

const validateEmail = bindField(
  emailInput,
  document.getElementById("identifier-error"),
  (value) => isValidEmail(value) && value.trim().length <= WISP_LIMITS.email
    ? ""
    : "Enter a valid email address.",
);
const validatePassword = bindField(
  passwordInput,
  document.getElementById("password-error"),
  (value) => value.length > 0 && value.length <= WISP_LIMITS.password
    ? ""
    : "Enter your password.",
);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideBanner(banner);
  if (!supabase) {
    showBanner(banner, supabaseConfigError || "The account service is unavailable.", "error");
    return;
  }
  if (![validateEmail(), validatePassword()].every(Boolean)) return;
  const token = captchaToken(humanCheck);
  if (!token) {
    showBanner(banner, "Complete the safety check before logging in.", "error");
    return;
  }

  setLoading(submitBtn, true, "Logging in…", "Log in");
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value,
      options: { captchaToken: token },
    });
    if (error || !data?.user || data.user.is_anonymous) throw error || new Error("Permanent account required.");
    await ensureWispProfile(data.user);
    window.location.replace("./home.html");
  } catch (error) {
    console.error("Wisp login failed.", error);
    if (/username|duplicate|unique/i.test(String(error?.message || ""))) {
      window.location.replace("./complete-profile.html");
      return;
    }
    showBanner(banner, "The email, password, or safety check was not accepted. Please try again.", "error");
  } finally {
    setLoading(submitBtn, false, "Logging in…", "Log in");
    resetHumanCheck(humanCheck);
  }
});

recoveryBtn.addEventListener("click", async (event) => {
  event.preventDefault();
  hideBanner(banner);
  if (!supabase) {
    showBanner(banner, supabaseConfigError || "The account service is unavailable.", "error");
    return;
  }
  if (!authEmailDeliveryReady) {
    showBanner(banner, "Password-reset email is unavailable until KiddoSprout email delivery is configured.", "error");
    return;
  }
  if (!validateEmail()) {
    showBanner(banner, "Enter your email above before requesting a password reset.", "error");
    return;
  }
  const token = captchaToken(humanCheck);
  if (!token) {
    showBanner(banner, "Complete the safety check before requesting a password reset.", "error");
    return;
  }

  recoveryBtn.setAttribute("aria-disabled", "true");
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(emailInput.value.trim(), {
      captchaToken: token,
      redirectTo: new URL("./reset-password.html", window.location.href).href,
    });
    if (error) throw error;
    showBanner(banner, "If that email has an account, a password-reset link is on its way.", "success");
  } catch (error) {
    console.error("Wisp password recovery request failed.", error);
    showBanner(banner, "The reset request could not be sent. Wait a moment and try again.", "error");
  } finally {
    recoveryBtn.removeAttribute("aria-disabled");
    resetHumanCheck(humanCheck);
  }
});

const configuredReason = new URLSearchParams(window.location.search).get("reason");
if (configuredReason) showBanner(banner, configuredReason.slice(0, 240), "error");

if (!supabase) {
  showBanner(banner, supabaseConfigError || "The account service is unavailable.", "error");
  submitBtn.disabled = true;
  recoveryBtn.setAttribute("aria-disabled", "true");
} else {
  humanCheck = await mountHumanCheck(checkContainer, checkStatus);
  if (!authEmailDeliveryReady) recoveryBtn.setAttribute("aria-disabled", "true");
}

window.addEventListener("pagehide", () => removeHumanCheck(humanCheck), { once: true });
