import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const entrypoint = new URL("docker-entrypoint.d/99-kiddosprout-config.sh", root).pathname;
const read = (path) => readFile(new URL(path, root), "utf8");
const officialTestSitekeys = [
  "1x00000000000000000000AA",
  "2x00000000000000000000AB",
  "1x00000000000000000000BB",
  "2x00000000000000000000BB",
  "3x00000000000000000000FF"
];

class StorageMock {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries));
  }

  getItem(key) {
    return this.values.has(String(key)) ? this.values.get(String(key)) : null;
  }

  setItem(key, value) {
    this.values.set(String(key), String(value));
  }

  removeItem(key) {
    this.values.delete(String(key));
  }

  snapshot() {
    return Object.fromEntries(this.values);
  }
}

class ElementMock {
  constructor({ dataset = {}, value = "", hidden = false, attributes = {} } = {}) {
    this.dataset = { ...dataset };
    this.value = value;
    this.hidden = hidden;
    this.disabled = false;
    this.required = true;
    this.textContent = "";
    this.className = "";
    this.attributes = new Map(Object.entries(attributes));
    this.listeners = new Map();
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
      toggle: (name, force) => {
        const active = force === undefined ? !classes.has(name) : Boolean(force);
        if (active) classes.add(name);
        else classes.delete(name);
        return active;
      }
    };
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatch(type) {
    const event = {
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; }
    };
    for (const listener of this.listeners.get(type) || []) listener(event);
    return event;
  }

  appendChild(child) {
    this.children ||= [];
    this.children.push(child);
    return child;
  }

  click() {
    this.dispatch("click");
  }

  remove() {
    this.removed = true;
  }
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let stdout = "";
    let stderr = "";
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => { stdout += chunk; });
    child.stderr?.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

function functionBlock(source, name, nextName) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `Missing function ${name}.`);
  const end = nextName ? source.indexOf(`function ${nextName}`, start) : -1;
  return source.slice(start, end < 0 ? source.length : end);
}

function inlineScriptContaining(source, marker) {
  const script = [...source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
    .find((match) => !/\bsrc\s*=/.test(match[1]) && match[2].includes(marker));
  assert.ok(script, `Missing inline script containing ${marker}.`);
  return script[2];
}

async function runEntrypoint(testRoot, name, suppliedEnvironment = {}) {
  const webRoot = join(testRoot, name);
  await mkdir(webRoot, { recursive: true });
  for (let index = 1; index <= 6; index += 1) {
    await writeFile(join(webRoot, `app_${index}.html`), "legacy account prototype\n");
  }
  const configTarget = join(webRoot, "supabase-config.js");
  const environment = {
    PATH: process.env.PATH,
    KIDDOSPROUT_WEB_ROOT: webRoot,
    KIDDOSPROUT_CONFIG_TARGET: configTarget,
    ...suppliedEnvironment
  };
  if (suppliedEnvironment.PUBLIC_DEMO_ONLY === undefined) delete environment.PUBLIC_DEMO_ONLY;
  const result = await run("/bin/sh", [entrypoint], {
    cwd: root.pathname,
    env: environment,
    stdio: ["ignore", "pipe", "pipe"]
  });
  const config = result.code === 0 ? await readFile(configTarget, "utf8") : "";
  return { ...result, config, webRoot };
}

const testRoot = await mkdtemp(join(tmpdir(), "kiddosprout-public-preview-"));
try {
  const sentinelValues = {
    SUPABASE_URL: "https://sentinel-project.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sentinel-browser-key",
    TURNSTILE_SITE_KEY: "sentinel-turnstile-key",
    AUTH_EMAIL_DELIVERY_READY: "true",
    GOOGLE_AUTH_READY: "true"
  };
  let result = await runEntrypoint(testRoot, "demo-with-sentinels", {
    PUBLIC_DEMO_ONLY: "true",
    ...sentinelValues
  });
  assert.equal(result.code, 0, result.stderr);
  const configWindow = {};
  vm.runInNewContext(result.config, { window: configWindow, Object });
  assert.deepEqual(Object.keys(configWindow.KIDDO_SPROUT_SUPABASE), ["publicDemoOnly"]);
  assert.equal(configWindow.KIDDO_SPROUT_SUPABASE.publicDemoOnly, true);
  for (const sentinel of [sentinelValues.SUPABASE_URL, sentinelValues.SUPABASE_PUBLISHABLE_KEY, sentinelValues.TURNSTILE_SITE_KEY]) {
    assert.doesNotMatch(result.config, new RegExp(sentinel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (let index = 1; index <= 6; index += 1) {
    await assert.rejects(readFile(join(result.webRoot, `app_${index}.html`), "utf8"), { code: "ENOENT" });
  }

  result = await runEntrypoint(testRoot, "demo-empty", { PUBLIC_DEMO_ONLY: "true" });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.config, /publicDemoOnly: true/);

  result = await runEntrypoint(testRoot, "invalid-mode", { PUBLIC_DEMO_ONLY: "yes" });
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /exactly true or false/);

  result = await runEntrypoint(testRoot, "live-missing", { PUBLIC_DEMO_ONLY: "false" });
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /configuration is incomplete/);

  for (const [index, sitekey] of officialTestSitekeys.entries()) {
    result = await runEntrypoint(testRoot, `live-test-key-${index}`, {
      PUBLIC_DEMO_ONLY: "false",
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_browser_test_key_123",
      TURNSTILE_SITE_KEY: sitekey
    });
    assert.notEqual(result.code, 0, `Public account mode accepted ${sitekey}.`);
    assert.match(result.stderr, /test sitekeys are forbidden/);
  }

  result = await runEntrypoint(testRoot, "live-real-key", {
    PUBLIC_DEMO_ONLY: "false",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_production_browser_test_key_123",
    TURNSTILE_SITE_KEY: "0x4AAAAAA-example-production-sitekey"
  });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.config, /publicDemoOnly: false/);
  assert.match(result.config, /0x4AAAAAA-example-production-sitekey/);

  result = await runEntrypoint(testRoot, "local-test-key", {
    PUBLIC_DEMO_ONLY: undefined,
    SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_browser_test_key_123",
    TURNSTILE_SITE_KEY: officialTestSitekeys[0]
  });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.config, /publicDemoOnly: false/);

  result = await runEntrypoint(testRoot, "hosted-test-key", {
    PUBLIC_DEMO_ONLY: undefined,
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_production_browser_test_key_123",
    TURNSTILE_SITE_KEY: officialTestSitekeys[0]
  });
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /loopback Supabase stack/);

  const [demoSource, sessionSource, appSource, styleSource, indexHtml, recipe, spending, blockerSetup, blockerSetupHtml,
    compose, localWriter, localStarter, voiceApi, blockerApi, bankApi, worker, packageSource, hubGateSource,
    reportPage, creatorStudio, natureExplorer, moveBreaks, voiceLibrary, storyTheater, storyStorageSource] = await Promise.all([
    read("demo-mode.js"),
    read("auth-session.js"),
    read("js.js"),
    read("style.css"),
    read("index.html"),
    read("recipe.html"),
    read("app_7.html"),
    read("blocker-setup.js"),
    read("blocker-setup.html"),
    read("docker-compose.public.yml"),
    read("scripts/write-local-compose-override.mjs"),
    read("scripts/start-local-stack.sh"),
    read("server/voice-api.mjs"),
    read("server/blocker-api.mjs"),
    read("server/bank-api.mjs"),
    read("service-worker.js"),
    read("package.json"),
    read("kid-hub-gate.js"),
    read("report_problem.html"),
    read("creator-studio.html"),
    read("nature-explorer.html"),
    read("move-breaks.html"),
    read("story-voices.html"),
    read("story-theater.html"),
    read("story-storage.js")
  ]);

  const realSession = JSON.stringify({ access_token: "real-token", refresh_token: "real-refresh" });
  const localStorage = new StorageMock({ kiddosproutSupabaseSession: realSession, flavornest_session: realSession });
  const sessionStorage = new StorageMock();
  const networkCalls = [];
  const windowObject = {
    KIDDO_SPROUT_SUPABASE: { publicDemoOnly: true },
    localStorage,
    sessionStorage,
    atob: (value) => Buffer.from(value, "base64").toString("binary")
  };
  const context = vm.createContext({
    window: windowObject,
    fetch: async (...args) => { networkCalls.push(args); throw new Error("Public demo must not fetch Auth."); },
    console,
    JSON,
    Object,
    String,
    Number,
    Math,
    Date,
    Buffer
  });
  vm.runInContext(demoSource, context, { filename: "demo-mode.js" });
  vm.runInContext(sessionSource, context, { filename: "auth-session.js" });
  assert.equal(windowObject.KiddoSproutDemo.active(), true, "Public demo was not active synchronously.");
  assert.equal(windowObject.KiddoSproutDemo.publicOnly(), true);
  assert.equal(windowObject.KiddoSproutDemo.write({ familyName: "Fictional family" }), true);
  windowObject.KiddoSproutDemo.exit();
  assert.equal(windowObject.KiddoSproutDemo.active(), true, "Public demo exit exposed account mode.");
  assert.equal(windowObject.KiddoSproutSession.getSession(), null);
  assert.equal(await windowObject.KiddoSproutSession.getAccessToken(), "");
  assert.equal(await windowObject.KiddoSproutSession.refresh(), null);
  assert.equal(await windowObject.KiddoSproutSession.validate(), null);
  assert.equal(networkCalls.length, 0);
  assert.equal(localStorage.getItem("kiddosproutSupabaseSession"), realSession);

  // A standalone public-demo URL must ignore any real family left on the same
  // origin and must not claim that a parent request was sent when no fictional
  // demo profile has been initialized in this tab.
  const publicRealFamily = JSON.stringify({
    parentAccountCreated: true,
    activeChild: "real",
    children: { real: { name: "Real child", appRules: { story: "allowed" }, pending: 0 } }
  });
  const publicGateLocalStorage = new StorageMock({ kiddosproutState: publicRealFamily });
  const publicGateSessionStorage = new StorageMock();
  const publicGatePage = new ElementMock();
  const publicGateLock = new ElementMock();
  const publicGateTitle = new ElementMock();
  const publicGateMessage = new ElementMock();
  publicGatePage.classList.add("hidden");
  publicGateLock.classList.add("hidden");
  const publicGateDocument = {
    querySelector(selector) {
      return ({
        "[data-hub-page]": publicGatePage,
        "[data-hub-lock]": publicGateLock,
        "[data-lock-title]": publicGateTitle,
        "[data-lock-message]": publicGateMessage
      })[selector] || null;
    }
  };
  const publicGateWindow = {
    KIDDO_SPROUT_SUPABASE: { publicDemoOnly: true },
    localStorage: publicGateLocalStorage,
    sessionStorage: publicGateSessionStorage
  };
  const publicGateLocalBefore = publicGateLocalStorage.snapshot();
  vm.runInNewContext(hubGateSource, {
    window: publicGateWindow,
    document: publicGateDocument,
    console,
    JSON,
    Object,
    String,
    Number,
    Array
  }, { filename: "kid-hub-gate-public-preview.js" });
  assert.equal(publicGateWindow.KiddoHubGate.protect("story", "Story Theater"), false);
  assert.equal(publicGatePage.classList.contains("hidden"), true);
  assert.equal(publicGateLock.classList.contains("hidden"), false);
  assert.match(publicGateMessage.textContent, /no parent request was sent/i);
  assert.deepEqual(publicGateLocalStorage.snapshot(), publicGateLocalBefore,
    "A direct public hub URL read/wrote the real family instead of requiring the fictional demo profile.");
  assert.deepEqual(publicGateSessionStorage.snapshot(), {});

  // The directly addressable report page must also refuse to fall back to a
  // real family when the public preview has no fictional state in this tab.
  const publicReportLocalStorage = new StorageMock({ kiddosproutState: publicRealFamily });
  const publicReportSessionStorage = new StorageMock();
  const publicReportElements = {
    "#status": new ElementMock(),
    "#reportIntro": new ElementMock(),
    "#reportForm": new ElementMock(),
    "#problemText": new ElementMock({ value: "Public preview practice report" }),
    "#problemUrgency": new ElementMock({ value: "Today" }),
    "#problemCounter": new ElementMock(),
    "#sendReport": new ElementMock(),
    "#clearReport": new ElementMock()
  };
  const publicReportLocalBefore = publicReportLocalStorage.snapshot();
  const publicReportWindow = {
    KIDDO_SPROUT_SUPABASE: { publicDemoOnly: true },
    localStorage: publicReportLocalStorage,
    sessionStorage: publicReportSessionStorage
  };
  vm.runInNewContext(inlineScriptContaining(reportPage, "async function sendReport"), {
    window: publicReportWindow,
    document: { querySelector: (selector) => publicReportElements[selector] || null },
    console,
    JSON,
    Object,
    String,
    Number,
    Array,
    Date
  }, { filename: "report-problem-public-preview.js" });
  await publicReportWindow.KiddoSproutProblemReports.ready;
  publicReportElements["#reportForm"].dispatch("submit");
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(publicReportElements["#status"].textContent, /no real parent was contacted/i);
  assert.deepEqual(publicReportLocalStorage.snapshot(), publicReportLocalBefore,
    "The public report page changed a real family record.");
  assert.deepEqual(publicReportSessionStorage.snapshot(), {});

  const publicStoryLocalStorage = new StorageMock({ kiddosproutLivingInkBookmark: "9" });
  const publicStorySessionStorage = new StorageMock();
  const publicStoryLocalBefore = publicStoryLocalStorage.snapshot();
  const publicStoryWindow = {
    KIDDO_SPROUT_SUPABASE: { publicDemoOnly: true },
    localStorage: publicStoryLocalStorage,
    sessionStorage: publicStorySessionStorage
  };
  vm.runInNewContext(storyStorageSource, { window: publicStoryWindow, console, Object, String }, {
    filename: "story-storage-public-preview.js"
  });
  assert.equal(publicStoryWindow.KiddoSproutStoryStorage.getItem("kiddosproutLivingInkBookmark"), null);
  assert.equal(publicStoryWindow.KiddoSproutStoryStorage.setItem("kiddosproutLivingInkBookmark", "1"), true);
  assert.equal(publicStorySessionStorage.getItem("kiddosprout.demo.v1.story:kiddosproutLivingInkBookmark"), "1");
  assert.deepEqual(publicStoryLocalStorage.snapshot(), publicStoryLocalBefore,
    "Public Story Theater persistence changed a real bookmark.");

  assert.match(appSource, /const PUBLIC_DEMO_ONLY = SUPABASE_CONFIG\.publicDemoOnly === true/);
  assert.match(appSource, /Boolean\(!PUBLIC_DEMO_ONLY && SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY\)/);
  assert.match(appSource, /return PUBLIC_DEMO_ONLY \|\| window\.KiddoSproutDemo/);
  assert.match(indexHtml, /data-public-demo-account-action/);
  assert.match(recipe, /if \(PUBLIC_DEMO_ONLY\) return true/);
  assert.ok(recipe.indexOf("if (isKiddoSproutDemoMode())") < recipe.lastIndexOf("restoreSession();"));
  assert.match(spending, /publicDemoOnly === true/);
  const publicBlockerLinks = [...indexHtml.matchAll(/<a[^>]+href="blocker-setup\.html"[^>]*>/g)];
  assert.equal(publicBlockerLinks.length, 2, "Both Game Blocker dashboard actions must remain present.");
  publicBlockerLinks.forEach(([link]) => {
    assert.match(link, /data-demo-protected=/, "The link must remain protected outside its read-only preview exception.");
    assert.match(link, /data-public-demo-preview/, "Every demo must offer a safe setup preview.");
    assert.match(link, /data-public-demo-label="[^"]*Preview/i, "The public action must be labelled as a preview.");
  });
  assert.match(appSource, /if \(element\.hasAttribute\("data-public-demo-preview"\)\)/);
  assert.match(appSource, /if \(protectedTarget\.hasAttribute\("data-public-demo-preview"\)\) return/);
  assert.match(functionBlock(appSource, "openLinkedApp", "completeTask"),
    /if \(isDemoMode\(\)\) \{\s*if \(link\.hasAttribute\("data-public-demo-preview"\)\) return;/);
  assert.match(styleSource, /body\.demo-mode \[data-public-demo-preview\] \{[\s\S]*?cursor: pointer;[\s\S]*?opacity: 1;[\s\S]*?filter: none;/,
    "The setup preview must look active in either kind of Demo Mode.");
  assert.match(styleSource, /body\.demo-mode a\[data-public-demo-preview\] \{\s*text-decoration: none;/,
    "The setup preview must not inherit the crossed-out live-action style.");

  for (const appId of ["spending", "recipe"]) {
    const connectedPreview = indexHtml.match(new RegExp(`<a[^>]+data-open-app-link="${appId}"[^>]*>`))?.[0] || "";
    assert.match(connectedPreview, /data-public-demo-preview/,
      `${appId} must be whitelisted only as a safe demo preview.`);
    assert.match(connectedPreview, /data-demo-preview-title="[^"]+"/);
  }

  for (const href of ["recipe.html", "app_7.html"]) {
    const settingsPreview = indexHtml.match(new RegExp(`<a class="settings-link" href="${href}"[^>]*>`))?.[0] || "";
    assert.match(settingsPreview, /data-demo-protected=/,
      `${href} settings link must retain the live-feature guard.`);
    assert.match(settingsPreview, /data-public-demo-preview/,
      `${href} settings link must remain clickable as a safe public preview.`);
    assert.match(settingsPreview, /data-demo-preview-title="[^"]+"/);
  }

  for (const selector of ["badge", "plan-item", "mini-card", "schedule-item", "story-box", "goal-chip", "flyer-score"]) {
    assert.match(styleSource, new RegExp(`body\\.theme-night\\.mode-child \\.${selector}`),
      `Night child mode must explicitly style .${selector}.`);
  }
  assert.match(styleSource, /body\.theme-night \.modal-panel \{/,
    "The inline Kid Hub modal must have a dedicated night surface.");
  assert.match(styleSource, /body\.theme-night\.mode-child \.modal-panel \.tiny:not\(:disabled\):not\(\[aria-disabled="true"\]\)/,
    "Active tiny controls in the night Kid Hub modal must have an enabled treatment.");

  const layerOf = (selector) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = styleSource.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{[\\s\\S]*?z-index:\\s*(\\d+)`));
    assert.ok(match, `Missing numeric z-index for ${selector}.`);
    return Number(match[1]);
  };
  const demoBannerLayer = layerOf(".demo-banner");
  const modalLayer = layerOf(".modal");
  assert.ok(modalLayer > demoBannerLayer, "The demo banner must stay below open modals.");
  assert.ok(layerOf(".lock-gate") > demoBannerLayer, "The demo banner must stay below the parent gate.");
  assert.ok(layerOf(".toast") > modalLayer, "Toasts must remain visible above an open modal.");

  assert.match(appSource, /function scrollToJumpTarget\(target\)[\s\S]*?demoBanner\.getBoundingClientRect\(\)\.height[\s\S]*?window\.scrollTo\(\{/,
    "Demo jump navigation must offset the live demo banner height.");
  assert.match(appSource, /scrollToJumpTarget\(target\);/);

  for (const standaloneHub of [creatorStudio, natureExplorer, moveBreaks, voiceLibrary, storyTheater]) {
    assert.ok(standaloneHub.indexOf("supabase-config.js") < standaloneHub.indexOf("demo-mode.js"));
    assert.ok(standaloneHub.indexOf("demo-mode.js") < standaloneHub.indexOf("kid-hub-gate.js"));
  }
  assert.ok(reportPage.indexOf("supabase-config.js") < reportPage.indexOf("demo-mode.js"));
  assert.match(reportPage, /Practice report saved in this demo tab\. No real parent was contacted\./);
  assert.ok(storyTheater.indexOf("story-storage.js") < storyTheater.indexOf("KiddoHubGate.protect"));
  assert.match(worker, /"\/story-storage\.js"/);

  assert.match(spending, /const READ_ONLY_DEMO = PUBLIC_DEMO_ONLY \|\| SESSION_DEMO_ACTIVE/);
  assert.match(functionBlock(spending, "loadState", "normalizePracticeState"), /if \(READ_ONLY_DEMO\)[\s\S]*?readDemoPracticeRecord\(\) \|\| freshPracticeState\(\)/);
  assert.match(functionBlock(spending, "save", "showToast"), /if \(READ_ONLY_DEMO\)[\s\S]*?sessionStorage\.setItem\(DEMO_STORAGE_KEY[\s\S]*?return;[\s\S]*?localStorage\.setItem/);
  assert.match(functionBlock(spending, "canOpenKiddoSproutApp", "addHistory"), /if \(READ_ONLY_DEMO\) return true;/);
  assert.match(functionBlock(spending, "apiPost", "loadPlaid"), /if \(READ_ONLY_DEMO\)[\s\S]*?throw new Error[\s\S]*?fetch\(/);
  assert.match(functionBlock(spending, "loadPlaid", "normalizeBankStatus"), /if \(READ_ONLY_DEMO\)[\s\S]*?Promise\.reject/);
  assert.match(functionBlock(spending, "renderBank", "setBankBusy"), /if \(READ_ONLY_DEMO\)[\s\S]*?never contacts a bank[\s\S]*?Practice bank ready/);
  assert.doesNotMatch(functionBlock(spending, "connectPracticeBank", "setAppAccessReady"), /fetch\(|apiPost\(|loadPlaid\(|localStorage/,
    "the fictional practice-bank preview must not contact a provider, API, or persistent storage");
  const spendingFamilyLoader = functionBlock(spending, "fetchVerifiedFamily", "enqueueDashboardRequest");
  assert.match(spendingFamilyLoader, /sessionApi\.validate\(\)[\s\S]*?familyApi\.load\(\{ expectedOwnerId: ownerId \}\)/,
    "Real Smart Spending must validate the parent before loading the owner-scoped family row.");
  assert.match(spendingFamilyLoader, /familyMatchesSession\(family, session, ownerId\)/,
    "Real Smart Spending must reject a family row that does not match the verified parent.");
  const spendingStarter = functionBlock(spending, "startApp");
  const spendingDemoBranch = spendingStarter.indexOf("if (READ_ONLY_DEMO)");
  const spendingFamilyFetch = spendingStarter.indexOf("context = await fetchVerifiedFamily()");
  assert.ok(spendingDemoBranch >= 0 && spendingFamilyFetch > spendingDemoBranch,
    "The public Smart Spending preview must branch before any auth or family-cloud request.");
  assert.match(spendingStarter.slice(spendingDemoBranch, spendingFamilyFetch), /render\(\);\s*return;/,
    "The public Smart Spending preview must finish without falling through to real account access.");
  assert.match(spendingStarter.slice(spendingFamilyFetch), /verifiedOwnerId = context\.ownerId;[\s\S]*?PRACTICE_SCOPE = currentPracticeScope\(\);[\s\S]*?state = normalizePracticeState\(loadState\(\)\)/,
    "Real Smart Spending practice data must be scoped only after the verified owner and child are known.");

  const liveResourceInitializer = functionBlock(blockerSetup, "enableLiveResourceLinks", "initializePublicPreview");
  assert.match(liveResourceInitializer, /setAttribute\("href", "\/api\/blocker\/checksums"\)/,
    "Live blocker pages must explicitly enable the checksum endpoint.");
  assert.match(liveResourceInitializer, /removeAttribute\("aria-disabled"\)/);
  assert.match(liveResourceInitializer, /removeAttribute\("tabindex"\)/);

  const previewInitializer = functionBlock(blockerSetup, "initializePublicPreview", "accessToken");
  assert.match(previewInitializer, /bindPlatformChoices\(renderPublicSelection\)/,
    "The public blocker page must keep its platform/setup preview interactive.");
  assert.match(previewInitializer, /downloadButton\.disabled = false/,
    "The public preview must enable its harmless text-guide download.");
  assert.match(previewInitializer, /removeAttribute\("href"\)/,
    "Public-preview checksum links must not call a protected endpoint.");
  assert.doesNotMatch(previewInitializer, /fetch\(|accessToken|\/api\/blocker/,
    "The public preview initializer must not touch Auth or blocker APIs.");
  const demoDownloadInitializer = functionBlock(blockerSetup, "downloadDemoGuide", "initializePublicPreview");
  assert.match(demoDownloadInitializer, /new Blob\(\[demoGuideText\(\)\], \{ type: "text\/plain;charset=utf-8" \}\)/);
  assert.doesNotMatch(demoDownloadInitializer, /fetch\(|accessToken|\/api\/blocker/,
    "Saving the demo guide must remain entirely local.");
  assert.match(blockerSetup, /const READ_ONLY_DEMO = PUBLIC_DEMO_ONLY \|\| SESSION_DEMO_ACTIVE/);
  assert.match(blockerSetup, /if \(READ_ONLY_DEMO\) \{\s*initializePublicPreview\(\);\s*return;/);
  assert.doesNotMatch(blockerSetup, /location\.replace\(/, "The setup preview must not bounce back to the dashboard.");
  assert.ok(blockerSetup.indexOf("if (READ_ONLY_DEMO)") < blockerSetup.indexOf("bindPlatformChoices(checkSetup)"),
    "Read-only preview must return before live account/download listeners are installed.");
  assert.match(blockerSetupHtml, /id="blocker-preview-note"[^>]*hidden/);
  assert.equal((blockerSetupHtml.match(/data-live-blocker-resource/g) || []).length, 2);
  for (const match of blockerSetupHtml.matchAll(/<a\b[^>]*\bdata-live-blocker-resource\b[^>]*>/gi)) {
    assert.doesNotMatch(match[0], /\bhref\s*=/i, "Checksum controls must be inert before live-mode JavaScript runs.");
    assert.doesNotMatch(match[0], /\bdownload(?:\s|=|>)/i, "Checksum controls must not download before live-mode JavaScript runs.");
  }

  const previewElements = {
    "blocker-download-form": new ElementMock(),
    "blocker-pin": new ElementMock(),
    "blocker-pin-confirm": new ElementMock(),
    "confirm-pin-field": new ElementMock(),
    "blocker-enrollment-fields": new ElementMock({ hidden: true }),
    "blocker-account-password": new ElementMock(),
    "blocker-human-check": new ElementMock(),
    "blocker-human-check-status": new ElementMock(),
    "blocker-download-status": new ElementMock(),
    "retry-blocker-check": new ElementMock({ hidden: true }),
    "download-blocker": new ElementMock(),
    "download-platform-icon": new ElementMock(),
    "download-platform-label": new ElementMock(),
    "windows-architecture-field": new ElementMock({ hidden: true }),
    "windows-architecture": new ElementMock({ value: "windows" }),
    "view-blocker-pin": new ElementMock(),
    "download-intro": new ElementMock(),
    "blocker-build-label": new ElementMock(),
    "download-title": new ElementMock(),
    "blocker-preview-note": new ElementMock({ hidden: true }),
    "blocker-live-download-fields": new ElementMock(),
    "blocker-demo-download-summary": new ElementMock({ hidden: true })
  };
  const previewPlatforms = [
    new ElementMock({ dataset: { blockerPlatform: "mac" } }),
    new ElementMock({ dataset: { blockerPlatform: "windows" } })
  ];
  const previewSetupPanels = [
    new ElementMock({ dataset: { setupPlatform: "mac" } }),
    new ElementMock({ dataset: { setupPlatform: "windows" }, hidden: true })
  ];
  const previewResourceLinks = [new ElementMock(), new ElementMock()];
  const previewBody = new ElementMock();
  const previewDownloads = [];
  const previewBlobs = [];
  const revokedPreviewUrls = [];
  const previewDocument = {
    body: previewBody,
    title: "Game Blocker Downloads | KiddoSprout",
    createElement(tagName) {
      const element = new ElementMock();
      if (tagName === "a") {
        element.click = () => previewDownloads.push({ filename: element.download, href: element.href });
      }
      return element;
    },
    getElementById: (id) => previewElements[id] || null,
    querySelectorAll: (selector) => {
      if (selector === "[data-blocker-platform]") return previewPlatforms;
      if (selector === "[data-setup-platform]") return previewSetupPanels;
      if (selector === "[data-live-blocker-resource]") return previewResourceLinks;
      return [];
    }
  };
  const blockerPreviewCalls = [];
  vm.runInNewContext(blockerSetup, {
    window: {
      KIDDO_SPROUT_SUPABASE: { publicDemoOnly: true },
      KiddoSproutSession: { getAccessToken: () => { blockerPreviewCalls.push("auth"); return "token"; } },
      setTimeout(callback) { callback(); return 1; }
    },
    document: previewDocument,
    navigator: { userAgent: "Macintosh" },
    fetch: (...args) => { blockerPreviewCalls.push(["fetch", ...args]); throw new Error("Public preview fetched the blocker API."); },
    console,
    Array,
    Boolean,
    Blob,
    Object,
    String,
    URL: {
      createObjectURL(blob) {
        previewBlobs.push(blob);
        return `blob:demo-guide-${previewBlobs.length}`;
      },
      revokeObjectURL(url) { revokedPreviewUrls.push(url); }
    }
  }, { filename: "blocker-setup-public-preview.js" });
  assert.deepEqual(blockerPreviewCalls, [], "Public Game Blocker preview touched Auth or the network.");
  assert.equal(previewBody.classList.contains("public-blocker-preview"), true);
  assert.equal(previewElements["blocker-preview-note"].hidden, false);
  assert.equal(previewElements["blocker-pin"].disabled, true);
  assert.equal(previewElements["blocker-pin-confirm"].disabled, true);
  assert.equal(previewElements["blocker-account-password"].disabled, true,
    "Public Game Blocker preview must keep parent reauthentication unavailable.");
  assert.equal(previewElements["blocker-enrollment-fields"].hidden, true,
    "Public Game Blocker preview must not reveal live first-enrollment controls.");
  assert.equal(previewElements["blocker-live-download-fields"].hidden, true,
    "Public Game Blocker preview must hide every live PIN and account field.");
  assert.equal(previewElements["blocker-demo-download-summary"].hidden, false,
    "Public Game Blocker preview must explain what the harmless sample contains.");
  assert.equal(previewElements["retry-blocker-check"].hidden, true,
    "Public Game Blocker preview must not expose the live service retry action.");
  assert.equal(previewElements["download-blocker"].disabled, false);
  assert.match(previewElements["download-platform-label"].textContent, /Download Mac demo setup guide/);
  previewResourceLinks.forEach((link) => assert.equal(link.hasAttribute("href"), false));
  const previewSubmit = previewElements["blocker-download-form"].dispatch("submit");
  assert.equal(previewSubmit.defaultPrevented, true);
  assert.equal(previewDownloads.length, 1, "The public preview must complete one browser download gesture.");
  assert.equal(previewDownloads[0].filename, "KiddoSprout-Mac-Demo-Setup-Guide.txt");
  assert.equal(previewBlobs[0].type, "text/plain;charset=utf-8");
  const macGuideText = await previewBlobs[0].text();
  assert.match(macGuideText, /DEMO FILE — TEXT ONLY/);
  assert.match(macGuideText, /contains no blocker app, installer, browser extension, PIN, password, or executable code/i);
  assert.match(macGuideText, /Selected preview: Mac/);
  assert.equal(revokedPreviewUrls.length, 1, "The demo guide's temporary object URL must be released.");
  assert.match(previewElements["blocker-download-status"].textContent, /harmless text guide; no app was installed or run/i);
  previewPlatforms[1].dispatch("click");
  assert.equal(previewElements["windows-architecture-field"].hidden, false);
  assert.equal(previewSetupPanels[0].hidden, true);
  assert.equal(previewSetupPanels[1].hidden, false);
  assert.match(previewElements["download-platform-label"].textContent, /Download Windows x64 demo setup guide/);
  previewElements["windows-architecture"].value = "windows-arm64";
  previewElements["windows-architecture"].dispatch("change");
  previewElements["blocker-download-form"].dispatch("submit");
  assert.equal(previewDownloads[1].filename, "KiddoSprout-Windows-ARM64-Demo-Setup-Guide.txt");
  assert.match(await previewBlobs[1].text(), /Selected preview: Windows ARM64/);
  assert.deepEqual(blockerPreviewCalls, [], "Changing the preview platform touched Auth or the network.");

  const sessionDemoCalls = [];
  vm.runInNewContext(blockerSetup, {
    window: {
      KIDDO_SPROUT_SUPABASE: { publicDemoOnly: false },
      sessionStorage: new StorageMock({ "kiddosprout.demo.v1.active": "1" }),
      KiddoSproutSession: { getAccessToken: () => { sessionDemoCalls.push("auth"); return "token"; } }
    },
    document: previewDocument,
    navigator: { userAgent: "Macintosh" },
    fetch: (...args) => { sessionDemoCalls.push(["fetch", ...args]); throw new Error("Session demo fetched the blocker API."); },
    console,
    Array,
    Boolean,
    Object,
    String
  }, { filename: "blocker-setup-session-preview.js" });
  assert.deepEqual(sessionDemoCalls, [], "Colleague Demo Mode touched Auth or the network while opening the setup preview.");
  assert.equal(previewElements["retry-blocker-check"].hidden, true,
    "Colleague Demo Mode must not expose the live service retry action.");
  assert.equal(previewElements["download-blocker"].disabled, false,
    "Colleague Demo Mode must offer only the harmless text-guide download.");

  assert.equal((compose.match(/PUBLIC_DEMO_ONLY: "true"/g) || []).length, 4);
  for (const ignored of ["supabase-config.js", ...Array.from({ length: 6 }, (_, index) => `app_${index + 1}.html`)]) {
    assert.match(compose, new RegExp(`- "${ignored.replace(".", "\\.")}"`));
  }
  assert.match(localWriter, /publicDemoOnly: false/);
  assert.match(localStarter, /TURNSTILE_SITE_KEY=\$\{TURNSTILE_SITE_KEY:-1x00000000000000000000AA\}/);

  for (const apiSource of [voiceApi, blockerApi, bankApi]) {
    assert.match(apiSource, /const PUBLIC_DEMO_ONLY =/);
    const handlerStart = apiSource.indexOf("const server = createServer");
    const publicGuard = apiSource.indexOf("if (PUBLIC_DEMO_ONLY)", handlerStart);
    const authCall = apiSource.indexOf("authenticatedUser(request)", handlerStart);
    assert.ok(publicGuard > handlerStart && publicGuard < authCall, "Public API guard must run before account validation.");
    assert.match(apiSource.slice(publicGuard, authCall), /public_demo_only/);
  }

  assert.match(worker, /KIDDOSPROUT_CACHE_VERSION = "shell-v\d+"/);
  assert.match(worker, /KIDDOSPROUT_RUNTIME_CACHE_VERSION = "runtime-v\d+"/);
  assert.match(worker, /"\/recipe-cloud\.js"/);
  assert.match(packageSource, /"test:public-preview": "node scripts\/test-public-preview\.mjs && node scripts\/test-public-preview-status\.mjs"/);
  assert.match(packageSource, /test:demo && npm run test:public-preview/);

  new Function(demoSource);
  new Function(sessionSource);
  new Function(appSource);
  new Function(hubGateSource);
  new Function(storyStorageSource);
  new Function(inlineScriptContaining(reportPage, "function sendReport"));
  console.log("Public preview safety passed: demo-only strips Auth config, rejects test keys in account mode, and suppresses account/API access.");
} finally {
  await rm(testRoot, { recursive: true, force: true });
}
