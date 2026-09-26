import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, relative } from "node:path";
import vm from "node:vm";
import {
  assertPublicationBudget,
  buildPublicDemo,
  OUTPUT_DIRECTORY,
  publicStoryAssets,
  replaceCompleteDirectory,
  withPublicationLock
} from "./build-public-demo.mjs";
import { optimizeStoryImages } from "./optimize-story-images.mjs";

const ROOT = new URL("../", import.meta.url);
const MAX_FILES = 1_000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 32 * 1024 * 1024;
const TEXT_EXTENSIONS = new Set(["", ".css", ".html", ".js", ".webmanifest"]);
const SAFE_PUBLIC_ASSET = /^assets\/story-[a-z0-9-]+\.(?:avif|gif|jpe?g|png|webp)$/i;
const PUBLIC_DEMO_CONTENT_SECURITY_POLICY = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-src 'none'; worker-src 'self'; manifest-src 'self'; font-src 'self'";
const DOCKER_CONTENT_SECURITY_POLICY = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://cdn.plaid.com; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co http://127.0.0.1:* ws://127.0.0.1:* http://localhost:* ws://localhost:* https://www.themealdb.com https://en.wikipedia.org https://production.plaid.com https://sandbox.plaid.com https://development.plaid.com; frame-src https://challenges.cloudflare.com https://cdn.plaid.com; worker-src 'self'; manifest-src 'self'; font-src 'self'";

async function outputFiles(directory = OUTPUT_DIRECTORY) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await outputFiles(target));
    else files.push(target);
  }
  return files.sort();
}

await optimizeStoryImages({ check: true });
await buildPublicDemo();
const files = await outputFiles();
const names = files.map((file) => relative(OUTPUT_DIRECTORY, file));

assert.ok(files.length > 100, "The story image collection was not included.");
assert.ok(files.length <= MAX_FILES, "KiddoSprout's public asset-count budget was exceeded.");

let totalBytes = 0;
for (const file of files) {
  const info = await lstat(file);
  assert.equal(info.isFile(), true, `${file} is not a regular file.`);
  assert.equal(info.isSymbolicLink(), false, `${file} must not be a symlink.`);
  assert.ok(info.size <= MAX_FILE_BYTES, `${file} exceeds KiddoSprout's 5 MiB publication budget.`);
  totalBytes += info.size;
}
assert.ok(totalBytes <= MAX_TOTAL_BYTES,
  "KiddoSprout's public bundle exceeds its 32 MiB aggregate publication budget.");
assert.throws(
  () => assertPublicationBudget({ fileCount: 100, totalBytes: MAX_TOTAL_BYTES + 1 }),
  /32 MiB/,
  "The builder accepted an aggregate bundle that exceeded its publication budget."
);

const imageWorkflowFixture = await mkdtemp(join(tmpdir(), "kiddosprout-story-images-"));
try {
  const imageWorkflowManifest = join(imageWorkflowFixture, "story-image-derivatives.json");
  await copyFile(new URL("../assets/story-living-ink-attic.jpg", import.meta.url), join(imageWorkflowFixture, "story-new-scene.jpg"));
  await assert.rejects(
    publicStoryAssets(imageWorkflowFixture, imageWorkflowManifest),
    /story-image-derivatives\.json|no content-addressed WebP derivative/,
    "The direct public builder accepted story artwork before it was optimised."
  );
  await assert.rejects(
    optimizeStoryImages({ check: true, assetDirectory: imageWorkflowFixture, manifestPath: imageWorkflowManifest }),
    /needs exactly one current WebP derivative/,
    "The release check accepted new story artwork without its optimised derivative."
  );
  await optimizeStoryImages({ assetDirectory: imageWorkflowFixture, manifestPath: imageWorkflowManifest });
  await optimizeStoryImages({ check: true, assetDirectory: imageWorkflowFixture, manifestPath: imageWorkflowManifest });
  const plannedAfterOptimising = await publicStoryAssets(imageWorkflowFixture, imageWorkflowManifest);
  assert.equal(plannedAfterOptimising.files.length, 1);
  assert.match(plannedAfterOptimising.files[0], /^assets\/story-new-scene-v[0-9a-f]{12}\.webp$/);
  assert.equal(plannedAfterOptimising.replacements.get("assets/story-new-scene.jpg"), plannedAfterOptimising.files[0]);
  await copyFile(new URL("../assets/story-living-ink-butterfly.jpg", import.meta.url), join(imageWorkflowFixture, "story-new-scene.jpg"));
  await assert.rejects(
    publicStoryAssets(imageWorkflowFixture, imageWorkflowManifest),
    /source changed after optimisation/,
    "The direct public builder accepted a derivative bound to the previous source JPEG."
  );
  await assert.rejects(
    optimizeStoryImages({ check: true, assetDirectory: imageWorkflowFixture, manifestPath: imageWorkflowManifest }),
    /needs exactly one current WebP derivative/,
    "Replacing a source JPEG must make its previously valid derivative stale."
  );
  await optimizeStoryImages({ assetDirectory: imageWorkflowFixture, manifestPath: imageWorkflowManifest });
  await optimizeStoryImages({ check: true, assetDirectory: imageWorkflowFixture, manifestPath: imageWorkflowManifest });
  await writeFile(join(imageWorkflowFixture, "story-unversioned.png"), "not publishable");
  await assert.rejects(
    publicStoryAssets(imageWorkflowFixture, imageWorkflowManifest),
    /must be a source JPEG or content-addressed WebP derivative/,
    "An unversioned public asset could inherit the immutable /assets cache policy."
  );
} finally {
  await rm(imageWorkflowFixture, { recursive: true, force: true });
}

const replacementFixture = await mkdtemp(join(tmpdir(), "kiddosprout-public-replacement-"));
try {
  const oldOutput = join(replacementFixture, "public-demo");
  const newStaging = join(replacementFixture, "staging");
  await mkdir(oldOutput);
  await mkdir(newStaging);
  await writeFile(join(oldOutput, "marker.txt"), "last complete bundle");
  await writeFile(join(newStaging, "marker.txt"), "new complete bundle");
  let injectedFailure = false;
  await assert.rejects(
    replaceCompleteDirectory(newStaging, oldOutput, {
      mkdtemp,
      rm,
      async rename(source, destination) {
        if (source === newStaging && !injectedFailure) {
          injectedFailure = true;
          const error = new Error("injected replacement failure");
          error.code = "EIO";
          throw error;
        }
        return rename(source, destination);
      }
    }),
    /injected replacement failure/
  );
  assert.equal(await readFile(join(oldOutput, "marker.txt"), "utf8"), "last complete bundle",
    "A failed final rename removed the last publishable bundle instead of restoring it.");

  let activePublishers = 0;
  let maximumActivePublishers = 0;
  await Promise.all(Array.from({ length: 3 }, () => withPublicationLock(oldOutput, async () => {
    activePublishers += 1;
    maximumActivePublishers = Math.max(maximumActivePublishers, activePublishers);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
    activePublishers -= 1;
  })));
  assert.equal(maximumActivePublishers, 1,
    "Concurrent public builders entered the output-directory replacement at the same time.");

  const staleTarget = join(replacementFixture, "stale-public-demo");
  const staleLock = `${staleTarget}.lock`;
  await mkdir(staleLock);
  await writeFile(join(staleLock, "owner.json"), JSON.stringify({ pid: Number.MAX_SAFE_INTEGER, token: "stale" }));
  let recoveredStaleLock = false;
  await withPublicationLock(staleTarget, async () => { recoveredStaleLock = true; });
  assert.equal(recoveredStaleLock, true,
    "A builder crash left a permanent publication lock instead of recovering its dead owner.");
} finally {
  await rm(replacementFixture, { recursive: true, force: true });
}

for (const required of [
  "404.html",
  "index.html",
  "family-call.html",
  "offline.html",
  "style.css",
  "js.js",
  "family-calls.js",
  "family-call-app.js",
  "family-state-cloud.js",
  "passcode-security.js",
  "demo-mode.js",
  "language-packs.js",
  "language-settings.js",
  "learning-path.html",
  "learning-path.css",
  "learning-curriculum.js",
  "learning-path.js",
  "blocker-setup.html",
  "blocker-setup.css",
  "blocker-setup.js",
  "recipe.html",
  "recipe-catalog-v5342473ad68b.js",
  "story-theater.html",
  "story-storage.js",
  "service-worker.js",
  "supabase-config.js",
  "_headers"
]) {
  assert.ok(names.includes(required), `${required} is missing from the public demo.`);
}

const forbiddenPaths = [
  ".env",
  ".git",
  "server",
  "supabase",
  "scripts",
  "mac-blocker",
  "windows-blocker",
  "kiddosprout_blocker",
  "node_modules",
  "docker-entrypoint.d",
  "app_1.html",
  "app_2.html",
  "app_3.html",
  "app_4.html",
  "app_5.html",
  "app_6.html",
  "Game 1.game",
  "kiddosprout_blocker_upload.zip"
];
for (const forbidden of forbiddenPaths) {
  assert.equal(names.some((name) => name === forbidden || name.startsWith(`${forbidden}/`)), false,
    `${forbidden} must not be published.`);
}
assert.equal(names.some((name) => /\.(?:dmg|exe|go|mjs|py|sh|sql|toml|zip)$/i.test(name)), false,
  "A source, installer, database, or archive file entered the public bundle.");
assert.equal(names.some((name) => name.startsWith("assets/") && extname(name).toLowerCase() === ".json"), false,
  "Story-production metadata must not be published.");
assert.equal(names.filter((name) => name.startsWith("assets/")).every((name) => SAFE_PUBLIC_ASSET.test(name)), true,
  "Only named story artwork may enter the public asset directory.");
const publishedSvg = names.filter((name) => /\.svg$/i.test(name));
assert.deepEqual(publishedSvg, ["games/multiplication-runner/map.svg"],
  "Only the reviewed Math Runner map SVG may enter the public bundle.");
const mathMapBytes = await readFile(join(OUTPUT_DIRECTORY, publishedSvg[0]));
const mathMapSource = mathMapBytes.toString("utf8");
assert.equal(
  createHash("sha256").update(mathMapBytes).digest("hex"),
  "0462f9783982ad057c11e12e777d52ac57bafe46aece18cb3feae1bf769ac8d2",
  "The published Math Runner map changed without a fresh security review."
);
assert.doesNotMatch(mathMapSource,
  /<!DOCTYPE|<!ENTITY|<(?:script|style|foreignObject|iframe|object|embed|image|use|a)\b|\bon[a-z]+\s*=|(?:xlink:)?href\s*=|\burl\s*\(|(?:javascript|data):/i,
  "The published Math Runner map contains executable or externally loaded SVG content.");
assert.equal(names.includes("assets/family-tech-hub.png"), false,
  "The duplicate family-tech-hub image must not inflate the public bundle.");
assert.equal(names.includes("family-tech-hub.png"), false,
  "The unoptimised home hero must not inflate the public bundle.");
assert.equal(names.includes("family-tech-hub.jpg"), false,
  "The mutable legacy home hero must not enter the public bundle.");
const heroAssets = [
  "family-tech-hub-v01232923b55c.avif",
  "family-tech-hub-v0fb9d85f0464.webp",
  "family-tech-hub-v5fffdb82973c.jpg"
];
for (const heroAsset of heroAssets) {
  assert.ok(names.includes(heroAsset), `${heroAsset} is missing from the public bundle.`);
  const heroBytes = await readFile(join(OUTPUT_DIRECTORY, heroAsset));
  assert.ok(heroBytes.length <= 200 * 1024, `${heroAsset} exceeds its 200 KiB hero budget.`);
  assert.equal(createHash("sha256").update(heroBytes).digest("hex").slice(0, 12), heroAsset.match(/-v([0-9a-f]{12})\./)?.[1],
    `${heroAsset} is not named for its content.`);
}
assert.equal((await readFile(join(OUTPUT_DIRECTORY, heroAssets[0]))).subarray(4, 12).toString("ascii"), "ftypavif",
  "The primary home hero is not a genuine AVIF file.");
assert.equal((await readFile(join(OUTPUT_DIRECTORY, heroAssets[1]))).subarray(0, 4).toString("ascii"), "RIFF",
  "The secondary home hero is not a genuine WebP file.");

const publishedStoryImages = names.filter((name) => name.startsWith("assets/story-"));
assert.ok(publishedStoryImages.length > 0, "The public bundle is missing story artwork.");
assert.equal(publishedStoryImages.every((name) => /^assets\/story-[a-z0-9-]+-v[0-9a-f]{12}\.webp$/i.test(name)), true,
  "Current story artwork must publish only as content-addressed WebP derivatives.");
for (const storyAsset of publishedStoryImages) {
  const bytes = await readFile(join(OUTPUT_DIRECTORY, storyAsset));
  assert.ok(bytes.length <= 512 * 1024, `${storyAsset} exceeds the 512 KiB story-art budget.`);
  assert.equal(createHash("sha256").update(bytes).digest("hex").slice(0, 12), storyAsset.match(/-v([0-9a-f]{12})\.webp$/)?.[1],
    `${storyAsset} is not named for its content.`);
}

const configSource = await readFile(join(OUTPUT_DIRECTORY, "supabase-config.js"), "utf8");
const configWindow = {};
vm.runInNewContext(configSource, { window: configWindow, Object });
assert.deepEqual(Object.keys(configWindow.KIDDO_SPROUT_SUPABASE), ["publicDemoOnly"]);
assert.equal(configWindow.KIDDO_SPROUT_SUPABASE.publicDemoOnly, true);

const publicRedirectSource = await readFile(join(OUTPUT_DIRECTORY, "local-docker-redirect.js"), "utf8");
assert.match(publicRedirectSource, /Public demo: local preview origins stay on this demo server/);
assert.doesNotMatch(publicRedirectSource, /(?:localhost|127\.0\.0\.1|0\.0\.0\.0|location\.(?:assign|href|replace))/i,
  "The public bundle must not redirect a local preview into the private Docker app.");

const publicOfflinePage = await readFile(join(OUTPUT_DIRECTORY, "offline.html"), "utf8");
const publicNotFoundPage = await readFile(join(OUTPUT_DIRECTORY, "404.html"), "utf8");
const publicIndexPage = await readFile(join(OUTPUT_DIRECTORY, "index.html"), "utf8");
const publicMainSource = await readFile(join(OUTPUT_DIRECTORY, "js.js"), "utf8");
const publicStyles = await readFile(join(OUTPUT_DIRECTORY, "style.css"), "utf8");
assert.match(publicIndexPage, /<body\s+class=["'][^"']*\bpublic-demo-only\b[^"']*["']>/i,
  "The public dashboard must hide account-only controls before JavaScript or network checks finish.");
assert.match(publicMainSource, /if \(PUBLIC_DEMO_ONLY && action === "retry"\) \{[\s\S]*?hideKiddoSproutUpdateNotice\(\);[\s\S]*?return;/,
  "A blocked background update check must not cover the colleague preview with an alarming retry panel.");
assert.doesNotMatch(publicStyles, /body\.demo-mode a\[data-demo-protected\][^{]*\{[^}]*text-decoration:\s*line-through/is,
  "Demo links must not use strike-through styling that makes working previews look broken.");
assert.match(publicOfflinePage, /<main\s+id="offline-content"\s+tabindex="-1">/,
  "The offline explanation needs a keyboard-focusable main destination.");
assert.match(publicOfflinePage, /id="retry-page"[\s\S]*?location\.reload\(\)/,
  "The offline retry control must retry the actual failed URL without embedding its query in markup.");
assert.doesNotMatch(publicOfflinePage, /<a\b[^>]*href\s*=\s*(["'])\s*\1/i,
  "The offline page must not contain an empty retry destination.");
assert.match(publicOfflinePage, /You may be offline, or KiddoSprout may be temporarily unavailable\./,
  "The fallback must not claim every timeout or server error means the device is offline.");
assert.match(publicOfflinePage, /\["en-GB", "es", "fr", "pt", "de"\][\s\S]*?document\.documentElement\.lang = selectedLanguage/,
  "The offline page must honour the family's saved supported language.");
assert.match(publicOfflinePage, /id="offline-home" href="\.\/">Open offline preview<\/a>/,
  "The fail-closed demo route must not be mislabeled as the family's saved private home.");
for (const [name, page] of [["offline.html", publicOfflinePage], ["404.html", publicNotFoundPage]]) {
  const rootHelper = page.match(/function kiddoSproutDeploymentRoot\(\) \{[\s\S]*?\n    \}/)?.[0];
  assert.ok(rootHelper, `${name} must recover the deployment root from a nested failed route.`);
  const deploymentRoot = new Function("navigator", "window", `
    ${rootHelper}
    return kiddoSproutDeploymentRoot;
  `);
  const fromWorker = deploymentRoot(
    { serviceWorker: { controller: { scriptURL: "https://demo.example/KiddoSprout-Family-Hub/service-worker.js" } } },
    { location: new URL("https://demo.example/KiddoSprout-Family-Hub/games/missing") }
  );
  assert.equal(fromWorker().href, "https://demo.example/KiddoSprout-Family-Hub/",
    `${name} escaped the installed service worker's project scope.`);
  const fromGitHubPath = deploymentRoot(
    { serviceWorker: { controller: null } },
    { location: new URL("https://hammy-boy.github.io/KiddoSprout-Family-Hub/games/missing") }
  );
  assert.equal(fromGitHubPath().href, "https://hammy-boy.github.io/KiddoSprout-Family-Hub/",
    `${name} resolved a nested GitHub Pages failure inside the wrong directory.`);
}
assert.match(publicMainSource, /const OFFLINE_SAFE_MODE = PUBLIC_DEMO_ONLY && SUPABASE_CONFIG\.offline === true;/,
  "The app must distinguish a network fallback from the hosted colleague demo.");
assert.match(publicMainSource, /offline\.banner\.help[\s\S]*?private family account was not opened without an online security check/,
  "The offline preview must explain why private family data was not opened.");
for (const name of names.filter((file) => extname(file).toLowerCase() === ".html")) {
  const publicHtml = await readFile(join(OUTPUT_DIRECTORY, name), "utf8");
  assert.doesNotMatch(publicHtml, /<script\s+src=["']local-docker-redirect\.js(?:\?[^"']*)?["']><\/script>/i,
    `${name} must not make the public demo wait for the no-op local redirect script.`);
  assert.doesNotMatch(publicHtml, /\b(?:href|src|action)\s*=\s*["']https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?(?:[\/"'])/i,
    `${name} must not send a colleague to a loopback-only URL.`);
}

const publicBlockerSetup = await readFile(join(OUTPUT_DIRECTORY, "blocker-setup.html"), "utf8");
const publicGamesChooser = await readFile(join(OUTPUT_DIRECTORY, "games/index.html"), "utf8");
assert.doesNotMatch(publicGamesChooser, /href=["']chess-academy\//i,
  "The public game chooser must not link to the intentionally private Chess Academy bundle.");
assert.match(
  publicGamesChooser,
  /href=["']https:\/\/davidolufunmilayo1-blip\.github\.io\/advaced-chess-academy\/["'][^>]*target=["']_blank["'][^>]*rel=["']noopener noreferrer["']/i,
  "The public game chooser must retain the reviewed separate Chess Academy destination."
);
const publicChecksumControls = [...publicBlockerSetup.matchAll(/<a\b[^>]*\bdata-live-blocker-resource\b[^>]*>/gi)];
assert.equal(publicChecksumControls.length, 2, "The public blocker guide must contain both checksum placeholders.");
for (const [control] of publicChecksumControls) {
  assert.doesNotMatch(control, /\bhref\s*=/i, "A public checksum placeholder must not have a live endpoint.");
  assert.doesNotMatch(control, /\bdownload(?:\s|=|>)/i, "A public checksum placeholder must not advertise a download.");
  assert.match(control, /\baria-disabled\s*=\s*["']true["']/i);
  assert.match(control, /\btabindex\s*=\s*["']-1["']/i);
}

const wranglerSource = await readFile(new URL("wrangler.jsonc", ROOT), "utf8");
assert.match(wranglerSource, /"not_found_handling"\s*:\s*"404-page"/,
  "Unknown public routes must return a real 404 instead of masquerading as the dashboard.");
assert.match(wranglerSource, /"html_handling"\s*:\s*"auto-trailing-slash"/,
  "Workers must serve the root index and canonical HTML routes for the colleague link.");

const secretMarkers = /(?:SUPABASE_SERVICE_ROLE|SERVICE_ROLE_KEY|TURNSTILE_SECRET|ELEVENLABS_API_KEY|SMTP_PASS|PLAID_SECRET|postgres(?:ql)?:\/\/)/i;
for (const file of files.filter((candidate) => TEXT_EXTENSIONS.has(extname(candidate)))) {
  assert.doesNotMatch(await readFile(file, "utf8"), secretMarkers, `Secret-shaped content found in ${file}.`);
}

// Compare against non-trivial local environment values without ever printing
// them. A failure reports only the variable name.
const localEnvironment = await readFile(new URL(".env", ROOT), "utf8").catch(() => "");
const localValues = localEnvironment.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (!match) return [];
  const value = match[2].trim().replace(/^(["'])(.*)\1$/, "$2");
  return value.length >= 8 ? [{ name: match[1], value }] : [];
});
for (const file of files.filter((candidate) => TEXT_EXTENSIONS.has(extname(candidate)))) {
  const source = await readFile(file, "utf8");
  for (const setting of localValues) {
    assert.equal(source.includes(setting.value), false, `${setting.name} leaked into ${relative(OUTPUT_DIRECTORY, file)}.`);
  }
}

const workerSource = await readFile(join(OUTPUT_DIRECTORY, "service-worker.js"), "utf8");
const workerScopePrelude = workerSource.slice(0, workerSource.indexOf("const KIDDOSPROUT_OFFLINE_CONFIG"));
const inspectWorkerScope = new Function("self", "URL", "Set", `
  ${workerScopePrelude}
  return {
    scopePath: KIDDOSPROUT_SCOPE_PATH,
    cachePrefix: KIDDOSPROUT_CACHE_PREFIX,
    shellCache: KIDDOSPROUT_CACHE,
    runtimeCache: KIDDOSPROUT_RUNTIME_CACHE,
    shellAssets: KIDDOSPROUT_SCOPED_ASSETS,
    runtimeAssets: KIDDOSPROUT_SCOPED_RUNTIME_ASSETS,
    logicalAssetPath
  };
`);
const projectScope = inspectWorkerScope({
  location: { origin: "https://demo.example" },
  registration: { scope: "https://demo.example/KiddoSprout-Family-Hub/" }
}, URL, Set);
assert.equal(projectScope.scopePath, "/KiddoSprout-Family-Hub/");
assert.equal(projectScope.cachePrefix, "kiddosprout-app-%2FKiddoSprout-Family-Hub%2F-");
assert.equal(projectScope.shellCache.endsWith("-shell-v115"), true);
assert.equal(projectScope.runtimeCache.endsWith("-runtime-v1"), true);
assert.equal(
  [...projectScope.shellAssets, ...projectScope.runtimeAssets]
    .every((pathname) => pathname.startsWith("/KiddoSprout-Family-Hub/")),
  true,
  "A project-scoped worker attempted to fetch an asset from the GitHub Pages account root."
);
assert.equal(
  projectScope.logicalAssetPath("/KiddoSprout-Family-Hub/assets/story-example.jpg"),
  "/assets/story-example.jpg"
);
assert.equal(projectScope.logicalAssetPath("/other-project/index.html"), "",
  "A project-scoped worker accepted a sibling GitHub Pages project's path.");
const currentCacheMatch = workerSource.match(/const KIDDOSPROUT_CACHE_VERSION = "([^"]+)";/);
assert.ok(currentCacheMatch, "Could not read the current service-worker cache name.");
const currentCacheName = `kiddosprout-app-%2F-${currentCacheMatch[1]}`;
const runtimeCacheMatch = workerSource.match(/const KIDDOSPROUT_RUNTIME_CACHE_VERSION = "([^"]+)";/);
assert.ok(runtimeCacheMatch, "Could not read the stable service-worker runtime cache name.");
const runtimeCacheName = `kiddosprout-app-%2F-${runtimeCacheMatch[1]}`;
const precacheMatch = workerSource.match(/const KIDDOSPROUT_ASSETS = (\[[\s\S]*?\]);/);
assert.ok(precacheMatch, "Could not read the service-worker precache list.");
const precache = JSON.parse(precacheMatch[1]);
const runtimeAssetsMatch = workerSource.match(/const KIDDOSPROUT_RUNTIME_ASSETS = (\[[\s\S]*?\]);/);
assert.ok(runtimeAssetsMatch, "Could not read the service-worker runtime asset list.");
const runtimeAssets = JSON.parse(runtimeAssetsMatch[1]);
let precacheBytes = 0;
for (const asset of precache) {
  const normalized = asset === "/" ? "index.html" : String(asset).replace(/^\//, "");
  assert.ok(names.includes(normalized), `Service worker references missing public asset: ${asset}`);
  precacheBytes += (await lstat(join(OUTPUT_DIRECTORY, normalized))).size;
}
for (const asset of runtimeAssets) {
  const normalized = asset === "/" ? "index.html" : String(asset).replace(/^\//, "");
  assert.ok(names.includes(normalized), `Service worker references missing runtime asset: ${asset}`);
}
for (const homeschoolAsset of [
  "/learning-path.html",
  "/learning-path.css",
  "/learning-curriculum.js",
  "/learning-path.js"
]) {
  assert.ok(runtimeAssets.includes(homeschoolAsset),
    `The Homeschool Hub runtime cache is missing ${homeschoolAsset}.`);
}
// Leave a small, explicit margin for accessibility, dashboard, and safety copy
// while keeping first-install transfer comfortably close to one MiB.
const INITIAL_OFFLINE_BUDGET_BYTES = 1.2 * 1024 * 1024;
assert.ok(precacheBytes <= INITIAL_OFFLINE_BUDGET_BYTES,
  `The initial offline install downloads ${(precacheBytes / 1024 / 1024).toFixed(1)} MiB before becoming ready.`);
for (const requiredShellAsset of [
  "/index.html",
  "/offline.html",
  "/style.css",
  "/js.js",
  "/manifest.webmanifest",
  "/kiddosprout_logo_128.png",
  "/family-tech-hub-v01232923b55c.avif",
  "/family-tech-hub-v0fb9d85f0464.webp",
  "/family-tech-hub-v5fffdb82973c.jpg"
]) {
  assert.ok(precache.includes(requiredShellAsset), `The offline app shell is missing ${requiredShellAsset}.`);
}
assert.equal(precache.some((asset) => String(asset).startsWith("/assets/story-")), false,
  "Story artwork should be cached when it is viewed, not delay every first-time install.");

const listeners = new Map();
const deletedCaches = [];
const deletedCacheEntries = [];
const cachePuts = [];
const precachedUrls = new Set();
const runtimeResponses = new Map();
let runtimeCacheRequests = [];
let globalCacheMatchCalls = 0;
let precacheRequests = [];
let skipWaitingCalls = 0;
let navigationPreloadCalls = 0;
let cachePutFailure = false;
let quotaFailuresRemaining = 0;
let runtimePutAttempts = 0;
let shellPutFailureAt = 0;
let shellPutAttempts = 0;
let invalidPrecacheAssetUrl = "";
let fetchImplementation;
const basicResponse = (body, init = {}) => {
  const { responseUrl = "", ...responseInit } = init;
  const response = new Response(body, responseInit);
  Object.defineProperty(response, "type", { value: "basic" });
  if (responseUrl) Object.defineProperty(response, "url", { value: responseUrl });
  return response;
};
const cachedContentType = (url) => {
  const pathname = new URL(url).pathname;
  if (pathname === "/" || pathname.endsWith(".html")) return "text/html";
  if (pathname.endsWith(".css")) return "text/css";
  if (pathname.endsWith(".js")) return "application/javascript";
  if (pathname.endsWith(".webmanifest")) return "application/manifest+json";
  if (pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".avif")) return "image/avif";
  if (pathname.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
};
const shellBody = (url) => {
  const pathname = new URL(url).pathname;
  if (pathname === "/offline.html") return "cached offline page";
  if (pathname === "/index.html") return "cached dashboard shell";
  if (pathname === "/style.css") return "cached stylesheet";
  return "cached asset";
};
const shellResponses = new Map();
const shellCache = {
  async put(request, response) {
    shellPutAttempts += 1;
    if (shellPutFailureAt === shellPutAttempts) {
      throw new Error("Interrupted shell cache write");
    }
    precachedUrls.add(request.url);
    shellResponses.set(request.url, response.clone());
  },
  async match(request) {
    const url = typeof request === "string" ? request : request.url;
    return shellResponses.get(url)?.clone();
  },
  async keys() {
    return [...precachedUrls].map((url) => new Request(url));
  },
  async delete(request) {
    const url = typeof request === "string" ? request : request.url;
    precachedUrls.delete(url);
    return shellResponses.delete(url);
  }
};
const runtimeCache = {
  async put(request, response) {
    runtimePutAttempts += 1;
    if (quotaFailuresRemaining > 0) {
      quotaFailuresRemaining -= 1;
      const error = new Error("Cache Storage quota reached");
      error.name = "QuotaExceededError";
      throw error;
    }
    if (cachePutFailure) throw new Error("Storage quota unavailable");
    cachePuts.push({ request, response });
    runtimeResponses.set(request.url, response.clone());
    runtimeCacheRequests = runtimeCacheRequests.filter((item) => item.url !== request.url);
    runtimeCacheRequests.push(request);
  },
  async match(request) {
    const url = typeof request === "string" ? request : request.url;
    return runtimeResponses.get(url)?.clone();
  },
  async keys() {
    return runtimeCacheRequests;
  },
  async delete(request) {
    const url = typeof request === "string" ? request : request.url;
    deletedCacheEntries.push(url);
    runtimeResponses.delete(url);
    const previousLength = runtimeCacheRequests.length;
    runtimeCacheRequests = runtimeCacheRequests.filter((item) => item.url !== url);
    return runtimeCacheRequests.length !== previousLength;
  }
};
const serviceWorkerCaches = {
  async keys() {
    return [
      "kiddosprout-app-%2F-shell-v107",
      "kiddosprout-app-%2Fother-project%2F-shell-v100",
      ...(shellResponses.size ? [currentCacheName] : []),
      runtimeCacheName,
      "another-app-cache"
    ];
  },
  async delete(key) {
    deletedCaches.push(key);
    return true;
  },
  async open(key) {
    if (key === currentCacheName) return shellCache;
    if (key === runtimeCacheName) return runtimeCache;
    throw new Error(`The worker opened an unexpected cache namespace: ${key}`);
  },
  async match() {
    globalCacheMatchCalls += 1;
    return basicResponse("foreign cache content", { headers: { "Content-Type": "text/plain" } });
  }
};
const serviceWorkerSelf = {
  location: { origin: "https://demo.example" },
  registration: {
    navigationPreload: {
      async enable() { navigationPreloadCalls += 1; }
    }
  },
  clients: { async claim() {} },
  async skipWaiting() { skipWaitingCalls += 1; },
  addEventListener(type, listener) {
    listeners.set(type, listener);
  }
};
const workerContext = vm.createContext({
  self: serviceWorkerSelf,
  caches: serviceWorkerCaches,
  fetch: (...args) => fetchImplementation(...args),
  URL,
  Request,
  Response,
  Set,
  Promise,
  Error
});
serviceWorkerSelf.crypto = webcrypto;
vm.runInContext(workerSource, workerContext, { filename: "service-worker.js" });

fetchImplementation = async (request) => {
  precacheRequests.push(request);
  const url = request.url;
  if (url === invalidPrecacheAssetUrl) {
    return basicResponse("<!doctype html><title>Wrong fallback</title>", {
      headers: { "Content-Type": "text/html" },
      responseUrl: url
    });
  }
  const pathname = new URL(url).pathname;
  const body = /-v[0-9a-f]{12}\.[a-z0-9]+$/i.test(pathname)
    ? await readFile(join(OUTPUT_DIRECTORY, pathname.slice(1)))
    : shellBody(url);
  return basicResponse(body, {
    headers: { "Content-Type": cachedContentType(url) },
    responseUrl: url
  });
};
let installation;
listeners.get("install")({ waitUntil(value) { installation = Promise.resolve(value); } });
await installation;
assert.equal(skipWaitingCalls, 0, "A new worker activated before the page offered a safe update-and-reload action.");
assert.equal(precacheRequests.length, precache.length);
assert.equal(precacheRequests.every((item) => item.cache === "reload"), true,
  "A worker update could reuse stale HTTP-cache entries while rebuilding its app shell.");
assert.equal(precacheRequests.some((item) => item.url === "https://demo.example/manifest.webmanifest"), true);

const shellBeforeInterruptedUpdate = new Map(await Promise.all(
  [...shellResponses.entries()].map(async ([url, response]) => [url, await response.clone().text()])
));
fetchImplementation = async (request) => {
  const pathname = new URL(request.url).pathname;
  const body = /-v[0-9a-f]{12}\.[a-z0-9]+$/i.test(pathname)
    ? await readFile(join(OUTPUT_DIRECTORY, pathname.slice(1)))
    : `new ${shellBody(request.url)}`;
  return basicResponse(body, {
    headers: { "Content-Type": cachedContentType(request.url) },
    responseUrl: request.url
  });
};
shellPutFailureAt = shellPutAttempts + 3;
let interruptedInstallation;
listeners.get("install")({ waitUntil(value) { interruptedInstallation = Promise.resolve(value); } });
await assert.rejects(interruptedInstallation, /interrupted shell cache write/i,
  "An interrupted app-shell write was allowed to install.");
shellPutFailureAt = 0;
for (const [url, previousBody] of shellBeforeInterruptedUpdate) {
  assert.equal(await (await shellCache.match(url)).text(), previousBody,
    `An interrupted same-version update changed the active shell entry ${url}.`);
}

fetchImplementation = async (request) => {
  precacheRequests.push(request);
  const url = request.url;
  if (url === invalidPrecacheAssetUrl) {
    return basicResponse("<!doctype html><title>Wrong fallback</title>", {
      headers: { "Content-Type": "text/html" },
      responseUrl: url
    });
  }
  const pathname = new URL(url).pathname;
  const body = /-v[0-9a-f]{12}\.[a-z0-9]+$/i.test(pathname)
    ? await readFile(join(OUTPUT_DIRECTORY, pathname.slice(1)))
    : shellBody(url);
  return basicResponse(body, {
    headers: { "Content-Type": cachedContentType(url) },
    responseUrl: url
  });
};
invalidPrecacheAssetUrl = "https://demo.example/js.js";
const shellPutsBeforeRejectedInstall = shellResponses.size;
const safeScriptBeforeRejectedInstall = await (await shellCache.match(invalidPrecacheAssetUrl)).text();
precacheRequests = [];
let invalidInstallation;
listeners.get("install")({ waitUntil(value) { invalidInstallation = Promise.resolve(value); } });
await assert.rejects(invalidInstallation, /app shell rejected \/js\.js/i,
  "An HTML edge fallback was accepted as the installed JavaScript shell.");
assert.equal(skipWaitingCalls, 0,
  "A worker with an invalid app shell was allowed to take control.");
assert.equal(shellResponses.size, shellPutsBeforeRejectedInstall,
  "A rejected same-version install changed the active shell cache.");
assert.equal(await (await shellCache.match(invalidPrecacheAssetUrl)).text(), safeScriptBeforeRejectedInstall,
  "Invalid HTML replaced the active worker's cached JavaScript before install rejection.");
invalidPrecacheAssetUrl = "";

let ignoredMessageLifetime = false;
listeners.get("message")({
  data: { type: "UNRELATED" },
  waitUntil() { ignoredMessageLifetime = true; }
});
assert.equal(ignoredMessageLifetime, false, "An unrelated client message activated the waiting worker.");
let updateMessageLifetime;
listeners.get("message")({
  data: { type: "SKIP_WAITING" },
  waitUntil(value) { updateMessageLifetime = Promise.resolve(value); }
});
await updateMessageLifetime;
assert.equal(skipWaitingCalls, 1, "The page-approved update did not activate its waiting worker.");
fetchImplementation = async () => {
  throw new Error("Network unavailable");
};

function request(url, { mode = "cors", range = null } = {}) {
  return {
    method: "GET",
    url,
    mode,
    headers: { get: (name) => name.toLowerCase() === "range" ? range : null }
  };
}

async function dispatchFetch(workerRequest, { preloadResponse = Promise.resolve(undefined) } = {}) {
  let responsePromise;
  const lifetimePromises = [];
  let eventDispatchActive = true;
  listeners.get("fetch")({
    request: workerRequest,
    preloadResponse,
    waitUntil(value) {
      assert.equal(eventDispatchActive, true,
        "The worker called waitUntil after the fetch event finished dispatching.");
      lifetimePromises.push(Promise.resolve(value));
    },
    respondWith(value) { responsePromise = Promise.resolve(value); }
  });
  eventDispatchActive = false;
  assert.ok(responsePromise, `The worker did not handle ${workerRequest.url}.`);
  const response = await responsePromise;
  await Promise.all(lifetimePromises);
  return response;
}

const acrossUpgradeRuntimeUrl = "https://demo.example/assets/story-kept-across-upgrade.jpg";
runtimeResponses.set(acrossUpgradeRuntimeUrl, basicResponse("saved story art", {
  headers: { "Content-Type": "image/jpeg" },
  responseUrl: acrossUpgradeRuntimeUrl
}));
runtimeCacheRequests.push(new Request(acrossUpgradeRuntimeUrl));
const staleRootRuntimeUrl = "https://demo.example/";
const staleShellRuntimeUrl = "https://demo.example/style.css";
const staleVersionedShellRuntimeUrl = "https://demo.example/style.css?v=old";
for (const [url, body, contentType] of [
  [staleRootRuntimeUrl, "stale dashboard", "text/html"],
  [staleShellRuntimeUrl, "stale shell styles", "text/css"],
  [staleVersionedShellRuntimeUrl, "stale versioned shell styles", "text/css"]
]) {
  runtimeResponses.set(url, basicResponse(body, {
    headers: { "Content-Type": contentType },
    responseUrl: url
  }));
  runtimeCacheRequests.push(new Request(url));
}
let activation;
listeners.get("activate")({ waitUntil(value) { activation = Promise.resolve(value); } });
await activation;
assert.deepEqual(deletedCaches, ["kiddosprout-app-%2F-shell-v107"],
  "Activation did not isolate KiddoSprout cache cleanup to this exact service-worker scope.");
assert.equal(deletedCaches.includes("kiddosprout-app-%2Fother-project%2F-shell-v100"), false,
  "Activation deleted a sibling GitHub Pages project's offline cache.");
assert.equal(deletedCaches.includes(runtimeCacheName), false,
  "A shell upgrade deleted the stable cache of pages and stories the family had opened.");
assert.equal(await (await runtimeCache.match(acrossUpgradeRuntimeUrl)).text(), "saved story art",
  "Viewed offline content did not survive a shell upgrade.");
for (const staleUrl of [staleRootRuntimeUrl, staleShellRuntimeUrl, staleVersionedShellRuntimeUrl]) {
  assert.equal(await runtimeCache.match(staleUrl), undefined,
    `A stale root or core-shell response survived activation: ${staleUrl}`);
  assert.ok(deletedCacheEntries.includes(staleUrl),
    `Activation did not explicitly remove the stale runtime response: ${staleUrl}`);
}
runtimeResponses.delete(acrossUpgradeRuntimeUrl);
runtimeCacheRequests = runtimeCacheRequests.filter((item) => item.url !== acrossUpgradeRuntimeUrl);
assert.equal(navigationPreloadCalls, 1, "Navigation preload was not enabled for faster page loads.");

const offlineConfig = await dispatchFetch(request("https://demo.example/supabase-config.js?v=7"));
assert.equal(offlineConfig.status, 200);
assert.equal(offlineConfig.headers.get("cache-control"), "no-store");
const offlineConfigText = await offlineConfig.text();
assert.match(offlineConfigText, /publicDemoOnly:\s*true/,
  "An offline config load must fail closed into the isolated public demo.");
assert.match(offlineConfigText, /offline:\s*true/,
  "The fallback config must identify its offline-safe state separately from a hosted public demo.");

fetchImplementation = async () => new Response("Missing config", { status: 503 });
const failedConfig = await dispatchFetch(request("https://demo.example/supabase-config.js?v=7"));
assert.match(await failedConfig.text(), /publicDemoOnly:\s*true/,
  "A failed config response must not let the app fall back to local family data.");

fetchImplementation = async () => basicResponse("<!doctype html><title>Not config</title>", {
  headers: { "Content-Type": "text/html" }
});
const htmlConfig = await dispatchFetch(request("https://demo.example/supabase-config.js?v=7"));
assert.match(await htmlConfig.text(), /publicDemoOnly:\s*true/,
  "An HTML fallback must never execute in place of the safety configuration.");

fetchImplementation = async () => basicResponse("window.KIDDO_SPROUT_SUPABASE = { publicDemoOnly: true };", {
  headers: { "Content-Type": "application/javascript; charset=utf-8" },
  responseUrl: "https://demo.example/supabase-config.js?v=7"
});
const validConfig = await dispatchFetch(request("https://demo.example/supabase-config.js?v=7"));
assert.match(await validConfig.text(), /KIDDO_SPROUT_SUPABASE/,
  "A valid versioned same-origin JavaScript configuration should pass through unchanged.");

fetchImplementation = async () => basicResponse("window.KIDDO_SPROUT_SUPABASE = { publicDemoOnly: false };", {
  headers: { "Content-Type": "application/javascript; charset=utf-8" },
  responseUrl: "https://demo.example/supabase-config.js?v=stale"
});
const mismatchedConfig = await dispatchFetch(request("https://demo.example/supabase-config.js?v=7"));
assert.match(await mismatchedConfig.text(), /publicDemoOnly:\s*true/,
  "A mismatched configuration response must fail closed instead of executing stale account settings.");

fetchImplementation = async () => basicResponse("network navigation", { headers: { "Content-Type": "text/html" } });
const recoveredPreload = await dispatchFetch(
  request("https://demo.example/unlisted-page", { mode: "navigate" }),
  { preloadResponse: Promise.reject(new Error("Navigation preload unavailable")) }
);
assert.equal(await recoveredPreload.text(), "network navigation",
  "A failed navigation preload prevented the ordinary network request.");

fetchImplementation = async () => basicResponse("temporary edge error", {
  status: 503,
  headers: { "Content-Type": "text/html" }
});
const recoveredKnownAsset = await dispatchFetch(request("https://demo.example/style.css"));
assert.equal(await recoveredKnownAsset.text(), "cached stylesheet",
  "A temporary edge error replaced the last valid cached stylesheet.");
const recoveredNavigationShell = await dispatchFetch(
  request("https://demo.example/temporarily-unavailable", { mode: "navigate" })
);
assert.equal(await recoveredNavigationShell.text(), "cached offline page",
  "A temporary navigation error did not fall back to the installed offline explanation.");

fetchImplementation = async () => {
  throw new Error("Network unavailable");
};
const offlineSecondaryPage = await dispatchFetch(
  request("https://demo.example/recipe.html", { mode: "navigate" })
);
assert.equal(await offlineSecondaryPage.text(), "cached offline page",
  "An uncached secondary page did not receive the offline explanation.");
const offlineDashboard = await dispatchFetch(
  request("https://demo.example/", { mode: "navigate" })
);
assert.equal(await offlineDashboard.text(), "cached dashboard shell",
  "The installed dashboard shell was not available at the app root while offline.");

fetchImplementation = async () => basicResponse("<!doctype html><title>Edge error</title>", {
  headers: { "Content-Type": "text/html" }
});
const recoveredScript = await dispatchFetch(request("https://demo.example/js.js"));
assert.equal(await recoveredScript.text(), "cached asset",
  "An HTML edge response was allowed to replace a cached KiddoSprout script.");

fetchImplementation = async () => {
  throw new Error("Network unavailable");
};
const offlineStyle = await dispatchFetch(request("https://demo.example/style.css?v=32"));
assert.equal(await offlineStyle.text(), "cached stylesheet",
  "The current release's versioned static request should use its reviewed canonical precache entry.");
const futureStyle = await dispatchFetch(request("https://demo.example/style.css?v=33"));
assert.equal(futureStyle.type, "error",
  "A newer page was allowed to run an older query-free stylesheet from the active worker.");
assert.equal(globalCacheMatchCalls, 0,
  "Offline fallback must not read a same-URL response from another application's cache.");

fetchImplementation = async () => basicResponse("versioned blocker styles", {
  headers: { "Content-Type": "text/css" },
  responseUrl: "https://demo.example/blocker-setup.css?v=5"
});
const versionedAsset = await dispatchFetch(request("https://demo.example/blocker-setup.css?v=5"));
assert.equal(await versionedAsset.text(), "versioned blocker styles");
assert.equal(cachePuts.length, 1,
  "A valid versioned runtime asset was not stored for offline use.");
assert.equal(cachePuts[0].request.url, "https://demo.example/blocker-setup.css?v=5",
  "A versioned runtime asset must not overwrite its query-free canonical entry.");
fetchImplementation = async () => basicResponse("stale blocker styles", {
  headers: { "Content-Type": "text/css" },
  responseUrl: "https://demo.example/blocker-setup.css?v=4"
});
const mismatchedVersionedAsset = await dispatchFetch(request("https://demo.example/blocker-setup.css?v=5"));
assert.equal(await mismatchedVersionedAsset.text(), "versioned blocker styles",
  "A successful response for a different query version replaced the exact verified offline release.");
fetchImplementation = async () => { throw new Error("Network unavailable"); };
const cachedVersionedAsset = await dispatchFetch(request("https://demo.example/blocker-setup.css?v=5"));
assert.equal(await cachedVersionedAsset.text(), "versioned blocker styles",
  "The exact safe version of a viewed runtime asset was not available offline.");
cachePuts.length = 0;
runtimeResponses.clear();
runtimeCacheRequests = [];

const futureCatalogueBody = "window.KIDDO_SPROUT_RECIPE_CATALOG = Object.freeze({ future: true });";
const futureCatalogueHash = createHash("sha256").update(futureCatalogueBody).digest("hex").slice(0, 12);
const futureCatalogueUrl = `https://demo.example/recipe-catalog-v${futureCatalogueHash}.js`;
fetchImplementation = async (workerRequest) => basicResponse(futureCatalogueBody, {
  headers: { "Content-Type": "application/javascript" },
  responseUrl: workerRequest.url
});
const futureCatalogue = await dispatchFetch(request(futureCatalogueUrl));
assert.equal(await futureCatalogue.text(), futureCatalogueBody);
assert.equal(runtimeResponses.has(futureCatalogueUrl), true,
  "The active worker refused to cache a future content-addressed recipe catalogue.");

fetchImplementation = async (workerRequest) => basicResponse("window.tampered = true;", {
  headers: { "Content-Type": "application/javascript" },
  responseUrl: workerRequest.url
});
const catalogueAfterTamper = await dispatchFetch(request(futureCatalogueUrl));
assert.equal(await catalogueAfterTamper.text(), futureCatalogueBody,
  "A catalogue whose bytes did not match its filename replaced the verified offline copy.");

fetchImplementation = async () => { throw new Error("Network unavailable"); };
const offlineFutureCatalogue = await dispatchFetch(request(futureCatalogueUrl));
assert.equal(await offlineFutureCatalogue.text(), futureCatalogueBody,
  "A newly visited recipe catalogue was unavailable on the next offline visit.");

const neverValidCatalogueUrl = "https://demo.example/recipe-catalog-v000000000000.js";
fetchImplementation = async (workerRequest) => basicResponse("window.notTheNamedRelease = true;", {
  headers: { "Content-Type": "application/javascript" },
  responseUrl: workerRequest.url
});
const rejectedCatalogue = await dispatchFetch(request(neverValidCatalogueUrl));
assert.equal(rejectedCatalogue.type, "error",
  "An unverified content-addressed catalogue was served when no trusted fallback existed.");
assert.equal(runtimeResponses.has(neverValidCatalogueUrl), false,
  "An unverified content-addressed catalogue entered Cache Storage.");
cachePuts.length = 0;
runtimeResponses.clear();
runtimeCacheRequests = [];

fetchImplementation = async (workerRequest) => basicResponse("fresh shell styles", {
  headers: { "Content-Type": "text/css" },
  responseUrl: workerRequest.url
});
const freshShellAsset = await dispatchFetch(request("https://demo.example/style.css?v=28"));
assert.equal(await freshShellAsset.text(), "fresh shell styles");
assert.equal(cachePuts.length, 0,
  "A core shell file was copied into the persistent runtime cache and could shadow a later update.");

fetchImplementation = async (workerRequest) => basicResponse("fresh app root", {
  headers: { "Content-Type": "text/html" },
  responseUrl: workerRequest.url
});
const freshAppRoot = await dispatchFetch(request("https://demo.example/", { mode: "navigate" }));
assert.equal(await freshAppRoot.text(), "fresh app root");
assert.equal(cachePuts.length, 0,
  "The app root entered the persistent runtime cache instead of using the versioned index shell offline.");

fetchImplementation = async () => basicResponse("current page", { headers: { "Content-Type": "text/html" } });
await dispatchFetch(request("https://demo.example/?code=sensitive-auth-code", { mode: "navigate" }));
assert.equal(cachePuts.length, 0, "A URL carrying an account callback query was written to Cache Storage.");

await dispatchFetch(request("https://demo.example/assets/story-new-scene.jpg"));
assert.equal(cachePuts.length, 0, "An HTML error page was cached as story artwork.");

fetchImplementation = async () => basicResponse("safe image bytes", { headers: { "Content-Type": "image/jpeg" } });
await dispatchFetch(request("https://demo.example/assets/story-new-scene.jpg"));
assert.equal(cachePuts.length, 1, "A safe story image was not stored for later offline reading.");
assert.equal(cachePuts[0].request.url, "https://demo.example/assets/story-new-scene.jpg");

fetchImplementation = async () => { throw new Error("Network unavailable"); };
const cachedStoryImage = await dispatchFetch(request("https://demo.example/assets/story-new-scene.jpg"));
assert.equal(await cachedStoryImage.text(), "safe image bytes",
  "A viewed story image was not available again while offline.");

const rangedStoryUrl = "https://demo.example/assets/story-ranged-scene.jpg";
runtimeResponses.set(rangedStoryUrl, basicResponse("complete cached image", {
  headers: { "Content-Type": "image/jpeg" },
  responseUrl: rangedStoryUrl
}));
runtimeCacheRequests.push(new Request(rangedStoryUrl));
fetchImplementation = async (workerRequest) => basicResponse("partial network image", {
  status: 206,
  headers: {
    "Content-Type": "image/jpeg",
    "Content-Range": "bytes 0-20/100"
  },
  responseUrl: workerRequest.url
});
const rangedStoryResponse = await dispatchFetch(request(rangedStoryUrl, { range: "bytes=0-20" }));
assert.equal(rangedStoryResponse.status, 206,
  "A valid Range response was replaced with a cached full response.");
assert.equal(await rangedStoryResponse.text(), "partial network image",
  "The worker did not pass through the server's partial asset response.");

const oldVersionedStyleUrl = "https://demo.example/blocker-setup.css?v=old";
const currentVersionedStyleUrl = "https://demo.example/blocker-setup.css?v=current";
for (const [url, body] of [
  [oldVersionedStyleUrl, "obsolete styles"],
  [currentVersionedStyleUrl, "current styles"]
]) {
  runtimeResponses.set(url, basicResponse(body, {
    headers: { "Content-Type": "text/css" },
    responseUrl: url
  }));
  runtimeCacheRequests.push(new Request(url));
}
fetchImplementation = async (workerRequest) => basicResponse("version removed", {
  status: 404,
  headers: { "Content-Type": "text/html" },
  responseUrl: workerRequest.url
});
const removedOldStyle = await dispatchFetch(request(oldVersionedStyleUrl));
assert.equal(removedOldStyle.status, 404,
  "An authoritative version-specific removal was hidden by the cached asset.");
assert.equal(runtimeResponses.has(oldVersionedStyleUrl), false,
  "The removed query-versioned asset remained in offline storage.");
assert.equal(await (await runtimeCache.match(currentVersionedStyleUrl)).text(), "current styles",
  "Removing one old query version erased a newer working offline release.");

for (const status of [403, 404, 410]) {
  const removedUrl = `https://demo.example/assets/story-removed-${status}.jpg`;
  runtimeResponses.set(removedUrl, basicResponse("stale image bytes", {
    headers: { "Content-Type": "image/jpeg" },
    responseUrl: removedUrl
  }));
  runtimeCacheRequests.push(new Request(removedUrl));
  fetchImplementation = async () => basicResponse("authoritative removal", {
    status,
    headers: { "Content-Type": "text/html" },
    responseUrl: removedUrl
  });
  const removalResponse = await dispatchFetch(request(removedUrl));
  assert.equal(removalResponse.status, status,
    `A cached asset overrode an authoritative online ${status} response.`);
  assert.equal(runtimeResponses.has(removedUrl), false,
    `An authoritative ${status} response did not evict its stale runtime entry.`);
}

fetchImplementation = async () => basicResponse("private image bytes", {
  headers: { "Cache-Control": "private, max-age=300", "Content-Type": "image/jpeg" }
});
await dispatchFetch(request("https://demo.example/assets/story-private.jpg"));
assert.equal(cachePuts.length, 1, "A private response entered the offline asset cache.");

fetchImplementation = async () => basicResponse("no-store image bytes", {
  headers: { "Cache-Control": "no-store", "Content-Type": "image/jpeg" }
});
await dispatchFetch(request("https://demo.example/assets/story-no-store.jpg"));
assert.equal(cachePuts.length, 1, "A no-store response entered the offline asset cache.");

cachePutFailure = true;
fetchImplementation = async () => basicResponse("fresh stylesheet", { headers: { "Content-Type": "text/css" } });
const responseDespiteQuotaFailure = await dispatchFetch(request("https://demo.example/style.css"));
assert.equal(await responseDespiteQuotaFailure.text(), "fresh stylesheet",
  "A Cache Storage failure replaced a successful network response.");
cachePutFailure = false;

const preservedRuntimeUrl = "https://demo.example/assets/story-preserved-scene.jpg";
runtimeResponses.set(preservedRuntimeUrl, basicResponse("previous safe image", {
  headers: { "Content-Type": "image/jpeg" }
}));
runtimeCacheRequests.push(new Request(preservedRuntimeUrl));
cachePutFailure = true;
fetchImplementation = async () => basicResponse("fresh image", { headers: { "Content-Type": "image/jpeg" } });
const freshImageDespiteQuotaFailure = await dispatchFetch(request(preservedRuntimeUrl));
assert.equal(await freshImageDespiteQuotaFailure.text(), "fresh image",
  "A failed runtime-cache refresh replaced the successful network response.");
cachePutFailure = false;
fetchImplementation = async () => { throw new Error("Network unavailable"); };
const preservedRuntimeResponse = await dispatchFetch(request(preservedRuntimeUrl));
assert.equal(await preservedRuntimeResponse.text(), "previous safe image",
  "A failed runtime-cache refresh deleted the last working offline copy.");
runtimeResponses.delete(preservedRuntimeUrl);
runtimeCacheRequests = runtimeCacheRequests.filter((item) => item.url !== preservedRuntimeUrl);

runtimeCacheRequests = [
  new Request("https://demo.example/recipe.html"),
  ...Array.from({ length: 127 }, (_, index) => (
    new Request(`https://demo.example/assets/story-cached-${String(index).padStart(3, "0")}.jpg`)
  ))
];
runtimeResponses.clear();
for (const cachedRequest of runtimeCacheRequests) {
  runtimeResponses.set(cachedRequest.url, basicResponse("previous offline content", {
    headers: { "Content-Type": cachedContentType(cachedRequest.url) },
    responseUrl: cachedRequest.url
  }));
}
const putAttemptsBeforeQuotaRecovery = runtimePutAttempts;
quotaFailuresRemaining = 1;
fetchImplementation = async () => basicResponse("newest image", { headers: { "Content-Type": "image/jpeg" } });
await dispatchFetch(request("https://demo.example/assets/story-cache-limit.jpg"));
assert.equal(runtimePutAttempts - putAttemptsBeforeQuotaRecovery, 2,
  "A full runtime cache did not reclaim one old entry and retry a quota-limited write.");
assert.equal(runtimeCacheRequests.length, 128, "The runtime cache grew beyond its bounded limit.");
assert.equal(runtimeCacheRequests.at(-1)?.url, "https://demo.example/assets/story-cache-limit.jpg");
assert.ok(deletedCacheEntries.includes("https://demo.example/assets/story-cached-000.jpg"),
  "The oldest runtime entry was not evicted after the cache reached its limit.");
assert.equal(runtimeCacheRequests.some((item) => item.url === "https://demo.example/recipe.html"), true,
  "Replaceable story art evicted an already-visited FlavorNest page from offline storage.");

fetchImplementation = async () => basicResponse("duplicate hero bytes", { headers: { "Content-Type": "image/png" } });
await dispatchFetch(request("https://demo.example/assets/family-tech-hub.png"));
assert.equal(cachePuts.length, 2,
  "The removed duplicate family-tech-hub path was still accepted by the offline asset cache.");

fetchImplementation = async () => {
  const response = basicResponse("redirected image bytes", { headers: { "Content-Type": "image/jpeg" } });
  Object.defineProperty(response, "redirected", { value: true });
  Object.defineProperty(response, "url", { value: "https://demo.example/sign-in.html" });
  return response;
};
await dispatchFetch(request("https://demo.example/assets/story-redirect.jpg"));
assert.equal(cachePuts.length, 2, "A redirected response entered the offline asset cache.");

fetchImplementation = async () => basicResponse("private", { headers: { "Content-Type": "application/json" } });
await dispatchFetch(request("https://demo.example/private-debug.json"));
assert.equal(cachePuts.length, 2, "An unknown same-origin response entered the app cache.");

const manifest = JSON.parse(await readFile(join(OUTPUT_DIRECTORY, "manifest.webmanifest"), "utf8"));
assert.equal(manifest.id, "./", "The installed-app identity must stay inside either a root deployment or a GitHub Pages project path.");
assert.equal(manifest.start_url, "./#login", "The installed app must launch inside its current deployment path.");
assert.equal(manifest.scope, "./", "The installed app must not claim another GitHub Pages project or the account root.");
assert.equal(manifest.dir, "ltr", "The manifest must declare the direction of its English metadata.");
assert.equal(manifest.orientation, "any", "The reading UI must remain usable in landscape.");
assert.deepEqual(manifest.launch_handler, { client_mode: "navigate-existing" },
  "Opening KiddoSprout again should reuse its existing installed-app window.");
assert.equal(manifest.prefer_related_applications, false,
  "The web app itself must remain the preferred installation target.");
assert.ok(manifest.categories.includes("education"), "The install metadata is missing its education category.");
assert.equal(manifest.shortcuts.every((shortcut) => Boolean(shortcut.description)), true,
  "Every installed-app shortcut needs an accessible description.");
assert.equal(manifest.icons.every((icon) => icon.purpose === "any"), true,
  "Transparent icons must not be falsely advertised as maskable artwork.");
assert.equal(manifest.icons.some((icon) => icon.src === "kiddosprout_logo_192.png" && icon.sizes === "192x192"), true,
  "Chromium installability requires a declared 192x192 app icon.");
assert.equal(manifest.icons.some((icon) => icon.src === "kiddosprout_logo.png" && icon.sizes === "512x512"), true,
  "Chromium installability requires a declared 512x512 app icon.");
for (const icon of [
  ...manifest.icons,
  ...manifest.shortcuts.flatMap((shortcut) => shortcut.icons || [])
]) {
  assert.match(icon.src, /^[a-z0-9._-]+\.png$/i, `Unsafe manifest icon path: ${icon.src}`);
  const iconFile = await readFile(join(OUTPUT_DIRECTORY, icon.src));
  assert.equal(iconFile.subarray(1, 4).toString("ascii"), "PNG", `${icon.src} is not a PNG file.`);
  const dimensions = String(icon.sizes || "").match(/^(\d+)x(\d+)$/);
  assert.ok(dimensions, `${icon.src} must declare one exact pixel size.`);
  assert.equal(iconFile.readUInt32BE(16), Number(dimensions[1]), `${icon.src} has the wrong width.`);
  assert.equal(iconFile.readUInt32BE(20), Number(dimensions[2]), `${icon.src} has the wrong height.`);
}

const headers = await readFile(join(OUTPUT_DIRECTORY, "_headers"), "utf8");
assert.match(headers, /X-Frame-Options: DENY/);
assert.match(headers, /X-Content-Type-Options: nosniff/);
assert.match(headers, /X-Robots-Tag: noindex, nofollow/);
assert.match(headers, /Cross-Origin-Opener-Policy: same-origin(?:\r?\n)/,
  "The account-free public demo should use strict same-origin opener isolation.");
assert.match(headers, /Cross-Origin-Resource-Policy: same-origin/,
  "Public assets must not be reusable as cross-origin subresources.");
assert.match(headers, /Permissions-Policy: camera=\(self\), display-capture=\(self\), geolocation=\(\), microphone=\(self\)/,
  "The public permissions policy must preserve Creator Studio media capture and deny location access.");
assert.match(headers, /X-Permitted-Cross-Domain-Policies: none/);
assert.match(headers, /Strict-Transport-Security: max-age=31536000/,
  "The HTTPS-only static deployment must advertise HSTS without affecting subdomains.");
assert.doesNotMatch(headers, /Strict-Transport-Security:[^\n]*(?:includeSubDomains|preload)/i,
  "A temporary shared hostname must never opt its parent domain or subdomains into HSTS.");
const cloudflareCsp = headers.match(/^\s*Content-Security-Policy:\s*([^\r\n]+)$/m)?.[1] || "";
assert.equal(cloudflareCsp, PUBLIC_DEMO_CONTENT_SECURITY_POLICY,
  "Cloudflare must publish the reviewed account-free demo CSP exactly.");
assert.doesNotMatch(cloudflareCsp, /(?:^|;)\s*script-src[^;]*\shttps:(?:\s|;|$)/,
  "script-src must not allow arbitrary HTTPS script origins.");
assert.doesNotMatch(cloudflareCsp, /'unsafe-eval'/,
  "The browser application never needs string-to-code evaluation.");
assert.match(cloudflareCsp, /(?:^|;)\s*connect-src 'self'(?:;|$)/,
  "The public demo must only make same-origin requests.");
assert.match(cloudflareCsp, /(?:^|;)\s*frame-src 'none'(?:;|$)/,
  "The public demo must not embed account, bank, or human-check frames.");
for (const forbiddenOrigin of [
  /(?:https|wss?):\/\/[^;\s]*supabase\.co/i,
  /(?:https|wss?):\/\/(?:127\.0\.0\.1|localhost)(?::\*)?/i,
  /https:\/\/challenges\.cloudflare\.com/i,
  /https:\/\/(?:cdn|production|sandbox|development)\.plaid\.com/i,
  /https:\/\/(?:www\.themealdb\.com|en\.wikipedia\.org)/i
]) {
  assert.doesNotMatch(cloudflareCsp, forbiddenOrigin,
    "The account-free public demo CSP granted an unused external connection.");
}
for (const htmlFile of files.filter((candidate) => extname(candidate).toLowerCase() === ".html")) {
  assert.doesNotMatch(await readFile(htmlFile, "utf8"), /<[^>]+\son[a-z]+\s*=/i,
    `${relative(OUTPUT_DIRECTORY, htmlFile)} contains an HTML event handler blocked by script-src-attr 'none'.`);
}
assert.match(headers, /\/supabase-config\.js[\s\S]*Cache-Control: no-store/);
assert.match(headers, /\n\/[\r\n]+\s+Cache-Control: no-cache, must-revalidate/,
  "Mutable public files must be revalidated so shared edits appear promptly.");
const globalHeaderBlock = headers.match(/^\/\*\r?\n([\s\S]*?)(?=\r?\n\r?\n\/)/)?.[1] || "";
assert.ok(globalHeaderBlock, "The global public security-header rule could not be parsed.");
assert.doesNotMatch(globalHeaderBlock, /Cache-Control:/,
  "The global security-header rule must not merge a second Cache-Control value into specific asset rules.");

const headerRules = headers.trim().split(/\r?\n\r?\n/).map((block) => {
  const [pattern, ...lines] = block.split(/\r?\n/);
  return {
    pattern,
    headers: lines
      .map((line) => line.trim().match(/^([^:]+):\s*(.*)$/))
      .filter(Boolean)
      .map(([, name, value]) => [name.toLowerCase(), value])
  };
});
const matchingCachePolicies = (pathname) => headerRules.flatMap(({ pattern, headers: fields }) => {
  const matcher = new RegExp(`^${pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replaceAll("*", ".*")}$`);
  if (!matcher.test(pathname)) return [];
  return fields
    .filter(([name]) => name === "cache-control")
    .map(([, value]) => value);
});
assert.deepEqual(
  matchingCachePolicies("/js.js"),
  ["no-cache, must-revalidate"],
  "Mutable JavaScript must receive exactly one revalidation policy."
);
assert.deepEqual(
  matchingCachePolicies("/service-worker.js"),
  ["no-store, no-cache, must-revalidate, max-age=0"],
  "The service worker must not inherit a second, weaker JavaScript cache policy."
);
assert.deepEqual(
  matchingCachePolicies("/supabase-config.js"),
  ["no-store, no-cache, must-revalidate, max-age=0"],
  "Browser account configuration must not inherit a second cache policy."
);
assert.deepEqual(
  matchingCachePolicies("/recipe-catalog-v5342473ad68b.js"),
  ["public, max-age=31536000, immutable"],
  "The content-addressed recipe catalogue must not also inherit no-cache."
);
for (const mutableImage of [
  "/kiddosprout_logo.png",
  "/kiddosprout_logo_128.png",
  "/kiddosprout_logo_192.png",
  "/kiddosprout_blocked_1280x800.png"
]) {
  assert.deepEqual(
    matchingCachePolicies(mutableImage),
    ["no-cache, must-revalidate"],
    `Stable-name image ${mutableImage} must be revalidated after a deploy.`
  );
}
assert.match(headers, /\/family-tech-hub-v\*[\s\S]*?Cache-Control: public, max-age=31536000, immutable/,
  "Content-addressed hero formats need a long immutable edge/browser cache.");
assert.match(headers, /\/recipe-catalog-v\*[\s\S]*?Cache-Control: public, max-age=31536000, immutable/,
  "The content-addressed recipe catalogue needs a long immutable edge/browser cache.");
assert.match(headers, /\/assets\/\*[\s\S]*?Cache-Control: public, max-age=31536000, immutable/,
  "Content-addressed story artwork needs a long immutable edge/browser cache.");
for (const rule of headers.split(/\r?\n/).filter((line) => line.startsWith("/"))) {
  assert.ok((rule.match(/\*/g) || []).length <= 1,
    `Cloudflare _headers rules support only one splat, but found: ${rule}`);
}

const [dockerIgnore, publicCompose, nginxConfig, publicDockerfile, localDockerfile, bankDockerfile, blockerDockerfile,
  voiceDockerfile, publicBuilder, localStartScript, localStopScript, readme] = await Promise.all([
  readFile(new URL(".dockerignore", ROOT), "utf8"),
  readFile(new URL("docker-compose.public.yml", ROOT), "utf8"),
  readFile(new URL("nginx.default.conf", ROOT), "utf8"),
  readFile(new URL("Dockerfile.public", ROOT), "utf8"),
  readFile(new URL("Dockerfile", ROOT), "utf8"),
  readFile(new URL("Dockerfile.bank", ROOT), "utf8"),
  readFile(new URL("Dockerfile.blocker", ROOT), "utf8"),
  readFile(new URL("Dockerfile.voice", ROOT), "utf8"),
  readFile(new URL("scripts/build-public-demo.mjs", ROOT), "utf8"),
  readFile(new URL("scripts/start-local-stack.sh", ROOT), "utf8"),
  readFile(new URL("scripts/stop-local-stack.sh", ROOT), "utf8"),
  readFile(new URL("README.md", ROOT), "utf8")
]);
assert.match(publicBuilder, /await withPublicationLock\([\s\S]*?replaceCompleteDirectory/,
  "The fixed public output must serialize cross-process replacements.");
assert.match(dockerIgnore, /^assets\/\*\.json$/m,
  "Story-production JSON must stay outside the nginx image.");
assert.match(dockerIgnore, /^\.env\*$/m,
  "Environment files must never enter a Docker build context.");
assert.match(dockerIgnore, /^docker-compose\.override\.yml$/m,
  "The generated local account override must never enter a Docker build context.");
assert.match(dockerIgnore, /^\.cloudflare\/$/m,
  "Previously generated public bundles must not bloat or contaminate a later Docker build context.");
assert.match(publicCompose, /- "assets\/\*\.json"/,
  "Public rebuilds must ignore story-production JSON.");
assert.match(publicCompose, /kiddosprout:[\s\S]*dockerfile: Dockerfile\.public/,
  "The colleague preview must use the allow-listed public image.");
assert.match(publicCompose, /^name: kiddosprout-public-preview$/m,
  "The public tunnel must not share a Docker project with the local account stack.");
assert.match(publicCompose, /ports: !reset \[\]/,
  "The public nginx service must not publish or collide with the local development port.");
assert.match(publicCompose, /cloudflared:[\s\S]*networks:[\s\S]*- web/,
  "The public connector must join only the nginx-facing network.");
assert.doesNotMatch(publicCompose, /action: sync/,
  "Public watch must not bypass the bundle allow-list by syncing into nginx.");
assert.match(publicCompose, /action: rebuild[\s\S]*scripts\/build-public-demo\.mjs/,
  "Public browser changes must rebuild through the safe bundle builder.");
assert.match(publicCompose, /ignore:[\s\S]*- "\.cloudflare\/\*\*"/,
  "Compose Watch must ignore its generated public bundle to prevent an endless rebuild loop.");
for (const setting of [
  "ELEVENLABS_API_KEY",
  "PLAID_CLIENT_ID",
  "PLAID_SECRET",
  "PLAID_REDIRECT_URI",
  "PLAID_WEBHOOK_URI",
  "BANK_TOKEN_ENCRYPTION_KEY"
]) {
  assert.match(publicCompose, new RegExp(`^\\s+${setting}: ""$`, "m"),
    `${setting} must be blanked in the public Compose overlay.`);
}
assert.match(publicCompose, /^\s+PLAID_ENV: "sandbox"$/m,
  "The public bank container must never inherit a live Plaid environment.");
assert.match(publicCompose, /blocker-api:[\s\S]*- public_blocker_data:\/data/,
  "The public blocker must not mount the local blocker data volume.");
assert.match(publicCompose, /bank-api:[\s\S]*- public_bank_data:\/data/,
  "The public bank must not mount the local bank data volume.");
assert.match(publicCompose, /cloudflare\/cloudflared:\d{4}\.\d+\.\d+/,
  "The tunnel image needs an explicit, reviewable version.");
assert.match(publicCompose, /cloudflare\/cloudflared:\d{4}\.\d+\.\d+@sha256:[0-9a-f]{64}/,
  "The tunnel image must be pinned to the reviewed immutable digest.");
assert.doesNotMatch(publicCompose, /cloudflare\/cloudflared:latest/,
  "The public connector must not silently move to an unreviewed latest image.");
assert.match(publicCompose, /cloudflared:[\s\S]*read_only: true[\s\S]*cap_drop:[\s\S]*- ALL/,
  "The public connector container must remain least-privileged.");
assert.match(publicCompose, /cloudflared:[\s\S]*restart: "on-failure:5"/,
  "A temporary tunnel needs bounded crash recovery rather than permanent auto-start.");
const cloudflaredBlock = publicCompose.slice(publicCompose.indexOf("  cloudflared:"), publicCompose.indexOf("\nvolumes:"));
assert.doesNotMatch(cloudflaredBlock, /depends_on:/,
  "Website rebuilds must not recreate the Quick Tunnel and silently change its shared URL.");
assert.match(cloudflaredBlock, /command: tunnel[^\n]*--metrics 127\.0\.0\.1:2000[^\n]*--url http:\/\/kiddosprout:80/,
  "The public connector must expose its private metrics/readiness endpoint on container loopback.");
assert.match(cloudflaredBlock,
  /healthcheck:[\s\S]*test: \["CMD", "cloudflared", "tunnel", "--metrics", "127\.0\.0\.1:2000", "ready"\]/,
  "The public connector health check must verify an active Cloudflare edge connection.");
assert.doesNotMatch(cloudflaredBlock, /--metrics (?:0\.0\.0\.0|\[::\]):2000/,
  "The connector's diagnostic endpoint must not listen on its shared Docker network.");

for (const [scriptName, scriptSource] of [
  ["local start", localStartScript],
  ["local stop", localStopScript]
]) {
  assert.match(scriptSource, /docker compose config --format json/,
    `${scriptName} must resolve the exact local Compose project before removing a legacy tunnel.`);
  assert.match(scriptSource,
    /--filter "label=com\.docker\.compose\.project=\$LOCAL_COMPOSE_PROJECT_NAME"/,
    `${scriptName} must limit cleanup to the resolved local Compose project.`);
  assert.match(scriptSource, /--filter "label=com\.docker\.compose\.service=cloudflared"/,
    `${scriptName} must limit cleanup to the cloudflared service.`);
  assert.match(scriptSource, /\[ "\$LOCAL_TUNNEL_PROJECT" != "kiddosprout-public-preview" \]/,
    `${scriptName} must explicitly preserve the separately named public preview.`);
  assert.match(scriptSource, /docker container rm --force "\$LOCAL_TUNNEL_ID"/,
    `${scriptName} must remove the exact validated orphan so it cannot restart later.`);
  assert.doesNotMatch(scriptSource, /docker compose (?:up|down)[^\n]*--remove-orphans/,
    `${scriptName} must not broadly remove unrelated Compose orphans.`);
}

assert.match(readme, /127\.0\.0\.1[^\n]*works only on the Mac[^\n]*never the colleague link/,
  "The preview instructions must distinguish a loopback URL from the public link.");
assert.match(readme, /Quick Tunnels as testing-only with no SLA or uptime guarantee/,
  "The README must not imply that an anonymous Quick Tunnel is permanent.");
assert.match(readme, /Do not print or promise one as a permanent KiddoSprout link/,
  "The README must direct stable-link users away from Quick Tunnels.");

assert.match(publicDockerfile, /RUN node scripts\/build-public-demo\.mjs/,
  "The public image must construct the strict bundle during its build.");
assert.match(publicDockerfile, /COPY --from=public-demo-builder \/src\/\.cloudflare\/public-demo\/ \/usr\/share\/nginx\/html\//,
  "Only the constructed public bundle may enter the final nginx image.");
assert.doesNotMatch(publicDockerfile, /COPY \*\.(?:html|js|css)/,
  "The public image must not broadly copy source globs into nginx.");
assert.match(blockerDockerfile, /USER node/,
  "The blocker API must run as the unprivileged node user.");
assert.match(blockerDockerfile, /chmod 0700 \/data/,
  "The blocker PIN volume must start with private directory permissions.");
for (const [name, dockerfile] of [
  ["local website", localDockerfile],
  ["public website", publicDockerfile],
  ["bank API", bankDockerfile],
  ["blocker API", blockerDockerfile],
  ["voice API", voiceDockerfile]
]) {
  const baseImages = [...dockerfile.matchAll(/^FROM\s+([^\s]+)/gm)].map((match) => match[1]);
  assert.ok(baseImages.length > 0, `${name} Dockerfile must declare a base image.`);
  for (const image of baseImages) {
    assert.match(image, /@sha256:[0-9a-f]{64}$/,
      `${name} base image must use an immutable digest instead of a moving tag.`);
  }
}

assert.match(nginxConfig, /map \$uri \$kiddosprout_cache_control \{[\s\S]*~\^\/api\/ "no-store";/,
  "Docker caching must classify normalized paths and mark every proxied API response no-store.");
assert.doesNotMatch(nginxConfig, /css\|js[^\n]*max-age=31536000/,
  "Manual CSS/JS query versions must revalidate because their tokens are not content hashes.");
assert.match(nginxConfig, /"~\^\/\(\?:recipe-catalog-v[\s\S]*?family-tech-hub-v[\s\S]*?immutable/,
  "Content-addressed code and image derivatives need one quoted, immutable Docker cache rule.");
assert.match(nginxConfig, /recipe-catalog-v\[0-9a-f\]\{12\}\\\.js[\s\S]*?immutable/,
  "The content-addressed recipe catalogue needs an immutable Docker cache rule.");
assert.doesNotMatch(nginxConfig, /^\s*~[^"\n]*\{\d+(?:,\d*)?\}/m,
  "Nginx regular expressions containing repetition braces must be quoted as one config token.");
assert.match(nginxConfig, /map \$uri \$kiddosprout_referrer_policy \{[\s\S]*default "strict-origin-when-cross-origin";[\s\S]*~\^\/api\/ "no-referrer";/,
  "Sensitive API responses must not create outbound referrers.");
assert.match(nginxConfig, /add_header Cache-Control \$kiddosprout_cache_control always;/,
  "Docker responses need one inherited cache policy.");
assert.match(nginxConfig, /add_header Referrer-Policy \$kiddosprout_referrer_policy always;/,
  "Docker responses must use the route-aware referrer policy.");
for (const upstreamHeader of [
  "Cache-Control",
  "Pragma",
  "Referrer-Policy",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Cross-Origin-Resource-Policy",
  "Content-Security-Policy"
]) {
  assert.match(nginxConfig, new RegExp(`proxy_hide_header ${upstreamHeader};`),
    `${upstreamHeader} must not be duplicated between an internal API and nginx.`);
}
const proxyLocations = [...nginxConfig.matchAll(/location = (\/api\/[^\s{]+) \{([\s\S]*?)\n  \}/g)];
assert.ok(proxyLocations.length >= 10, "The public API proxy locations could not be audited.");
for (const [, pathname, block] of proxyLocations) {
  for (const headerName of ["Authorization", "X-Forwarded-For", "X-Forwarded-Proto"]) {
    const occurrences = (block.match(new RegExp(`proxy_set_header ${headerName}\\b`, "g")) || []).length;
    assert.ok(occurrences <= 1, `${pathname} sets ${headerName} more than once.`);
  }
}
assert.match(nginxConfig, /map \$kiddosprout_forwarded_proto \$kiddosprout_hsts \{[\s\S]*default "";[\s\S]*https "max-age=31536000";[\s\S]*\}/,
  "Docker must emit HSTS only when the browser-facing request used HTTPS.");
assert.match(nginxConfig, /add_header Strict-Transport-Security \$kiddosprout_hsts always;/,
  "The conditional HSTS policy is not attached to nginx responses.");
assert.doesNotMatch(nginxConfig, /Strict-Transport-Security[^\n]*(?:includeSubDomains|preload)/i,
  "Temporary public hosts must never set parent-domain HSTS options.");
assert.match(nginxConfig, /add_header Cross-Origin-Opener-Policy "same-origin-allow-popups" always;/,
  "Docker needs OAuth and Plaid-compatible opener isolation.");
assert.match(nginxConfig, /add_header Cross-Origin-Resource-Policy "same-origin" always;/,
  "Docker assets must not be reusable as cross-origin subresources.");
assert.match(nginxConfig, /add_header Permissions-Policy "camera=\(self\), display-capture=\(self\), geolocation=\(\), microphone=\(self\)" always;/,
  "Docker must preserve Creator Studio media capture while denying location access.");
assert.match(nginxConfig, /add_header X-Permitted-Cross-Domain-Policies "none" always;/);
assert.ok(nginxConfig.includes(`default "${DOCKER_CONTENT_SECURITY_POLICY}";`),
  "Docker must use the exact reviewed static browser CSP.");
assert.match(nginxConfig, /map \$uri \$kiddosprout_content_security_policy \{[\s\S]*~\^\/api\/ "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";/,
  "Docker needs a browser-compatible static CSP and a stricter non-executable API policy.");
assert.match(nginxConfig, /add_header Content-Security-Policy \$kiddosprout_content_security_policy always;/,
  "The route-aware CSP must apply to every nginx response.");
assert.match(nginxConfig, /gzip on;[\s\S]*gzip_proxied any;[\s\S]*gzip_types text\/css application\/javascript application\/manifest\+json image\/svg\+xml;/,
  "Static pages and browser assets should be compressed through the public tunnel.");
assert.doesNotMatch(nginxConfig, /gzip_types[^;]*application\/json/,
  "Sensitive API JSON must stay outside the static compression allow-list.");
assert.equal((nginxConfig.match(/add_header Cache-Control/g) || []).length, 1,
  "Location-specific cache headers would drop inherited security headers in nginx.");
const safeLogFormat = nginxConfig.match(/log_format kiddosprout_safe ([^;]+);/)?.[1] || "";
assert.ok(safeLogFormat, "nginx needs a privacy-safe access log format.");
assert.match(safeLogFormat, /\$request_method \$uri \$server_protocol/);
assert.doesNotMatch(safeLogFormat, /\$(?:request|args|query_string|http_referer)\b/,
  "Access logs must not retain callback tokens or sensitive query strings.");
assert.match(nginxConfig, /location = \/healthz \{[\s\S]*return 204;/,
  "Container health checks need a side-effect-free endpoint.");
assert.match(nginxConfig, /location = \/_headers \{[\s\S]*return 404;/,
  "Cloudflare uploader metadata must not be served by Docker nginx.");
assert.match(nginxConfig, /location = \/manifest\.webmanifest \{[\s\S]*default_type application\/manifest\+json;[\s\S]*try_files \$uri =404;/,
  "nginx must serve the install manifest as application/manifest+json while nosniff is enabled.");
assert.match(nginxConfig, /error_page 404 \/404\.html;/,
  "Docker and the permanent Worker should return the same clear KiddoSprout 404 experience.");
assert.match(nginxConfig, /location ~\* \\.json\$[\s\S]*return 404;/,
  "nginx must refuse production metadata even if a stale image still contains it.");

const wrangler = JSON.parse(await readFile(new URL("wrangler.jsonc", ROOT), "utf8"));
assert.equal(wrangler.name, "kiddosprout", "The permanent Worker must use the KiddoSprout product name.");
assert.equal(wrangler.assets.directory, "./.cloudflare/public-demo");
assert.equal(wrangler.assets.not_found_handling, "404-page",
  "The permanent Worker must return 404.html with a 404 status for unknown pages and API routes.");
assert.equal(wrangler.assets.html_handling, "auto-trailing-slash",
  "The permanent colleague link must serve the root index and canonical HTML routes.");
assert.equal(wrangler.workers_dev, true);
assert.equal(wrangler.preview_urls, false, "Only the stable production workers.dev route should be enabled.");
assert.equal(Object.hasOwn(wrangler, "main"), false, "The demo should be static-only with no Worker backend.");

const packageJson = JSON.parse(await readFile(new URL("package.json", ROOT), "utf8"));
assert.equal(packageJson.scripts.deploy, "npm run deploy:public-demo",
  "The standard deploy command must route through the guarded KiddoSprout deployment.");
assert.equal(packageJson.scripts["deploy:public-demo"], "npm run test:public-demo-build && wrangler deploy",
  "Permanent deployment must rebuild and validate the safe public bundle before upload.");
assert.equal(packageJson.scripts["check:public-demo-deploy"], "npm run test:public-demo-build && wrangler deploy --dry-run",
  "The deployment preflight must run the same safe build before Wrangler's dry run.");
assert.equal(Object.values(packageJson.scripts).some((script) => /wrangler deploy\s+--temporary(?:\s|$)/.test(script)), false,
  "Wrangler 4 no longer supports the old --temporary deploy flag.");

console.log("Public demo build safety passed: demo-only config, complete runtime assets, no secrets/backends/installers, and guarded permanent deployment.");
