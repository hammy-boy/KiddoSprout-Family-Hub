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
  isValidPassword,
  bindField,
  showBanner,
  hideBanner,
  setLoading,
  wireVisibilityToggle,
} from "./validation.js";

const form = document.getElementById("signup-form");
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("identifier");
const passwordInput = document.getElementById("password");
const banner = document.getElementById("form-banner");
const submitBtn = document.getElementById("submit-btn");
const checkContainer = document.getElementById("human-check");
const checkStatus = document.getElementById("human-check-status");
let humanCheck = null;

wireVisibilityToggle(document.getElementById("toggle-password"), passwordInput);

const validateUsername = bindField(
  usernameInput,
  document.getElementById("username-error"),
  (value) => /^[A-Za-z0-9][A-Za-z0-9_.-]{2,31}$/.test(value.trim())
    ? ""
    : "Use 3–32 letters, numbers, dots, underscores, or hyphens, starting with a letter or number.",
);
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
  (value) => isValidPassword(value) && value.length <= WISP_LIMITS.password
    ? ""
    : "Use 8–128 characters, including a letter and a number.",
);

function friendlySignupError(error) {
  const message = String(error?.message || "");
  if (/already registered|already exists/i.test(message)) {
    return "An account may already use that email. Try logging in instead.";
  }
  if (/username/i.test(message) && /duplicate|unique|already/i.test(message)) {
    return "That username is already taken. Choose another and try again.";
  }
  if (/captcha|turnstile/i.test(message)) return "The safety check was not accepted. Please try it again.";
  return "Your account could not be created. Check the details and try again.";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideBanner(banner);
  if (!supabase) {
    showBanner(banner, supabaseConfigError || "The account service is unavailable.", "error");
    return;
  }
  if (!authEmailDeliveryReady) {
    showBanner(banner, "New accounts are unavailable until KiddoSprout email delivery is configured.", "error");
    return;
  }
  if (![validateUsername(), validateEmail(), validatePassword()].every(Boolean)) return;
  const token = captchaToken(humanCheck);
  if (!token) {
    showBanner(banner, "Complete the safety check before creating an account.", "error");
    return;
  }

  setLoading(submitBtn, true, "Creating your account…", "Create account");
  let sessionEstablished = false;
  try {
    const username = usernameInput.value.trim();
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user && !sessionData.session.user.is_anonymous) {
      sessionEstablished = true;
      await ensureWispProfile(sessionData.session.user, username);
      window.location.replace("./home.html");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: emailInput.value.trim(),
      password: passwordInput.value,
      options: {
        captchaToken: token,
        data: { username },
        emailRedirectTo: new URL("./complete-profile.html", window.location.href).href,
      },
    });
    if (error) throw error;
    if (data.session && data.user) {
      sessionEstablished = true;
      await ensureWispProfile(data.user, username);
      window.location.replace("./home.html");
      return;
    }

    showBanner(banner, "Account created. Open the confirmation link sent to your email, then log in.", "success");
    form.reset();
  } catch (error) {
    console.error("Wisp signup failed.", error);
    if (sessionEstablished && /username|duplicate|unique/i.test(String(error?.message || ""))) {
      window.location.replace("./complete-profile.html");
      return;
    }
    if (sessionEstablished) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    }
    showBanner(banner, friendlySignupError(error), "error");
  } finally {
    setLoading(submitBtn, false, "Creating your account…", "Create account");
    resetHumanCheck(humanCheck);
  }
});

if (!supabase || !authEmailDeliveryReady) {
  showBanner(
    banner,
    supabaseConfigError || "New accounts are unavailable until KiddoSprout email delivery is configured.",
    "error",
  );
  submitBtn.disabled = true;
} else {
  humanCheck = await mountHumanCheck(checkContainer, checkStatus);
}

window.addEventListener("pagehide", (event) => {
  if (!event.persisted) removeHumanCheck(humanCheck);
});
