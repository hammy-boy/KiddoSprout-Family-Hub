import { initTheme, wireThemeToggle } from "./theme.js";
import { renderTabBar } from "./tabBar.js";
import { requireAuth } from "./authGuard.js";
import { requireSupabase } from "./supabaseClient.js";
import { getOwnProfile, updateOwnProfile } from "./chatData.js";

initTheme();
wireThemeToggle(document.getElementById("theme-toggle"));
renderTabBar("profile");

const editButton = document.getElementById("edit-profile-btn");
const dialog = document.getElementById("edit-profile-dialog");
const form = document.getElementById("edit-profile-form");
const cancelButton = document.getElementById("edit-profile-cancel");
const saveButton = document.getElementById("edit-profile-save");
const usernameInput = document.getElementById("profile-username-input");
const bioInput = document.getElementById("profile-bio-input");
const onlineToggle = document.getElementById("online-status-toggle");
const receiptsToggle = document.getElementById("read-receipts-toggle");
const dialogBanner = document.getElementById("profile-banner");
const pageBanner = document.getElementById("profile-page-banner");
const PRESENCE_FRESH_MS = 90_000;
const PROFILE_REFRESH_MS = 45_000;
let profile = null;
let dialogSnapshot = null;
let currentUserId = "";
let pageActive = true;
let pageVersion = 0;
let profileRefreshTimer = 0;
let profilePresenceTimer = 0;
let profileRefreshInFlight = null;

function isCurrentPage(version = pageVersion) {
  return pageActive && version === pageVersion;
}

function characterLength(value) {
  return [...String(value || "")].length;
}

function showBanner(element, message, type = "error") {
  element.textContent = message;
  element.className = `form-banner ${type} is-visible`;
}

function hideBanner(element) {
  element.textContent = "";
  element.className = "form-banner";
}

function isFreshOnline(nextProfile) {
  const seenAt = Date.parse(nextProfile?.last_seen || "");
  return nextProfile?.status === "online"
    && Number.isFinite(seenAt)
    && Date.now() - seenAt < PRESENCE_FRESH_MS;
}

function scheduleProfilePresenceExpiry() {
  window.clearTimeout(profilePresenceTimer);
  if (!pageActive || !isFreshOnline(profile)) return;
  const seenAt = Date.parse(profile.last_seen);
  const remaining = PRESENCE_FRESH_MS - (Date.now() - seenAt);
  profilePresenceTimer = window.setTimeout(() => {
    if (pageActive && profile) renderProfile(profile);
  }, Math.max(100, remaining + 100));
}

function renderProfile(nextProfile) {
  profile = nextProfile;
  const name = profile.username || "Your name";
  document.getElementById("profile-name").textContent = name;
  document.getElementById("profile-bio").textContent = profile.bio || "Add a short bio";
  document.getElementById("profile-avatar").textContent = name.slice(0, 2).toUpperCase();
  const status = isFreshOnline(profile) ? "Online" : "Offline";
  document.getElementById("profile-status").classList.toggle("is-offline", status !== "Online");
  document.getElementById("profile-status-text").textContent = status;
  onlineToggle.checked = profile.show_online_status;
  receiptsToggle.checked = profile.show_read_receipts;
  editButton.disabled = false;
  onlineToggle.disabled = false;
  receiptsToggle.disabled = false;
  scheduleProfilePresenceExpiry();
}

function friendlyProfileError(error) {
  if (error?.code === "23505") return "That username is already in use. Try another one.";
  return "Wisp couldn't save those changes. Please try again.";
}

document.getElementById("logout-btn")?.addEventListener("click", async () => {
  await requireSupabase().auth.signOut({ scope: "local" });
  window.location.replace("./index.html");
});

editButton.addEventListener("click", async () => {
  if (!profile) return;
  const version = pageVersion;
  editButton.disabled = true;
  try {
    // Refresh immediately before editing so an older tab does not overwrite a
    // newer username or bio from another device.
    const latest = await getOwnProfile();
    if (!isCurrentPage(version)) return;
    renderProfile(latest);
    dialogSnapshot = {
      username: profile.username || "",
      bio: profile.bio || "",
    };
    usernameInput.value = dialogSnapshot.username;
    bioInput.value = dialogSnapshot.bio;
    bioInput.setCustomValidity("");
    saveButton.disabled = false;
    cancelButton.disabled = false;
    form.removeAttribute("aria-busy");
    hideBanner(dialogBanner);
    dialog.showModal();
    usernameInput.focus();
  } catch (error) {
    if (!isCurrentPage(version)) return;
    showBanner(pageBanner, "Wisp couldn't refresh your profile. Please try again.");
    console.error("Wisp profile refresh failed.", error);
  } finally {
    if (isCurrentPage(version)) editButton.disabled = !profile;
  }
});

cancelButton.addEventListener("click", () => dialog.close("cancel"));
dialog.addEventListener("cancel", (event) => {
  if (form.getAttribute("aria-busy") === "true") event.preventDefault();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const version = pageVersion;
  const bio = bioInput.value.trim();
  bioInput.setCustomValidity(characterLength(bio) > 280 ? "Bio must be 280 characters or fewer." : "");
  if (!form.reportValidity() || saveButton.disabled) return;
  saveButton.disabled = true;
  cancelButton.disabled = true;
  form.setAttribute("aria-busy", "true");
  hideBanner(dialogBanner);
  try {
    const username = usernameInput.value.trim();
    const changes = {};
    if (!dialogSnapshot || username !== dialogSnapshot.username) changes.username = username;
    if (!dialogSnapshot || bio !== dialogSnapshot.bio) changes.bio = bio;
    if (!Object.keys(changes).length) {
      dialog.close("unchanged");
      return;
    }
    const updated = await updateOwnProfile(changes);
    if (!isCurrentPage(version)) return;
    renderProfile(updated);
    dialogSnapshot = null;
    dialog.close("saved");
    showBanner(pageBanner, "Profile saved.", "success");
  } catch (error) {
    if (!isCurrentPage(version)) return;
    showBanner(dialogBanner, friendlyProfileError(error));
    console.error("Wisp profile update failed.", error);
  } finally {
    if (!isCurrentPage(version)) return;
    saveButton.disabled = false;
    cancelButton.disabled = false;
    form.removeAttribute("aria-busy");
  }
});

bioInput.addEventListener("input", () => {
  bioInput.setCustomValidity(characterLength(bioInput.value.trim()) > 280
    ? "Bio must be 280 characters or fewer."
    : "");
});

async function savePrivacyPreference(toggle, key, previousValue) {
  const version = pageVersion;
  editButton.disabled = true;
  onlineToggle.disabled = true;
  receiptsToggle.disabled = true;
  hideBanner(pageBanner);
  try {
    const updated = await updateOwnProfile({ [key]: toggle.checked });
    if (!isCurrentPage(version)) return;
    renderProfile(updated);
    showBanner(pageBanner, "Privacy setting saved.", "success");
  } catch (error) {
    if (!isCurrentPage(version)) return;
    toggle.checked = previousValue;
    showBanner(pageBanner, "Wisp couldn't save that privacy setting. Please try again.");
    console.error("Wisp privacy update failed.", error);
  } finally {
    if (!isCurrentPage(version)) return;
    editButton.disabled = !profile;
    onlineToggle.disabled = false;
    receiptsToggle.disabled = false;
  }
}

onlineToggle.addEventListener("change", () => {
  const previousValue = profile?.show_online_status ?? !onlineToggle.checked;
  void savePrivacyPreference(onlineToggle, "showOnlineStatus", previousValue);
});

receiptsToggle.addEventListener("change", () => {
  const previousValue = profile?.show_read_receipts ?? !receiptsToggle.checked;
  void savePrivacyPreference(receiptsToggle, "showReadReceipts", previousValue);
});

editButton.disabled = true;
onlineToggle.disabled = true;
receiptsToggle.disabled = true;

async function loadProfile() {
  const version = pageVersion;
  try {
    const user = await requireAuth(currentUserId);
    if (!isCurrentPage(version)) return;
    currentUserId ||= user.id;
    const latest = await getOwnProfile();
    if (!isCurrentPage(version)) return;
    renderProfile(latest);
    startProfileRefresh();
  } catch (error) {
    if (!isCurrentPage(version)) return;
    console.error("Wisp profile failed to load.", error);
    document.getElementById("profile-name").textContent = "Profile unavailable";
    document.getElementById("profile-bio").textContent = "Log out and sign in again to finish setting up Wisp.";
    showBanner(pageBanner, "Wisp couldn't load your profile. Check your connection and try again.");
  }
}

async function refreshProfile() {
  if (!pageActive || document.visibilityState !== "visible" || profileRefreshInFlight) return profileRefreshInFlight;
  const version = pageVersion;
  profileRefreshInFlight = getOwnProfile().then((latest) => {
    if (isCurrentPage(version)) renderProfile(latest);
  }).catch((error) => {
    if (isCurrentPage(version)) console.warn("Wisp could not refresh profile presence.", error);
  }).finally(() => {
    profileRefreshInFlight = null;
  });
  return profileRefreshInFlight;
}

function startProfileRefresh() {
  window.clearInterval(profileRefreshTimer);
  profileRefreshTimer = window.setInterval(() => { void refreshProfile(); }, PROFILE_REFRESH_MS);
}

document.addEventListener("visibilitychange", () => {
  if (pageActive && document.visibilityState === "visible") void refreshProfile();
});

window.addEventListener("pagehide", () => {
  pageActive = false;
  pageVersion += 1;
  window.clearInterval(profileRefreshTimer);
  window.clearTimeout(profilePresenceTimer);
  profileRefreshTimer = 0;
  if (dialog.open) dialog.close("suspended");
  form.removeAttribute("aria-busy");
  saveButton.disabled = false;
  cancelButton.disabled = false;
});
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  pageActive = true;
  pageVersion += 1;
  void loadProfile();
});

void loadProfile();
