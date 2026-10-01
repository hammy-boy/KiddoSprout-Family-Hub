import { supabase, supabaseConfigError } from "./supabaseClient.js";

/**
 * Call at the top of any protected page. Resolves with the user if
 * logged in; otherwise redirects to login and never resolves (the
 * navigation interrupts execution).
 */
export async function requireAuth() {
  if (!supabase) {
    const reason = encodeURIComponent(supabaseConfigError || "The account service is unavailable.");
    window.location.replace(`./login.html?reason=${reason}`);
    return new Promise(() => {});
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user || data.user.is_anonymous) {
    if (data?.user?.is_anonymous) await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    window.location.replace("./login.html");
    return new Promise(() => {}); // halt further script execution on this page
  }
  return data.user;
}
