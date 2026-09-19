import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import vm from "node:vm";
import { buildPublicDemo, OUTPUT_DIRECTORY } from "./build-public-demo.mjs";

const ROOT = new URL("../", import.meta.url);
const read = (path, encoding = "utf8") => readFile(new URL(path, ROOT), encoding);
const IANA_LANGUAGE_REGISTRY_URL = "https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry";

const GAME_SPECS = Object.freeze([
  {
    directory: "language-garden",
    title: "Language Garden",
    scripts: ["catalogue.js", "courses.js", "game.js"],
    metadataUrls: [IANA_LANGUAGE_REGISTRY_URL]
  },
  { directory: "pattern-painter", title: "Pattern Painter", scripts: ["engine.js", "game.js"] },
  { directory: "melody-meadow", title: "Melody Meadow", scripts: ["music.js", "game.js"] },
  { directory: "compass-quest", title: "Compass Quest", scripts: ["engine.js", "game.js"] },
  { directory: "science-sorter", title: "Science Sorter", scripts: ["labs.js", "game.js"] },
  { directory: "robot-routes", title: "Robot Routes", scripts: ["engine.js", "game.js"] },
  { directory: "word-builder", title: "Word Builder", scripts: ["engine.js", "game.js"] },
  { directory: "learning-world", title: "Learning World", scripts: ["subjects.js", "game.js"] },
  { directory: "multiplication-runner", title: "Math Runner", scripts: ["engine.js", "runner.js", "game.js"], assets: ["map.svg"] },
  { directory: "racing-game", title: "Sunset Sprint", scripts: ["game.js"] },
  { directory: "platformer-game", title: "Cloudbound", scripts: ["engine.js", "game.js"] },
  { directory: "memory-game", title: "Little Matches", scripts: ["engine.js", "game.js"] },
  { directory: "brick-breaker", title: "Prism Break", scripts: ["engine.js", "game.js"] },
  { directory: "snake-game", title: "Orbit Snake", scripts: ["engine.js", "game.js"] },
  { directory: "meteor-game", title: "Meteor Patrol", scripts: ["engine.js", "game.js"] }
]);

const PUBLIC_GAME_FILES = Object.freeze([
  "games/index.html",
  "games/arcade-access.js",
  "games/arcade-shell.css",
  ...GAME_SPECS.flatMap(({ directory, scripts, assets = [] }) => [
    `games/${directory}/index.html`,
    `games/${directory}/style.css`,
    ...scripts.map((script) => `games/${directory}/${script}`),
    ...assets.map((asset) => `games/${directory}/${asset}`)
  ])
]);

async function isFile(path) {
  try {
    return (await stat(new URL(path, ROOT))).isFile();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

const localGameDirectories = (await readdir(new URL("games/", ROOT), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
assert.deepEqual(
  localGameDirectories,
  GAME_SPECS.map(({ directory }) => directory).sort(),
  "The reviewed Sprout Arcade inventory must contain exactly fifteen web games."
);

const chooser = await read("games/index.html");
const expectedChooserLinks = GAME_SPECS.map(({ directory }) => `${directory}/index.html`);
for (const [index, spec] of GAME_SPECS.entries()) {
  assert.match(chooser, new RegExp(`href=["']${spec.directory}/index\\.html["']`),
    `${spec.title} must be selectable from Sprout Arcade.`);
  assert.match(chooser, new RegExp(`<h2>${spec.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</h2>`),
    `${spec.title} needs its truthful chooser label.`);
  const currentLink = chooser.indexOf(`href="${expectedChooserLinks[index]}"`);
  if (index > 0) {
    assert.ok(currentLink > chooser.indexOf(`href="${expectedChooserLinks[index - 1]}"`),
      "The reviewed game order changed unexpectedly.");
  }
}
assert.equal((chooser.match(/<a\b[^>]*class=["'][^"']*\bcard\b[^"']*["']/gi) || []).length, 16,
  "The chooser must contain fifteen browser games plus one clearly separate Chess download.");
assert.match(
  chooser,
  /<a\b[^>]*href=["']\.\.\/Game%201\.game["'][^>]*download=["']KiddoSprout-Chess-Match\.game["'][^>]*>[\s\S]*?<h2>Saved Chess Match<\/h2>[\s\S]*?Mac-only saved Chess match/,
  "Chess must be presented as a Mac saved-match download, not as a sixteenth browser game."
);
assert.equal(await isFile("Game 1.game"), true, "The chooser's saved Chess match is missing.");
assert.match(await read("Game 1.game"), /^<\?xml[\s\S]*?<plist\b/i,
  "The Chess download must remain a real macOS property-list game document.");

for (const spec of GAME_SPECS) {
  const base = `games/${spec.directory}`;
  const html = await read(`${base}/index.html`);
  assert.match(html, /<main\b[^>]*\bid=["']main-content["'][^>]*\bdata-hub-page\b/i,
    `${spec.title} must expose its gated game page.`);
  assert.match(html, /<section\b[^>]*\bdata-hub-lock\b[^>]*\brole=["']main["']/i,
    `${spec.title} needs a fail-closed access screen.`);
  assert.match(html, /<script\b[^>]*src=["']\.\.\/arcade-access\.js\?v=2["'][^>]*>/i,
    `${spec.title} must use the reviewed asynchronous arcade gate.`);
  assert.match(html, /data-root=["']\.\.\/\.\.\/["']/i,
    `${spec.title} must load KiddoSprout's shared access dependencies from the app root.`);
  assert.match(html, new RegExp(`data-files=["']${spec.scripts.join(",")}["']`, "i"),
    `${spec.title} must load only its reviewed game scripts after access is granted.`);
  for (const script of spec.scripts) {
    assert.equal(await isFile(`${base}/${script}`), true, `${spec.title} is missing ${script}.`);
  }
  for (const asset of spec.assets || []) {
    assert.equal(await isFile(`${base}/${asset}`), true, `${spec.title} is missing ${asset}.`);
  }
  assert.equal(await isFile(`${base}/style.css`), true, `${spec.title} is missing its stylesheet.`);
  assert.doesNotMatch(html, /<iframe\b/i, `${spec.title} must not embed an unreviewed remote game.`);
  assert.doesNotMatch(html, /<script\b[^>]*src=["'](?:engine|runner|game|music|labs|subjects)\.js/i,
    `${spec.title} must not run before the parent-access promise resolves.`);

  const executableSource = [
    html,
    await read(`${base}/style.css`),
    ...await Promise.all(spec.scripts.map((script) => read(`${base}/${script}`)))
  ].join("\n");
  const metadataUrls = spec.metadataUrls || [];
  for (const url of metadataUrls) {
    assert.equal(executableSource.split(url).length - 1, 1,
      `${spec.title} must keep its reviewed source URL as inert metadata only.`);
    assert.doesNotMatch(html, new RegExp(`["']${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
      `${spec.title} must not turn its source citation into an outbound child-facing link.`);
  }
  const networkCheckedSource = metadataUrls.reduce((source, url) => source.replaceAll(url, ""), executableSource);
  assert.doesNotMatch(networkCheckedSource, /\bhttps?:\/\//i,
    `${spec.title} must not contact an external origin.`);
  assert.doesNotMatch(executableSource, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/,
    `${spec.title} must stay self-contained without network or telemetry APIs.`);
}

const accessSource = await read("games/arcade-access.js");
assert.match(accessSource,
  /const allowed = await Promise\.resolve\(window\.KiddoHubGate\.protect\("arcade", "Sprout Arcade"\)\);/,
  "The arcade must await KiddoHubGate instead of treating its Promise as permission.");
assert.doesNotMatch(accessSource, /kiddosproutState|localStorage/i,
  "Arcade access must use the current protected family state, not a legacy browser-state shortcut.");
const protectIndex = accessSource.indexOf("KiddoHubGate.protect");
const gameLoopIndex = accessSource.indexOf("for (const file of gameFiles)");
assert.ok(protectIndex >= 0 && gameLoopIndex > protectIndex,
  "Game code must be loaded only after the access decision.");

function arcadeHarness(accessDecision) {
  const loaded = [];
  const gateCalls = [];
  let lockFocused = false;
  const classes = () => ({ add() {}, remove() {} });
  const page = { classList: classes() };
  const lock = {
    classList: classes(),
    setAttribute() {},
    focus() { lockFocused = true; }
  };
  const title = { textContent: "" };
  const detail = { textContent: "" };
  const currentScript = { dataset: { root: "../../", files: "engine.js,runner.js,game.js" } };
  const document = {
    currentScript,
    documentElement: { dataset: {} },
    body: {
      append(tag) {
        loaded.push(tag.src);
        queueMicrotask(() => tag.listeners.get("load")?.());
      }
    },
    createElement() {
      return {
        src: "",
        async: true,
        listeners: new Map(),
        addEventListener(type, listener) { this.listeners.set(type, listener); },
        remove() {}
      };
    },
    querySelector(selector) {
      return new Map([
        ["[data-hub-page]", page],
        ["[data-hub-lock]", lock],
        ["[data-lock-title]", title],
        ["[data-lock-message]", detail]
      ]).get(selector) || null;
    }
  };
  const window = {
    KIDDO_SPROUT_SUPABASE: { publicDemoOnly: true },
    KiddoSproutDemo: {},
    KiddoSproutSession: {},
    KiddoSproutFamilyState: {},
    KiddoHubGate: {
      protect(...args) {
        gateCalls.push(args);
        return accessDecision;
      }
    }
  };
  vm.runInNewContext(accessSource, { document, window, Promise, Error, queueMicrotask }, { filename: "arcade-access.js" });
  return {
    document,
    loaded,
    gateCalls,
    title,
    detail,
    lockFocused: () => lockFocused
  };
}

let allowAccess;
const pending = arcadeHarness(new Promise((resolve) => { allowAccess = resolve; }));
await new Promise((resolve) => setImmediate(resolve));
assert.deepEqual(pending.loaded, [], "A pending parent decision must not start game code.");
allowAccess(true);
await new Promise((resolve) => setImmediate(resolve));
await new Promise((resolve) => setImmediate(resolve));
assert.deepEqual(pending.gateCalls, [["arcade", "Sprout Arcade"]]);
assert.deepEqual(pending.loaded, ["engine.js", "runner.js", "game.js"],
  "An approved game must load its reviewed scripts in order.");
assert.equal(pending.document.documentElement.dataset.arcadeLoaded, "true");

const denied = arcadeHarness(Promise.resolve(false));
await new Promise((resolve) => setImmediate(resolve));
assert.deepEqual(denied.loaded, [], "A denied arcade must never execute game scripts.");

const rejected = arcadeHarness(Promise.reject(new Error("access unavailable")));
await new Promise((resolve) => setImmediate(resolve));
assert.deepEqual(rejected.loaded, [], "A failed access check must fail closed.");
assert.equal(rejected.title.textContent, "The game could not open");
assert.match(rejected.detail.textContent, /could not safely check or load/i);
assert.equal(rejected.lockFocused(), true, "The fail-closed explanation must receive keyboard focus.");

const [indexSource, appSource, workerSource] = await Promise.all([
  read("index.html"),
  read("js.js"),
  read("service-worker.js")
]);
assert.match(indexSource, /data-filter=["']play["'][^>]*aria-pressed=["']false["']/,
  "The child hub needs a Play filter for the new game library.");
assert.match(indexSource, /class=["'][^"']*hub-card arcade[^"']*["'][^>]*data-kind=["']play["'][\s\S]*?data-app-status-label=["']arcade["'][\s\S]*?data-open-app=["']arcade["']/,
  "Sprout Arcade must participate in the same parent-rule UI as other child apps.");
assert.match(appSource, /arcade:\s*\{\s*title:\s*["']Sprout Arcade["'][\s\S]*?defaultRule:\s*["']request["']/,
  "A real family must default Sprout Arcade to Ask parent.");
assert.match(appSource, /HOMEWORK_PAUSED_APP_IDS\s*=\s*new Set\(\[[^\]]*["']arcade["']/,
  "Homework Mode must pause Sprout Arcade.");
assert.match(appSource, /appRules:\s*\{[\s\S]*?arcade:\s*["']allowed["']/,
  "The fictional colleague demo should be able to tour the reviewed arcade.");
assert.match(appSource, /const hubPages\s*=\s*\{[\s\S]*?arcade:\s*["']games\/index\.html["']/,
  "Approved arcade navigation must use an explicit, portable index path.");

const workerRuntimeMatch = workerSource.match(/const KIDDOSPROUT_RUNTIME_ASSETS = (\[[\s\S]*?\]);/);
assert.ok(workerRuntimeMatch, "The service worker runtime allow-list is missing.");
const runtimeGames = JSON.parse(workerRuntimeMatch[1]).filter((path) => path.startsWith("/games/")).sort();
assert.deepEqual(runtimeGames, PUBLIC_GAME_FILES.map((path) => `/${path}`).sort(),
  "Offline runtime caching must include exactly the reviewed arcade files.");
assert.match(workerSource, /const KIDDOSPROUT_CACHE_VERSION = ["']shell-v113["']/,
  "The Language Garden release needs the v113 shell cache so older clients receive it.");
assert.deepEqual(runtimeGames.filter((path) => path.endsWith(".svg")), ["/games/multiplication-runner/map.svg"],
  "Only the reviewed Math Runner map SVG may enter the offline allow-list.");

const mathMap = await read("games/multiplication-runner/map.svg");
assert.match(mathMap, /^<svg\b[\s\S]*<\/svg>\s*$/i, "The reviewed Math Runner map must remain SVG markup.");
assert.doesNotMatch(mathMap,
  /<!DOCTYPE|<!ENTITY|<(?:script|style|foreignObject|iframe|object|embed|image|use|a)\b|\bon[a-z]+\s*=|(?:xlink:)?href\s*=|\burl\s*\(|(?:javascript|data):/i,
  "The reviewed Math Runner map must not gain executable or externally loaded SVG content.");

await buildPublicDemo();
async function collectRelativeFiles(directory, prefix = "") {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await collectRelativeFiles(new URL(`${entry.name}/`, directory), relativePath));
    else if (entry.isFile()) result.push(relativePath);
  }
  return result;
}
const publishedGames = (await collectRelativeFiles(new URL("games/", `file://${OUTPUT_DIRECTORY}/`)))
  .map((path) => `games/${path}`)
  .sort();
assert.deepEqual(publishedGames, [...PUBLIC_GAME_FILES].sort(),
  "The public colleague build must publish all and only the fifteen reviewed web games.");
assert.equal((await stat(new URL("Game%201.game", `file://${OUTPUT_DIRECTORY}/`))).isFile(), true,
  "The public build is missing the clearly labelled Mac Chess download.");

console.log("Sprout Arcade checks passed: 15 gated web games, truthful Chess download, and reviewed public/offline files.");
