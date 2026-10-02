import { WISP_RPCS, isUuid } from "./config.js";
import { requireSupabase } from "./supabaseClient.js";

const HEARTBEAT_MS = 45_000;
let activeUserId = "";
let heartbeatId = 0;
let lifecycleWired = false;

async function writePresence(status) {
  if (!isUuid(activeUserId) || !["online", "offline"].includes(status)) return;
  const client = requireSupabase();
  const { error } = await client.rpc(WISP_RPCS.setPresence, {
    p_status: status,
    p_expected_user_id: activeUserId,
  });
  if (error) throw error;
}

function refreshPresence() {
  if (document.visibilityState !== "visible" || !navigator.onLine) return;
  void writePresence("online").catch((error) => {
    console.warn("Wisp presence heartbeat paused.", error);
  });
}

function startHeartbeat() {
  window.clearInterval(heartbeatId);
  heartbeatId = window.setInterval(refreshPresence, HEARTBEAT_MS);
}

function wireLifecycle() {
  if (lifecycleWired) return;
  lifecycleWired = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshPresence();
  });
  window.addEventListener("online", refreshPresence);
  window.addEventListener("pagehide", () => {
    window.clearInterval(heartbeatId);
    heartbeatId = 0;
  });
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted || !isUuid(activeUserId)) return;
    startHeartbeat();
    // The expected-user argument on the RPC makes this restored heartbeat
    // fail closed if another account replaced the cached page's owner.
    refreshPresence();
  });
}

/**
 * Keep the signed-in profile's presence fresh while this Wisp page is visible.
 * Peers also apply a freshness window, so a crashed or disconnected tab cannot
 * leave somebody shown online forever.
 */
export async function startPresence(user) {
  if (!isUuid(user?.id) || user.is_anonymous) return;
  wireLifecycle();
  if (activeUserId === user.id && heartbeatId) return;
  activeUserId = user.id;
  if (document.visibilityState === "visible" && navigator.onLine) {
    await writePresence("online").catch((error) => {
      console.warn("Wisp could not publish initial presence.", error);
    });
  }

  startHeartbeat();
}
