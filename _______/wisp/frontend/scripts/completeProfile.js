import { requireAuth } from "./authGuard.js";
import { ensureWispProfile, getProfile } from "./chatData.js";
import { requireSupabase } from "./supabaseClient.js";
import { bindField, hideBanner, setLoading, showBanner } from "./validation.js";

const form = document.getElementById("profile-form");
const username = document.getElementById("username");
const banner = document.getElementById("form-banner");
const submitBtn = document.getElementById("submit-btn");
const validateUsername = bindField(
  username,
  document.getElementById("username-error"),
  (value) => /^[A-Za-z0-9][A-Za-z0-9_.-]{2,31}$/.test(value.trim())
    ? ""
    : "Use 3–32 letters, numbers, dots, underscores, or hyphens, starting with a letter or number.",
);

const user = await requireAuth();
try {
  await getProfile(user.id);
  window.location.replace("./home.html");
} catch (error) {
  if (String(error?.code || "") !== "PGRST116") {
    console.info("Wisp profile enrollment is required.");
  }
}

const suggested = String(user.user_metadata?.username || "").trim();
if (/^[A-Za-z0-9][A-Za-z0-9_.-]{2,31}$/.test(suggested)) username.value = suggested;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideBanner(banner);
  if (!validateUsername()) return;
  setLoading(submitBtn, true, "Saving…", "Continue to Wisp");
  try {
    await ensureWispProfile(user, username.value.trim());
    window.location.replace("./home.html");
  } catch (error) {
    console.error("Wisp profile enrollment failed.", error);
    const message = /duplicate|unique|already/i.test(String(error?.message || ""))
      ? "That username is already taken. Choose another."
      : "Your Wisp profile could not be saved. Check your connection and try again.";
    showBanner(banner, message, "error");
  } finally {
    setLoading(submitBtn, false, "Saving…", "Continue to Wisp");
  }
});

document.getElementById("cancel-link").addEventListener("click", async (event) => {
  event.preventDefault();
  await requireSupabase().auth.signOut({ scope: "local" }).catch(() => {});
  window.location.assign("./login.html");
});
