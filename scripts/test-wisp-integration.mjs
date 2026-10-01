import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const WISP = new URL("_______/wisp/", ROOT);
const FRONTEND = new URL("frontend/", WISP);
const SCRIPTS = new URL("scripts/", FRONTEND);
const PAGES = new URL("pages/", FRONTEND);
const MIGRATION = new URL(
  "supabase/migrations/20261001135110_create_secure_wisp_messaging.sql",
  ROOT
);

async function source(url) {
  try {
    return await readFile(url, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
}

async function sourcesIn(directory, extension) {
  const names = await readdir(directory).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  return Promise.all(
    names
      .filter((name) => name.endsWith(extension))
      .sort()
      .map(async (name) => ({ name, text: await source(new URL(name, directory)) }))
  );
}

function assertPresent(text, path) {
  assert.ok(text.trim(), `${path} must exist and must not be empty.`);
}

function policyStatements(sql, operation) {
  const escaped = operation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const operationPattern = new RegExp(`\\bfor\\s+${escaped}\\b`, "i");
  return sql
    .split(";")
    .filter((statement) => /\bcreate\s+policy\b/i.test(statement) && operationPattern.test(statement))
    .map((statement) => `${statement};`);
}

const [
  scriptFiles,
  pageFiles,
  migration,
  bundledClient,
  bundleBuilder,
  packageManifest,
  packageLock,
  installSchema,
  importReadme,
  wispReadme,
  integrationGuide,
  dockerfile,
  nginxConfig
] = await Promise.all([
  sourcesIn(SCRIPTS, ".js"),
  sourcesIn(PAGES, ".html"),
  source(MIGRATION),
  source(new URL("frontend/vendor/supabase-js-2.116.0.js", WISP)),
  source(new URL("scripts/build-wisp-client.mjs", ROOT)),
  source(new URL("package.json", ROOT)),
  source(new URL("package-lock.json", ROOT)),
  source(new URL("database/schema.sql", WISP)),
  source(new URL("_______/README.md", ROOT)),
  source(new URL("README.md", WISP)),
  source(new URL("INTEGRATION.md", WISP)),
  source(new URL("Dockerfile", ROOT)),
  source(new URL("nginx.default.conf", ROOT))
]);

const scripts = Object.fromEntries(scriptFiles.map(({ name, text }) => [name, text]));
const pages = Object.fromEntries(pageFiles.map(({ name, text }) => [name, text]));
const allBrowserSource = [...scriptFiles, ...pageFiles]
  .map(({ name, text }) => `\n/* ${name} */\n${text}`)
  .join("\n");

test("KiddoSprout serves Wisp and every relative page asset exists", async () => {
  assert.match(
    dockerfile,
    /COPY\s+_______\/wisp\/frontend\/\s+\/usr\/share\/nginx\/html\/wisp\//,
    "The production image must copy only the reviewed Wisp browser frontend."
  );
  assert.match(nginxConfig, /location\s*=\s*\/wisp\s*\{[\s\S]*?\/wisp\/pages\/index\.html/);
  assert.match(nginxConfig, /location\s*=\s*\/wisp\/\s*\{[\s\S]*?\/wisp\/pages\/index\.html/);

  for (const { name, text } of pageFiles) {
    const pageUrl = new URL(name, PAGES);
    const references = [...text.matchAll(/(?:src|href)=["']((?:\.\.?\/)[^"'?#]+)(?:[?#][^"']*)?["']/g)]
      .map((match) => match[1]);
    for (const reference of references) {
      assertPresent(
        await source(new URL(reference, pageUrl)),
        `${name} relative asset ${reference}`
      );
    }
  }
});

test("Wisp consumes KiddoSprout's browser-safe runtime configuration", () => {
  assertPresent(scripts["config.js"] || "", "Wisp config.js");
  assertPresent(scripts["supabaseClient.js"] || "", "Wisp supabaseClient.js");

  const configSource = `${scripts["config.js"] || ""}\n${scripts["supabaseClient.js"] || ""}`;
  assert.match(
    configSource,
    /KIDDO_SPROUT_SUPABASE/,
    "Wisp must use the deployment-generated KiddoSprout runtime config instead of a second hard-coded project config."
  );
  assert.doesNotMatch(
    allBrowserSource,
    /YOUR[-_ ]PROJECT[-_ ]REF|YOUR[-_ ]ANON[-_ ]PUBLIC[-_ ]KEY|YOUR[-_ ]SUPABASE/i,
    "No deployable Wisp file may retain Supabase placeholders."
  );
  assert.doesNotMatch(
    allBrowserSource,
    /(?:from\s*|import\s*\()\s*["'`]https?:\/\/(?:esm\.sh|unpkg\.com|cdn\.jsdelivr\.net)/i,
    "Browser modules must not execute an unpinned third-party CDN dependency."
  );
  assert.doesNotMatch(
    allBrowserSource,
    /["'`]sb_secret_[A-Za-z0-9_-]+["'`]|["'`]eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+["'`]/,
    "Wisp browser files must not contain a Supabase secret/service key or JWT."
  );
  assert.doesNotMatch(
    allBrowserSource,
    /(?:service[_-]?role|smtp[_-]?(?:pass|password)|resend[_-]?api[_-]?key)\s*[:=]/i,
    "Server-only credentials must never be assigned in Wisp browser code."
  );
  assertPresent(bundledClient, "the pinned local Supabase browser client");
  assert.match(
    scripts["supabaseClient.js"] || "",
    /from\s+["']\.\.\/vendor\/supabase-js-2\.116\.0\.js["']/,
    "The client must import the reviewed local Supabase 2.116.0 bundle."
  );
  assert.match(bundledClient, /@supabase\/supabase-js 2\.116\.0/);
  assert.match(bundleBuilder, /sourcemap\s*:\s*false/,
    "The browser build must not publish a source map beside the bundled dependency.");
  assert.equal(JSON.parse(packageManifest).dependencies?.["@supabase/supabase-js"], "2.116.0");
  assert.equal(JSON.parse(packageLock).packages?.[""]?.dependencies?.["@supabase/supabase-js"], "2.116.0");
  assert.match(configSource, /publicDemoOnly\s*===\s*true/,
    "The public demo must fail closed instead of receiving a live client.");
  assert.match(configSource, /sb_publishable_/,
    "The runtime validator must accept modern browser-safe publishable keys.");
  assert.match(configSource, /role\s*===\s*["']anon["']/,
    "Legacy keys are acceptable only when the JWT role is anon.");
  assert.ok(configSource.includes("\\.supabase\\.co"),
    "The runtime validator must restrict managed endpoints to Supabase hosts.");
  assert.match(configSource, /storage\s*:\s*sessionStore/,
    "Wisp sessions must stay in the current browser tab instead of persistent localStorage.");
  assert.match(configSource, /flowType\s*:\s*["']implicit["']/,
    "A static Wisp deployment needs a fresh-tab-compatible confirmation/recovery flow.");

  for (const [name, markup] of Object.entries(pages)) {
    if (!/supabaseClient\.js|authGuard\.js|signup\.js|login\.js|chatData\.js|webrtc\.js/.test(markup)) continue;
    assert.match(
      markup,
      /supabase-config\.js/i,
      `${name} must load the shared runtime Supabase configuration.`
    );
  }
});

test("Wisp account creation and login are email-only and carry a CAPTCHA token", () => {
  const signupPage = pages["signup.html"] || "";
  const signup = scripts["signup.js"] || "";
  const loginPage = pages["login.html"] || "";
  const login = scripts["login.js"] || "";

  assertPresent(signupPage, "Wisp signup.html");
  assertPresent(signup, "Wisp signup.js");
  assertPresent(loginPage, "Wisp login.html");
  assertPresent(login, "Wisp login.js");

  assert.match(signupPage, /type=["']email["']/i);
  assert.match(signup, /\.auth\.signUp\s*\(/,
    "Sign-up must use Supabase Auth rather than a local-only account.");
  assert.match(signup, /\bemail\s*:/,
    "Sign-up must send an email address to Supabase Auth.");
  assert.match(signup, /captchaToken/,
    "Sign-up must pass the completed human-check token to Supabase Auth.");
  assert.match(signup, /KiddoSproutHumanCheck|human[-_ ]?check/i,
    "Sign-up must obtain its CAPTCHA through the shared human-check controller.");
  assert.match(scripts["supabaseClient.js"] || "", /authEmailDeliveryReady/,
    "Wisp must consume KiddoSprout's browser-safe email-readiness flag.");
  assert.match(signup, /!authEmailDeliveryReady[\s\S]*?\.auth\.signUp\s*\(/,
    "Sign-up must stay disabled until hosted transactional email is verified ready.");

  assert.match(loginPage, /type=["']email["']/i);
  assert.match(login, /\.auth\.signInWithPassword\s*\(/,
    "Login must use Supabase email/password auth.");
  assert.match(login, /captchaToken/,
    "Login must pass the completed human-check token to Supabase Auth.");
  assert.match(login, /!authEmailDeliveryReady[\s\S]*?resetPasswordForEmail\s*\(/,
    "Password recovery must stay disabled until hosted transactional email is verified ready.");

  assert.doesNotMatch(signupPage, /type=["']tel["']|method-phone|phone number/i);
  assert.doesNotMatch(loginPage, /type=["']tel["']|method-phone|phone number/i);
  assert.doesNotMatch(`${signup}\n${login}`, /\bphone\s*:|signInWithOtp\s*\(/,
    "Wisp must not offer the unavailable phone-auth path.");
});

test("Password recovery has a dedicated, verified update handler", () => {
  const login = scripts["login.js"] || "";
  const resetPage = pages["reset-password.html"] || "";
  const resetScript = scripts["resetPassword.js"] || scripts["reset-password.js"] || "";

  assert.match(login, /\.auth\.resetPasswordForEmail\s*\(/,
    "The initial recovery form must request a Supabase recovery email.");
  assert.match(login, /redirectTo\s*:/,
    "The recovery email must return to Wisp's dedicated reset page.");
  assert.match(login, /reset-password\.html/i);

  assertPresent(resetPage, "Wisp reset-password.html");
  assertPresent(resetScript, "Wisp reset-password.js/resetPassword.js");
  assert.match(resetPage, /new password/i);
  assert.match(resetPage, /confirm/i);
  assert.match(resetPage, /<form[^>]*id=["']reset-password-form["'][^>]*\bhidden\b/i,
    "The new-password form must start hidden until the recovery proof is verified.");
  assert.match(resetScript, /PASSWORD_RECOVERY/,
    "The password form must require Supabase's verified PASSWORD_RECOVERY event.");
  assert.match(resetScript, /\.auth\.updateUser\s*\(\s*\{[\s\S]*?password\s*:/,
    "The verified recovery handler must update the password through Supabase Auth.");
  assert.match(resetScript, /confirm/i,
    "The recovery handler must compare the new password and confirmation before updating.");

  const captureIndex = resetScript.indexOf(
    "let incomingRecoveryAccessToken = captureImplicitRecoveryToken();"
  );
  const clientImportIndex = resetScript.indexOf('await import("./supabaseClient.js")');
  const configIndex = resetPage.indexOf("/supabase-config.js");
  const controllerIndex = resetPage.indexOf("resetPassword.js");
  assert.ok(captureIndex >= 0 && clientImportIndex > captureIndex,
    "The implicit recovery token must be captured before Supabase consumes the URL fragment.");
  assert.ok(configIndex >= 0 && controllerIndex > configIndex,
    "The reset page must load runtime configuration before its reset controller.");

  assert.match(resetScript, /window\.location\.hash/,
    "A static implicit-flow reset must take its proof from the incoming URL fragment.");
  assert.match(resetScript, /fragment\.get\(["']type["']\)\s*!==\s*["']recovery["']/,
    "Only an incoming recovery link may supply reset proof.");
  assert.match(resetScript, /fragment\.get\(["']access_token["']\)/);
  assert.match(resetScript, /fragment\.get\(["']refresh_token["']\)/);
  assert.match(
    resetScript,
    /event\s*===\s*["']PASSWORD_RECOVERY["'][\s\S]{0,180}?session\?\.access_token\s*===\s*accessToken/,
    "The PASSWORD_RECOVERY event must match the exact token captured from this link."
  );
  assert.match(resetScript, /const\s+session\s*=\s*await\s+recoveryEvent\s*;/,
    "The reset form must wait for Supabase's recovery event before it opens.");
  assert.doesNotMatch(resetScript, /recoveryEvent(?:Session)?\s*\|\||\|\|\s*sessionData\?\.session/,
    "Never fall back from missing recovery proof to a normal stored session.");
  assert.match(resetScript, /setTimeout\([\s\S]{0,160}?settleRecoveryEvent\(null\)[\s\S]{0,80}?10_000/,
    "Recovery-event verification must stop waiting if an invalid link produces no event.");
  assert.match(resetScript, /\.auth\.getUser\s*\(\s*accessToken\s*\)/,
    "Auth must verify the captured recovery token server-side before revealing the form.");
  assert.match(resetScript, /userData\.user\.id\s*!==\s*session\.user\.id/,
    "The verified token user and recovery-event user must match.");
  assert.match(resetScript, /incomingRecoveryAccessToken\s*=\s*["']["']\s*;/,
    "The captured recovery proof must be discarded after validation.");
  assert.doesNotMatch(
    `${resetPage}\n${resetScript}`,
    /wisp-password-recovery-started|RECOVERY_MARKER|recoveryMarkerIsFresh/,
    "A forgeable browser marker must never unlock password reset."
  );

  assert.doesNotMatch(
    pages["login.html"] || "",
    /id=["'](?:new-password|confirm-password)["']/i,
    "New-password fields must not be stacked into the initial login/recovery request form."
  );
});

test("Every Wisp database call uses a Wisp namespace and atomic RPCs", () => {
  const deprecatedBareNames = [
    "profiles",
    "contacts",
    "blocks",
    "chats",
    "chat_members",
    "messages",
    "message_receipts",
    "calls",
    "call_participants",
    "notifications"
  ];

  for (const name of deprecatedBareNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.doesNotMatch(
      allBrowserSource,
      new RegExp(`\\.from\\(\\s*["']${escaped}["']\\s*\\)`),
      `The shared KiddoSprout database must not receive the generic table name ${name}.`
    );
  }

  for (const table of [
    "wisp_profiles",
    "wisp_contacts",
    "wisp_chat_members",
    "wisp_messages",
    "wisp_calls"
  ]) {
    assert.match(allBrowserSource, new RegExp(`\\b${table}\\b`),
      `Wisp browser code must use ${table}.`);
  }

  for (const rpc of [
    "wisp_enroll_profile",
    "wisp_get_or_create_direct_chat",
    "wisp_start_call",
    "wisp_join_call",
    "wisp_end_call"
  ]) {
    assert.match(allBrowserSource, new RegExp(`\\b${rpc}\\b`),
      `Wisp must call the hardened ${rpc} RPC.`);
  }
  assert.match(scripts["config.js"] || "", /username\s*:\s*32\b/,
    "The browser username limit must match the database's 32-character constraint.");
  assert.match(scripts["config.js"] || "", /message\s*:\s*(?:[1-3]?\d{1,3}|4000)\b/,
    "The browser message limit must not exceed the database's 4,000-character constraint.");
});

test("WebRTC signaling uses an authenticated private Realtime channel", () => {
  const client = scripts["supabaseClient.js"] || "";
  const webrtc = scripts["webrtc.js"] || "";
  assertPresent(webrtc, "Wisp webrtc.js");

  assert.match(webrtc, /wisp-call:/,
    "Call topics must use the policy-scoped wisp-call:<chat-id> namespace.");
  assert.match(webrtc, /private\s*:\s*true/,
    "Call signaling must never use a public Broadcast channel.");
  assert.match(`${client}\n${webrtc}`, /await\s+[^;\n]*realtime\.setAuth\s*\(/,
    "The current user token must finish applying before subscribing to a private channel.");
  assert.match(webrtc, /\.on\(\s*["']broadcast["']/,
    "WebRTC signaling must subscribe to Supabase Broadcast events.");
  assert.doesNotMatch(webrtc, /\.channel\(\s*`call:/,
    "The former public call:<chat-id> topic must not be used.");
});

test("Untrusted profile and message data only reaches safe text rendering sinks", () => {
  const userDataRenderers = ["chat.js", "contacts.js", "home.js", "calls.js", "profile.js"]
    .map((name) => `\n/* ${name} */\n${scripts[name] || ""}`)
    .join("\n");
  assert.doesNotMatch(
    userDataRenderers,
    /\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML\s*\(|document\.write\s*\(|\beval\s*\(|\bnew\s+Function\s*\(/,
    "Scripts that render server-derived data must not interpret strings as HTML or executable code."
  );
  assert.match(scripts["chat.js"] || "", /textContent\s*=/,
    "Chat messages must render through textContent.");
  assert.match(scripts["contacts.js"] || scripts["home.js"] || "", /textContent\s*=/,
    "Profile/contact data must render through textContent.");

  for (const [name, markup] of Object.entries(pages)) {
    assert.doesNotMatch(markup, /<[^>]+\son[a-z]+\s*=/i,
      `${name} must not use inline event handlers.`);
  }
});

test("The Wisp migration is namespaced, RLS-protected, and hidden from anonymous clients", () => {
  assertPresent(migration, "the secure Wisp Supabase migration");
  assertPresent(installSchema, "Wisp database/schema.sql");
  assert.equal(
    installSchema.trim(),
    migration.trim(),
    "Wisp's standalone schema.sql must exactly match the reviewed canonical migration."
  );
  assert.doesNotMatch(migration, /\bauth\.role\s*\(/i,
    "Policies must use TO authenticated instead of deprecated auth.role().");
  assert.doesNotMatch(migration, /\bcreate\s+(?:or\s+replace\s+)?(?:function|table)\s+public\.(?:profiles|contacts|blocks|chats|chat_members|messages|message_receipts|calls|call_participants|notifications)\b/i,
    "Wisp must not create generic public objects that can collide with KiddoSprout.");

  const tables = [
    "wisp_profiles",
    "wisp_contacts",
    "wisp_blocks",
    "wisp_chats",
    "wisp_chat_members",
    "wisp_messages",
    "wisp_message_receipts",
    "wisp_calls",
    "wisp_call_participants"
  ];
  for (const table of tables) {
    assert.match(migration, new RegExp(`create\\s+table(?:\\s+if\\s+not\\s+exists)?\\s+public\\.${table}\\b`, "i"),
      `Migration must create public.${table}.`);
    assert.match(migration, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i"),
      `RLS must be enabled on public.${table}.`);
    assert.match(migration, new RegExp(`revoke\\s+all[\\s\\S]*?public\\.${table}[\\s\\S]*?from\\s+(?:public\\s*,\\s*)?anon`, "i"),
      `Anonymous access must be revoked from public.${table}.`);
  }

  assert.match(migration, /grant\s+(?:select|insert|update|delete)[\s\S]*?on\s+table\s+public\.wisp_[a-z_]+[\s\S]*?to\s+authenticated/i,
    "The migration must explicitly expose only the needed Wisp table privileges to authenticated users.");
  assert.match(migration, /grant\s+usage\s+on\s+schema\s+public\s+to\s+authenticated\s*,\s*service_role/i,
    "The Data API roles need an explicit public-schema usage grant when new tables are not auto-exposed.");
  for (const [table, columns] of [
    ["wisp_contacts", "owner_id\\s*,\\s*contact_id"],
    ["wisp_blocks", "owner_id\\s*,\\s*blocked_id"],
    ["wisp_messages", "chat_id\\s*,\\s*sender_id\\s*,\\s*content"],
    ["wisp_message_receipts", "message_id\\s*,\\s*user_id"]
  ]) {
    assert.match(
      migration,
      new RegExp(`grant\\s+insert\\s*\\(\\s*${columns}\\s*\\)\\s+on\\s+(?:table\\s+)?public\\.${table}\\s+to\\s+authenticated`, "i"),
      `INSERT on public.${table} must be restricted to its browser-writable columns.`
    );
    assert.doesNotMatch(
      migration,
      new RegExp(`grant\\s+(?:select\\s*,\\s*)?insert(?:\\s*,\\s*(?:select|update|delete))*\\s+on\\s+(?:table\\s+)?public\\.${table}\\s+to\\s+authenticated`, "i"),
      `public.${table} must not receive a broad whole-row INSERT grant.`
    );
  }
  assert.doesNotMatch(migration, /grant\s+update(?:\s*\([^)]*\))?\s+on\s+(?:table\s+)?public\.wisp_message_receipts\s+to\s+authenticated/i,
    "Read receipts are not implemented yet, so the browser must not receive UPDATE access.");
  assert.doesNotMatch(migration, /grant\s+(?:select|insert|update|delete|all)[\s\S]*?on\s+table\s+public\.wisp_[a-z_]+[\s\S]*?to\s+(?:public\s*,\s*)?anon\b/i,
    "The anonymous role must not receive a Wisp table grant.");
  assert.match(migration, /is_anonymous/,
    "RLS/RPC authorization must explicitly reject Supabase anonymous users.");

  const updates = policyStatements(migration, "update");
  assert.ok(updates.length > 0, "Wisp needs at least one authenticated UPDATE policy.");
  for (const statement of updates) {
    assert.match(statement, /\bto\s+authenticated\b/i);
    assert.match(statement, /\busing\s*\(/i);
    assert.match(statement, /\bwith\s+check\s*\(/i,
      "Every UPDATE policy must protect both the existing and replacement row.");
  }
});

test("Privileged Wisp functions stay private and no global Auth trigger is installed", () => {
  assertPresent(migration, "the secure Wisp Supabase migration");
  assert.doesNotMatch(
    migration,
    /create\s+trigger[\s\S]{0,400}?\bon\s+auth\.users\b/i,
    "Installing Wisp must not attach a generic trigger to every KiddoSprout Auth user."
  );

  const functionBlocks = migration
    .split(/(?=create\s+or\s+replace\s+function\s+)/i)
    .filter((block) => /^create\s+or\s+replace\s+function\s+/i.test(block));
  const definerBlocks = functionBlocks.filter((block) => /\bsecurity\s+definer\b/i.test(block));
  assert.ok(definerBlocks.length > 0,
    "At least one narrowly scoped private helper is expected for atomic membership operations.");
  for (const block of definerBlocks) {
    assert.match(block, /^create\s+or\s+replace\s+function\s+wisp_private\./i,
      "SECURITY DEFINER functions must live in the unexposed wisp_private schema.");
    assert.match(block, /\bset\s+search_path\s*=/i,
      "Every SECURITY DEFINER helper needs a fixed search_path.");
    assert.match(block, /auth\.uid\s*\(\)|is_real_user\s*\(/i,
      "Every SECURITY DEFINER helper must verify the current authenticated user.");
  }

  const endCallBlock = functionBlocks.find((block) =>
    /^create\s+or\s+replace\s+function\s+wisp_private\.end_call\b/i.test(block)
  ) || "";
  assert.match(endCallBlock, /wisp_call_participants/i,
    "Call cleanup must authorize only an account recorded on that call.");
  assert.doesNotMatch(endCallBlock, /can_interact_in_chat/i,
    "A block must stop signaling but must not prevent a participant from releasing the live call record.");

  for (const rpc of [
    "wisp_enroll_profile",
    "wisp_get_or_create_direct_chat",
    "wisp_start_call",
    "wisp_join_call",
    "wisp_end_call"
  ]) {
    assert.match(migration, new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${rpc}\\b`, "i"));
    assert.match(migration, new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${rpc}\\b[\\s\\S]*?to\\s+authenticated`, "i"));
    assert.doesNotMatch(migration, new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${rpc}\\b[\\s\\S]*?to\\s+(?:public\\s*,\\s*)?anon\\b`, "i"));
  }
});

test("Realtime authorization permits only chat members on scoped call topics", () => {
  assert.match(migration, /alter\s+publication\s+supabase_realtime\s+add\s+table\s+public\.wisp_messages/i,
    "Live message delivery requires wisp_messages in the Realtime publication.");
  assert.match(migration, /create\s+policy\s+["']?wisp_call_receive["']?[\s\S]*?on\s+realtime\.messages[\s\S]*?for\s+select[\s\S]*?to\s+authenticated/i);
  assert.match(migration, /create\s+policy\s+["']?wisp_call_send["']?[\s\S]*?on\s+realtime\.messages[\s\S]*?for\s+insert[\s\S]*?to\s+authenticated/i);
  assert.match(migration, /realtime\.topic\s*\(\s*\)|\btopic\b/i);
  assert.match(migration, /wisp-call:/,
    "Realtime policies and frontend must share the wisp-call:<chat-id> topic prefix.");
  assert.match(migration, /extension\s+in\s*\([^)]*['"]broadcast['"]|extension\s*=\s*['"]broadcast['"]/i,
    "Call-channel authorization must be limited to Broadcast messages.");
  assert.match(migration, /wisp_chat_members/,
    "Realtime send/receive authorization must prove current chat membership.");
  assert.match(migration, /wisp_blocks/,
    "Blocked users must not be allowed to exchange call signaling.");
});

test("The integration guide keeps deployment steps safe and credential-free", () => {
  assertPresent(importReadme, "the imported Wisp package README");
  assertPresent(wispReadme, "the canonical Wisp README");
  assertPresent(integrationGuide, "Wisp INTEGRATION.md");
  assert.match(integrationGuide, /correct Supabase project[^\n]*not (?:available|accessible)[^\n]*MCP/i);
  assert.match(integrationGuide, /SUPABASE_PUBLISHABLE_KEY/);
  assert.match(integrationGuide, /Turnstile|CAPTCHA/i);
  assert.match(integrationGuide, /redirect/i);
  assert.match(integrationGuide, /db push|migration/i);
  assert.match(integrationGuide, /test-wisp-integration\.mjs/);
  assert.match(integrationGuide, /\/wisp\/pages\/reset-password\.html/,
    "The Auth allow-list must use the hosted reset route, not the source-tree path.");
  assert.match(integrationGuide, /\/wisp\/pages\/complete-profile\.html/,
    "The Auth allow-list must include the hosted confirmation/profile-completion route.");
  assert.match(integrationGuide, /AUTH_EMAIL_DELIVERY_READY=false/,
    "The guide must keep email-backed actions off until hosted delivery is verified.");
  assert.match(integrationGuide, /AUTH_EMAIL_DELIVERY_READY=true/,
    "The guide must explain how to enable email-backed actions after real delivery tests pass.");
  assert.doesNotMatch(integrationGuide, /\/_______\/wisp\/frontend\/pages\/reset-password\.html/);
  for (const [name, readme] of [["import README", importReadme], ["Wisp README", wispReadme]]) {
    assert.doesNotMatch(readme, /YOUR-PROJECT-REF|YOUR-ANON-PUBLIC-KEY|email\/phone|enable phone auth/i,
      `${name} must not restore the legacy hard-coded config or phone-auth instructions.`);
    assert.doesNotMatch(readme, /SQL Editor[^\n]*(?:paste|run)/i,
      `${name} must direct setup through the canonical migration rather than pasted SQL.`);
  }
  assert.doesNotMatch(integrationGuide, /sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
    "Documentation must never contain a real secret or access token.");
});
