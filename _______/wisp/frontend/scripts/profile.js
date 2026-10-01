import { initTheme, wireThemeToggle } from "./theme.js";
import { renderTabBar } from "./tabBar.js";
import { requireAuth } from "./authGuard.js";
import { requireSupabase } from "./supabaseClient.js";
import { getProfile } from "./chatData.js";

initTheme();
wireThemeToggle(document.getElementById("theme-toggle"));
renderTabBar("profile");

document.getElementById("logout-btn")?.addEventListener("click", async () => {
  await requireSupabase().auth.signOut({ scope: "local" });
  window.location.replace("./index.html");
});

const user = await requireAuth();
try {
  const profile = await getProfile(user.id);
  const name = profile.username || "Your name";
  document.getElementById("profile-name").textContent = name;
  document.getElementById("profile-bio").textContent = profile.bio || "Add a short bio";
  document.getElementById("profile-avatar").textContent = name.slice(0, 2).toUpperCase();
} catch (error) {
  console.error("Wisp profile failed to load.", error);
  document.getElementById("profile-name").textContent = "Profile unavailable";
  document.getElementById("profile-bio").textContent = "Log out and sign in again to finish setting up Wisp.";
}
