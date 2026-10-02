import { supabase, supabaseConfigError } from "./supabaseClient.js";
import { startPresence } from "./presence.js";

let expectedUserId = "";
let lifecycleInstalled = false;
let authEpoch = 0;

function pauseProtectedPage() {
  document.documentElement.classList.add("wisp-auth-paused");
}

function resumeProtectedPage() {
  document.documentElement.classList.remove("wisp-auth-paused");
}

function redirectToLogin() {
  authEpoch += 1;
  pauseProtectedPage();
  window.location.replace("./login.html");
}

function watchProtectedSession() {
  if (!supabase || lifecycleInstalled) return;
  lifecycleInstalled = true;

  supabase.auth.onAuthStateChange((event, session) => {
    const nextUser = session?.user;
    if (event === "SIGNED_OUT"
        || (expectedUserId && nextUser?.id && nextUser.id !== expectedUserId)) {
      redirectToLogin();
    }
  });

  window.addEventListener("pagehide", () => {
    // This class is kept in the back/forward cache, preventing a restored tab
    // from flashing another account's private data before revalidation.
    authEpoch += 1;
    pauseProtectedPage();
  });
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    const restoreEpoch = authEpoch;
    void supabase.auth.getUser().then(({ data: restored, error }) => {
      if (restoreEpoch !== authEpoch) return;
      const user = restored?.user;
      if (error || !user || user.is_anonymous || (expectedUserId && user.id !== expectedUserId)) {
        redirectToLogin();
        return;
      }
      resumeProtectedPage();
    }).catch(() => {
      if (restoreEpoch === authEpoch) redirectToLogin();
    });
  });
}

/**
 * Call at the top of any protected page. Resolves with the user if
 * logged in; otherwise redirects to login and never resolves (the
 * navigation interrupts execution).
 */
export async function requireAuth(requiredUserId = "") {
  if (!supabase) {
    const reason = encodeURIComponent(supabaseConfigError || "The account service is unavailable.");
    window.location.replace(`./login.html?reason=${reason}`);
    return new Promise(() => {});
  }
  watchProtectedSession();
  const requestEpoch = authEpoch;
  const { data, error } = await supabase.auth.getUser();
  if (requestEpoch !== authEpoch) return new Promise(() => {});
  if (error
      || !data?.user
      || data.user.is_anonymous
      || (requiredUserId && data.user.id !== requiredUserId)) {
    if (data?.user?.is_anonymous) await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    redirectToLogin();
    return new Promise(() => {}); // halt further script execution on this page
  }
  expectedUserId ||= data.user.id;
  if (data.user.id !== expectedUserId) {
    redirectToLogin();
    return new Promise(() => {});
  }
  resumeProtectedPage();
  // Presence is helpful but non-essential. A slow presence request must never
  // keep a protected page from rendering.
  void startPresence(data.user).catch((presenceError) => {
    console.warn("Wisp presence could not start.", presenceError);
  });
  return data.user;
}
