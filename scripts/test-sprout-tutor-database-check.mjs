import assert from "node:assert/strict";
import test from "node:test";
import {
  readDatabaseSettings,
  verifyTutorApprovalRpc
} from "./check-sprout-tutor-database.mjs";

const SETTINGS = [
  "KIDDOSPROUT_ACCOUNT_ORIGIN=https://families.kiddosprout.example",
  "SUPABASE_URL=https://kiddosprouttest.supabase.co",
  "SUPABASE_PUBLISHABLE_KEY=sb_publishable_12345678901234567890",
  "TURNSTILE_SITE_KEY=0x4AAAAAAAKiddoSproutProductionKey"
].join("\n");

function jsonResponse(payload, status = 200, headers = undefined) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

test("database settings accept only a managed URL and browser-safe key", () => {
  assert.deepEqual(readDatabaseSettings(SETTINGS), {
    url: "https://kiddosprouttest.supabase.co",
    key: "sb_publishable_12345678901234567890"
  });
  assert.throws(() => readDatabaseSettings(SETTINGS.replace(
    "https://kiddosprouttest.supabase.co",
    "http://127.0.0.1:54321"
  )), /managed project origin/i);
  assert.throws(() => readDatabaseSettings(SETTINGS.replace(
    "sb_publishable_12345678901234567890",
    "sb_secret_do-not-use"
  )), /browser-safe/i);
});

test("the first-deploy check proves the narrow RPC exists but is anonymous-denied", async () => {
  let captured = null;
  const result = await verifyTutorApprovalRpc(SETTINGS, async (input, init) => {
    captured = { url: new URL(input), init, headers: new Headers(init.headers) };
    return jsonResponse({
      code: "42501",
      message: "permission denied for function sprout_tutor_active_child_approval"
    }, 401);
  });

  assert.equal(result, true);
  assert.equal(captured.url.href,
    "https://kiddosprouttest.supabase.co/rest/v1/rpc/sprout_tutor_active_child_approval");
  assert.equal(captured.init.method, "POST");
  assert.equal(captured.init.body, JSON.stringify({ p_expected_child_id: "readiness-check" }));
  assert.equal(captured.init.redirect, "error");
  assert.equal(captured.headers.get("apikey"), "sb_publishable_12345678901234567890");
  assert.equal(captured.headers.has("Authorization"), false,
    "The migration probe must never need a parent token or privileged database key.");
});

test("the first-deploy check rejects a missing or accidentally public RPC", async () => {
  await assert.rejects(
    verifyTutorApprovalRpc(SETTINGS, async () => jsonResponse({
      code: "PGRST202",
      message: "function was not found"
    }, 404)),
    /missing or unavailable/i
  );
  await assert.rejects(
    verifyTutorApprovalRpc(SETTINGS, async () => jsonResponse([], 200)),
    /exposed to anonymous callers/i
  );
  await assert.rejects(
    verifyTutorApprovalRpc(SETTINGS, async () => jsonResponse({ code: "42501" }, 401, {
      "Content-Length": String(20 * 1024)
    })),
    /unexpectedly large/i
  );
});
