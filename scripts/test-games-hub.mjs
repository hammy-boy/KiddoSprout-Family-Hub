import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import vm from "node:vm";
import { buildPublicDemo, OUTPUT_DIRECTORY } from "./build-public-demo.mjs";

const ROOT = new URL("../", import.meta.url);
const read = (path, encoding = "utf8") => readFile(new URL(path, ROOT), encoding);
const IANA_LANGUAGE_REGISTRY_URL = "https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry";
const PRIVATE_GAME_DIRECTORIES = Object.freeze(["chess-academy"]);

const GAME_SPECS = Object.freeze([
  {
    directory: "language-garden",
    title: "Language Garden",
    group: "learning",
    scripts: ["catalogue.js", "courses.js", "tutor-engine.js", "tutor.js", "game.js"],
    loaderFiles: [
      "catalogue.js",
      "courses.js?v=words-2087",
      "tutor-engine.js?v=1",
      "tutor.js?v=1",
      "game.js?v=tutor-1"
    ],
    metadataUrls: [IANA_LANGUAGE_REGISTRY_URL]
  },
  { directory: "pattern-painter", title: "Pattern Painter", group: "learning", scripts: ["engine.js", "game.js"] },
  { directory: "melody-meadow", title: "Melody Meadow", group: "learning", scripts: ["music.js", "game.js"] },
  { directory: "compass-quest", title: "Compass Quest", group: "learning", scripts: ["engine.js", "game.js"] },
  { directory: "science-sorter", title: "Science Sorter", group: "learning", scripts: ["labs.js", "game.js"] },
  { directory: "robot-routes", title: "Robot Routes", group: "learning", scripts: ["engine.js", "game.js"] },
  { directory: "word-builder", title: "Word Builder", group: "learning", scripts: ["engine.js", "game.js"] },
  { directory: "learning-world", title: "Learning World", group: "learning", scripts: ["subjects.js", "game.js"] },
  { directory: "multiplication-runner", title: "Math Runner", group: "learning", scripts: ["engine.js", "runner.js", "game.js"], assets: ["map.svg"] },
  { directory: "racing-game", title: "Sunset Sprint", group: "arcade", scripts: ["game.js"] },
  { directory: "platformer-game", title: "Cloudbound", group: "arcade", scripts: ["engine.js", "game.js"] },
  { directory: "memory-game", title: "Little Matches", group: "arcade", scripts: ["engine.js", "game.js"] },
  { directory: "brick-breaker", title: "Prism Break", group: "arcade", scripts: ["engine.js", "game.js"] },
  { directory: "snake-game", title: "Orbit Snake", group: "arcade", scripts: ["engine.js", "game.js"] },
  { directory: "meteor-game", title: "Meteor Patrol", group: "arcade", scripts: ["engine.js", "game.js"] }
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
  [...GAME_SPECS.map(({ directory }) => directory), ...PRIVATE_GAME_DIRECTORIES].sort(),
  "The source arcade must contain the fifteen public games plus the separately reviewed private Chess Academy."
);

const chooser = await read("games/index.html");
const learningGroupStart = chooser.indexOf('id="learning-games"');
const arcadeGroupStart = chooser.indexOf('id="arcade-games"');
assert.ok(learningGroupStart >= 0 && arcadeGroupStart > learningGroupStart,
  "The chooser must place Learning Games on one side and Arcade Games on the other.");
const learningGroup = chooser.slice(learningGroupStart, arcadeGroupStart);
const arcadeGroup = chooser.slice(arcadeGroupStart);
assert.match(learningGroup, /Parent approval required/);
assert.match(arcadeGroup, /Parent approval required/);
const expectedChooserLinks = GAME_SPECS.map(({ directory }) => `${directory}/index.html`);
for (const [index, spec] of GAME_SPECS.entries()) {
  assert.match(chooser, new RegExp(`href=["']${spec.directory}/index\\.html["']`),
    `${spec.title} must be selectable from Sprout Arcade.`);
  assert.match(chooser, new RegExp(`<h3>${spec.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</h3>`),
    `${spec.title} needs its truthful chooser label.`);
  const expectedGroup = spec.group === "learning" ? learningGroup : arcadeGroup;
  assert.match(expectedGroup, new RegExp(`href=["']${spec.directory}/index\\.html["']`),
    `${spec.title} must stay in the ${spec.group} games group.`);
  const currentLink = chooser.indexOf(`href="${expectedChooserLinks[index]}"`);
  if (index > 0) {
    assert.ok(currentLink > chooser.indexOf(`href="${expectedChooserLinks[index - 1]}"`),
      "The reviewed game order changed unexpectedly.");
  }
}
assert.equal((chooser.match(/<a\b[^>]*class=["'][^"']*\bcard\b[^"']*["']/gi) || []).length, 16,
  "The chooser must contain fifteen public browser games plus the private Chess Academy.");
assert.match(
  chooser,
  /<a\b[^>]*href=["']chess-academy\/["'][^>]*>[\s\S]*?<h3>Rookavelle Chess Academy<\/h3>[\s\S]*?Includes move review, custom pieces, and practice variations/,
  "The private source chooser must open the checked-in Rookavelle Chess Academy."
);
assert.match(learningGroup, /Rookavelle Chess Academy/,
  "Chess lessons and puzzles belong with the learning games.");
assert.doesNotMatch(chooser, /href=["']\.\.\/Game%201\.game["']/,
  "The arcade card must not fall back to the obsolete Mac-only Chess download.");
assert.equal(await isFile("Game 1.game"), true, "The legacy saved Chess fixture is missing.");
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
  const loaderFiles = (spec.loaderFiles || spec.scripts).join(",")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(html, new RegExp(`data-files=["']${loaderFiles}["']`, "i"),
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
  /const allowed = await Promise\.resolve\(window\.KiddoHubGate\.protect\("arcade", accessTitle\)\);/,
  "The arcade must await KiddoHubGate instead of treating its Promise as permission.");
assert.match(accessSource, /accessTitle[^\n]+Learning & Arcade Games/,
  "The shared parent request must truthfully name both game libraries.");
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
assert.deepEqual(pending.gateCalls, [["arcade", "Learning & Arcade Games"]]);
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
assert.match(indexSource, /class=["'][^"']*hub-card learning-games[^"']*["'][^>]*data-kind=["']learn["'][\s\S]*?data-app-status-label=["']arcade["'][\s\S]*?data-open-app=["']arcade["'][^>]*data-game-section=["']learning["']/,
  "Learning Games must be the first parent-approved games choice under Learn.");
assert.match(indexSource, /class=["'][^"']*hub-card arcade[^"']*["'][^>]*data-kind=["']play["'][\s\S]*?data-app-status-label=["']arcade["'][\s\S]*?data-open-app=["']arcade["']/,
  "Arcade Games must participate in the same parent-rule UI as other child apps.");
assert.equal((indexSource.match(/data-app-status-label=["']arcade["']/g) || []).length, 2,
  "Both game-library cards must display the shared parent approval status.");
assert.match(appSource, /arcade:\s*\{\s*title:\s*["']Learning & Arcade Games["'][\s\S]*?defaultRule:\s*["']request["']/,
  "Both game libraries must default to Ask parent.");
assert.match(appSource, /HOMEWORK_PAUSED_APP_IDS\s*=\s*new Set\(\[[^\]]*["']arcade["']/,
  "Homework Mode must pause both game libraries.");
assert.match(appSource, /appRules:\s*\{[\s\S]*?arcade:\s*["']request["']/,
  "The fictional colleague demo must also ask a parent before opening either library.");
assert.match(appSource, /requestedGameSection[\s\S]*?games\/index\.html#\$\{requestedGameSection\}/,
  "Approved navigation must target the chosen learning or arcade side.");

const workerRuntimeMatch = workerSource.match(/const KIDDOSPROUT_RUNTIME_ASSETS = (\[[\s\S]*?\]);/);
assert.ok(workerRuntimeMatch, "The service worker runtime allow-list is missing.");
const runtimeGames = JSON.parse(workerRuntimeMatch[1]).filter((path) => path.startsWith("/games/")).sort();
assert.deepEqual(runtimeGames, PUBLIC_GAME_FILES.map((path) => `/${path}`).sort(),
  "Offline runtime caching must include exactly the reviewed arcade files.");
assert.match(workerSource, /const KIDDOSPROUT_CACHE_VERSION = ["']shell-v116["']/,
  "The Sprout Tutor release needs the v116 shell cache so older clients receive it.");
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
const publicChooser = await readFile(new URL("games/index.html", `file://${OUTPUT_DIRECTORY}/`), "utf8");
assert.doesNotMatch(publicChooser, /href=["']chess-academy\//,
  "The public demo must not link to the intentionally omitted private Chess Academy bundle.");
assert.match(
  publicChooser,
  /<a\b[^>]*href=["']https:\/\/davidolufunmilayo1-blip\.github\.io\/advaced-chess-academy\/["'][^>]*target=["']_blank["'][^>]*rel=["']noopener noreferrer["'][^>]*>[\s\S]*?<h3>Advaced Chess Academy<\/h3>[\s\S]*?Opens the separate Chess website/,
  "The public build must replace private Chess with the reviewed separate Academy URL."
);
await assert.rejects(
  stat(new URL("Game%201.game", `file://${OUTPUT_DIRECTORY}/`)),
  { code: "ENOENT" },
  "The public build must omit the obsolete macOS-only Chess fixture."
);

console.log("Sprout Arcade checks passed: 15 public gated games, private Rookavelle source, safe public Chess link, and reviewed offline files.");
