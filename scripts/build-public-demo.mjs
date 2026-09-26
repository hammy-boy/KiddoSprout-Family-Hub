import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, extname, join, relative } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
export const OUTPUT_DIRECTORY = join(ROOT, ".cloudflare", "public-demo");

// Keep KiddoSprout's own publication budget deliberately tighter than
// Cloudflare's platform limits. This catches an accidentally copied directory
// or unoptimised image before it makes the colleague demo slow or expensive to
// upload, even when the provider would technically accept the bundle.
const MAX_FILES = 1_000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 32 * 1024 * 1024;
const MAX_STORY_ASSET_BYTES = 512 * 1024;
const PUBLICATION_LOCK_WAIT_MS = 120_000;
const STORY_IMAGE_MANIFEST = join(ROOT, "story-image-derivatives.json");
const SHA256_HEX = /^[a-f0-9]{64}$/;

const FAMILY_HERO_ASSETS = Object.freeze([
  "family-tech-hub-v01232923b55c.avif",
  "family-tech-hub-v0fb9d85f0464.webp",
  "family-tech-hub-v5fffdb82973c.jpg"
]);

// The arcade stays on an explicit reviewed allow-list. Do not replace this
// with a recursive games/** copy: a future draft or private test game must not
// become public merely because it was added to the source directory.
const PUBLIC_GAME_FILES = Object.freeze([
  "games/index.html",
  "games/arcade-access.js",
  "games/arcade-shell.css",
  "games/language-garden/index.html",
  "games/language-garden/style.css",
  "games/language-garden/catalogue.js",
  "games/language-garden/courses.js",
  "games/language-garden/tutor-engine.js",
  "games/language-garden/tutor.js",
  "games/language-garden/game.js",
  "games/pattern-painter/index.html",
  "games/pattern-painter/style.css",
  "games/pattern-painter/engine.js",
  "games/pattern-painter/game.js",
  "games/melody-meadow/index.html",
  "games/melody-meadow/style.css",
  "games/melody-meadow/music.js",
  "games/melody-meadow/game.js",
  "games/compass-quest/index.html",
  "games/compass-quest/style.css",
  "games/compass-quest/engine.js",
  "games/compass-quest/game.js",
  "games/science-sorter/index.html",
  "games/science-sorter/style.css",
  "games/science-sorter/labs.js",
  "games/science-sorter/game.js",
  "games/robot-routes/index.html",
  "games/robot-routes/style.css",
  "games/robot-routes/engine.js",
  "games/robot-routes/game.js",
  "games/word-builder/index.html",
  "games/word-builder/style.css",
  "games/word-builder/engine.js",
  "games/word-builder/game.js",
  "games/learning-world/index.html",
  "games/learning-world/style.css",
  "games/learning-world/subjects.js",
  "games/learning-world/game.js",
  "games/brick-breaker/index.html",
  "games/brick-breaker/style.css",
  "games/brick-breaker/engine.js",
  "games/brick-breaker/game.js",
  "games/memory-game/index.html",
  "games/memory-game/style.css",
  "games/memory-game/engine.js",
  "games/memory-game/game.js",
  "games/meteor-game/index.html",
  "games/meteor-game/style.css",
  "games/meteor-game/engine.js",
  "games/meteor-game/game.js",
  "games/multiplication-runner/index.html",
  "games/multiplication-runner/style.css",
  "games/multiplication-runner/engine.js",
  "games/multiplication-runner/runner.js",
  "games/multiplication-runner/game.js",
  "games/multiplication-runner/map.svg",
  "games/platformer-game/index.html",
  "games/platformer-game/style.css",
  "games/platformer-game/engine.js",
  "games/platformer-game/game.js",
  "games/racing-game/index.html",
  "games/racing-game/style.css",
  "games/racing-game/game.js",
  "games/snake-game/index.html",
  "games/snake-game/style.css",
  "games/snake-game/engine.js",
  "games/snake-game/game.js"
]);

// This is the browser-only surface served by the Docker preview. It is an
// allow-list on purpose: adding a new server, migration, secret, installer, or
// development file to the repository can never add it to the public bundle.
export const PUBLIC_FILES = Object.freeze([
  "404.html",
  "index.html",
  "family-call.html",
  "offline.html",
  "recipe.html",
  "app_7.html",
  "blocker-setup.html",
  "creator-studio.html",
  "learning-path.html",
  "sprout-tutor.html",
  "move-breaks.html",
  "nature-explorer.html",
  "report_problem.html",
  "story-theater.html",
  "story-voices.html",
  "style.css",
  "kid-hubs.css",
  "learning-path.css",
  "sprout-tutor.css",
  "blocker-setup.css",
  "story-voices.css",
  "js.js",
  "family-calls.js",
  "family-call-app.js",
  "auth-session.js",
  "family-state-cloud.js",
  "blocker-setup.js",
  "demo-mode.js",
  "human-check.js",
  "language-packs.js",
  "language-settings.js",
  "kid-hub-gate.js",
  "learning-curriculum.js",
  "learning-path.js",
  "sprout-tutor-config.js",
  "sprout-tutor.js",
  "local-docker-redirect.js",
  "passcode-security.js",
  "recipe-cloud.js",
  "recipe-catalog-v5342473ad68b.js",
  "story-ethan-leo-data.js",
  "story-library-data.js",
  "story-voice-choice.js",
  "story-storage.js",
  "story-voices.js",
  "manifest.webmanifest",
  ...FAMILY_HERO_ASSETS,
  "kiddosprout_logo.png",
  "kiddosprout_logo_128.png",
  "kiddosprout_logo_192.png",
  "kiddosprout_blocked_1280x800.png",
  "service-worker.js",
  ...PUBLIC_GAME_FILES
]);

const IMMUTABLE_PUBLIC_JAVASCRIPT = new Set([
  "recipe-catalog-v5342473ad68b.js"
]);

// SVG stays excluded by default because it is active XML. This one map is a
// tiny, reviewed, same-origin illustration loaded through an <img>. Pin both
// its path and digest, and reject every construct that could load or execute
// content before allowing it into the colleague bundle.
const REVIEWED_PUBLIC_SVG = new Map([
  ["games/multiplication-runner/map.svg", "0462f9783982ad057c11e12e777d52ac57bafe46aece18cb3feae1bf769ac8d2"]
]);
const UNSAFE_PUBLIC_SVG = /<!DOCTYPE|<!ENTITY|<(?:script|style|foreignObject|iframe|object|embed|image|use|a)\b|\bon[a-z]+\s*=|(?:xlink:)?href\s*=|\burl\s*\(|(?:javascript|data):/i;

// Cloudflare combines headers from every matching `_headers` rule. A broad
// `/*.js` rule would therefore add `no-cache` to the immutable recipe bundle
// and to the two stricter no-store runtime scripts. Keep mutable JavaScript
// paths exact so each published script receives one unambiguous cache policy.
const MUTABLE_PUBLIC_JAVASCRIPT_CACHE_RULES = PUBLIC_FILES
  .filter((file) => extname(file).toLowerCase() === ".js")
  .filter((file) => file !== "service-worker.js" && !IMMUTABLE_PUBLIC_JAVASCRIPT.has(file))
  .map((file) => `/${file}\n  Cache-Control: no-cache, must-revalidate`)
  .join("\n\n");

// The app icons and block-page artwork keep stable URLs. Give them an explicit
// revalidation policy instead of depending on Cloudflare's current default so
// a replacement cannot remain stale in a colleague's browser after a deploy.
const MUTABLE_PUBLIC_IMAGE_CACHE_RULES = PUBLIC_FILES
  .filter((file) => extname(file).toLowerCase() === ".png")
  .map((file) => `/${file}\n  Cache-Control: no-cache, must-revalidate`)
  .join("\n\n");

// Story art is deliberately raster-only. SVG is active XML content and can
// contain scripts, links, or external-resource loads; it must never enter the
// automatically published same-origin asset collection.
const PUBLIC_ASSET_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);
const PUBLIC_STORY_ASSET_NAME = /^story-[a-z0-9-]+\.(?:avif|gif|jpe?g|png|webp)$/i;
const PUBLIC_STORY_JPEG_NAME = /^(story-[a-z0-9-]+)\.(jpe?g)$/i;
const PUBLIC_STORY_WEBP_NAME = /^(story-[a-z0-9-]+)-v([a-f0-9]{12})\.webp$/i;

const PUBLIC_CONFIG = `window.KIDDO_SPROUT_SUPABASE = Object.freeze({
  publicDemoOnly: true
});
`;

// Local development pages deliberately move browsers onto the private Docker
// stack. A published demo must never inherit that redirect: Wrangler and other
// local static previews use their own ports and must remain in demo-only mode.
const PUBLIC_LOCAL_DOCKER_REDIRECT = `// Public demo: local preview origins stay on this demo server.\n`;
const LOCAL_DOCKER_REDIRECT_TAG = /[ \t]*<script\s+src=["']local-docker-redirect\.js(?:\?v=[A-Za-z0-9._-]{1,32})?["']><\/script>[ \t]*(?:\r?\n)?/gi;
const PRIVATE_CHESS_ACADEMY_CARD = '<a class="card" href="chess-academy/"><span aria-hidden="true">♛</span><h3>Rookavelle Chess Academy</h3><p>Play chess, solve puzzles, explore lessons, and train in the Academy Lab. Includes move review, custom pieces, and practice variations.</p><b>Practise Chess →</b></a>';
const PUBLIC_CHESS_ACADEMY_CARD = '<a class="card" href="https://davidolufunmilayo1-blip.github.io/advaced-chess-academy/" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">♛</span><h3>Advaced Chess Academy</h3><p>Play chess, solve puzzles, explore lessons, and train in the Academy Lab. Opens the separate Chess website.</p><b>Practise Chess →</b></a>';
const PUBLIC_DEMO_BODY_TAG = "<body class=\"public-demo-only\">";
const PUBLIC_MINIFIED_FILES = new Map([
  ["style.css", "css"],
  ["language-settings.js", "js"]
]);
const PUBLIC_UPDATE_NOTICE_MARKER = 'function showKiddoSproutUpdateNotice(action = "activate") {';
const PUBLIC_UPDATE_NOTICE_GUARD = `${PUBLIC_UPDATE_NOTICE_MARKER}
      // A colleague preview has no private account state to protect and does
      // not need an alarming server-error panel when a browser blocks a
      // background update check. Keep real ready-to-update notices visible.
      if (PUBLIC_DEMO_ONLY && action === "retry") {
        hideKiddoSproutUpdateNotice();
        return;
      }`;

const SECURITY_HEADERS = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Permissions-Policy: camera=(self), display-capture=(self), geolocation=(), microphone=(self)
  X-Permitted-Cross-Domain-Policies: none
  Strict-Transport-Security: max-age=31536000
  Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; frame-src 'none'; worker-src 'self'; manifest-src 'self'; font-src 'self'
  X-Robots-Tag: noindex, nofollow

/
  Cache-Control: no-cache, must-revalidate

/*.html
  Cache-Control: no-cache, must-revalidate

/*.css
  Cache-Control: no-cache, must-revalidate

${MUTABLE_PUBLIC_JAVASCRIPT_CACHE_RULES}

${MUTABLE_PUBLIC_IMAGE_CACHE_RULES}

/manifest.webmanifest
  Cache-Control: no-cache, must-revalidate

/supabase-config.js
  Cache-Control: no-store, no-cache, must-revalidate, max-age=0

/service-worker.js
  Cache-Control: no-store, no-cache, must-revalidate, max-age=0

/recipe-catalog-v*
  Cache-Control: public, max-age=31536000, immutable

/family-tech-hub-v*
  Cache-Control: public, max-age=31536000, immutable

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`;

async function copyPublicFile(sourcePath, outputPath) {
  const sourceInfo = await lstat(sourcePath);
  if (!sourceInfo.isFile() || sourceInfo.isSymbolicLink()) {
    throw new Error(`Refusing non-regular public asset: ${relative(ROOT, sourcePath)}`);
  }
  if (sourceInfo.size > MAX_FILE_BYTES) {
    throw new Error(`Public asset exceeds KiddoSprout's 5 MiB publication budget: ${relative(ROOT, sourcePath)}`);
  }
  await mkdir(dirname(outputPath), { recursive: true });
  await copyFile(sourcePath, outputPath);
}

async function assertReviewedPublicSvg(relativePath, sourcePath) {
  const expectedDigest = REVIEWED_PUBLIC_SVG.get(relativePath);
  if (!expectedDigest) {
    throw new Error(`SVG is not on KiddoSprout's reviewed public allow-list: ${relativePath}`);
  }
  const source = await readFile(sourcePath);
  const text = source.toString("utf8");
  if (!/^<svg\b[\s\S]*<\/svg>\s*$/i.test(text) || UNSAFE_PUBLIC_SVG.test(text)) {
    throw new Error(`Reviewed public SVG contains unsafe or unsupported markup: ${relativePath}`);
  }
  const digest = createHash("sha256").update(source).digest("hex");
  if (digest !== expectedDigest) {
    throw new Error(`Reviewed public SVG changed and needs a fresh security review: ${relativePath}`);
  }
}

async function readStoryImageManifest(manifestPath) {
  const info = await lstat(manifestPath).catch(() => null);
  if (!info?.isFile() || info.isSymbolicLink() || info.size > 1024 * 1024) {
    throw new Error("story-image-derivatives.json is missing, unsafe, or unexpectedly large. Run npm run optimize:story-images.");
  }
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    throw new Error("story-image-derivatives.json is invalid. Run npm run optimize:story-images.", { cause: error });
  }
  if (manifest?.version !== 1
      || !manifest.images
      || typeof manifest.images !== "object"
      || Array.isArray(manifest.images)) {
    throw new Error("story-image-derivatives.json has an unsupported structure. Run npm run optimize:story-images.");
  }
  return manifest.images;
}

export async function publicStoryAssets(
  assetDirectory = join(ROOT, "assets"),
  manifestPath = STORY_IMAGE_MANIFEST
) {
  const entries = await readdir(assetDirectory, { withFileTypes: true });
  const candidateNames = entries
    .filter((entry) => entry.isFile() && !entry.isSymbolicLink())
    .filter((entry) => PUBLIC_ASSET_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .filter((entry) => PUBLIC_STORY_ASSET_NAME.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const unsupported = candidateNames.find((name) => (
    !PUBLIC_STORY_JPEG_NAME.test(name) && !PUBLIC_STORY_WEBP_NAME.test(name)
  ));
  if (unsupported) {
    throw new Error(`Public story artwork must be a source JPEG or content-addressed WebP derivative: assets/${unsupported}`);
  }

  const candidateSet = new Set(candidateNames);
  const manifestImages = await readStoryImageManifest(manifestPath);
  const replacements = new Map();
  const derivedByStem = new Map();

  for (const name of candidateNames) {
    const derived = name.match(PUBLIC_STORY_WEBP_NAME);
    if (!derived) continue;
    const [, stem, expectedDigest] = derived;
    const sourceNames = ["jpg", "jpeg"]
      .map((extension) => `${stem}.${extension}`)
      .filter((sourceName) => candidateSet.has(sourceName));
    if (!sourceNames.length) {
      throw new Error(`Public story derivative has no source artwork: assets/${name}`);
    }
    if (derivedByStem.has(stem)) {
      throw new Error(`Public story artwork has more than one WebP derivative: assets/${stem}-v*.webp`);
    }
    const bytes = await readFile(join(assetDirectory, name));
    const actualDigest = createHash("sha256").update(bytes).digest("hex");
    if (actualDigest.slice(0, 12) !== expectedDigest.toLowerCase()) {
      throw new Error(`Public story derivative filename is stale: assets/${name}`);
    }
    if (bytes.length > MAX_STORY_ASSET_BYTES) {
      throw new Error(`Public story asset exceeds the 512 KiB performance budget: assets/${name}`);
    }
    derivedByStem.set(stem, { name, digest: actualDigest });
  }

  const sourceNames = candidateNames.filter((name) => PUBLIC_STORY_JPEG_NAME.test(name));
  const expectedManifestNames = new Set(sourceNames);
  const unexpectedManifestName = Object.keys(manifestImages).find((name) => !expectedManifestNames.has(name));
  if (unexpectedManifestName) {
    throw new Error(`story-image-derivatives.json contains stale artwork: ${unexpectedManifestName}. Run npm run optimize:story-images.`);
  }

  for (const sourceName of sourceNames) {
    const [, stem] = sourceName.match(PUBLIC_STORY_JPEG_NAME);
    const sameStemSources = ["jpg", "jpeg"]
      .map((extension) => `${stem}.${extension}`)
      .filter((name) => candidateSet.has(name));
    if (sameStemSources.length !== 1) {
      throw new Error(`Public story artwork has duplicate JPEG sources for assets/${stem}`);
    }
    const derivative = derivedByStem.get(stem);
    if (!derivative) {
      throw new Error(`Public story source has no content-addressed WebP derivative: assets/${sourceName}`);
    }
    const manifestEntry = manifestImages[sourceName];
    const entryKeys = manifestEntry && typeof manifestEntry === "object" && !Array.isArray(manifestEntry)
      ? Object.keys(manifestEntry).sort().join(",")
      : "";
    if (entryKeys !== "derivative,derivativeSha256,sourceSha256"
        || !SHA256_HEX.test(manifestEntry.sourceSha256)
        || !SHA256_HEX.test(manifestEntry.derivativeSha256)
        || manifestEntry.derivative !== derivative.name
        || manifestEntry.derivativeSha256 !== derivative.digest) {
      throw new Error(`story-image-derivatives.json does not bind assets/${sourceName} to its derivative.`);
    }
    const sourceDigest = createHash("sha256")
      .update(await readFile(join(assetDirectory, sourceName)))
      .digest("hex");
    if (sourceDigest !== manifestEntry.sourceSha256) {
      throw new Error(`Public story source changed after optimisation: assets/${sourceName}. Run npm run optimize:story-images.`);
    }
    replacements.set(join("assets", sourceName), join("assets", derivative.name));
  }

  if (Object.keys(manifestImages).length !== sourceNames.length) {
    throw new Error("story-image-derivatives.json is incomplete. Run npm run optimize:story-images.");
  }

  const files = [...derivedByStem.values()]
    .map(({ name }) => join("assets", name))
    .sort();
  return { files, replacements };
}

async function measureOutput(directory) {
  let fileCount = 0;
  let totalBytes = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) {
      const child = await measureOutput(target);
      fileCount += child.fileCount;
      totalBytes += child.totalBytes;
    } else if (entry.isFile()) {
      const info = await lstat(target);
      fileCount += 1;
      totalBytes += info.size;
    }
    else throw new Error(`Unexpected non-file in public output: ${relative(directory, target)}`);
  }
  return { fileCount, totalBytes };
}

export function assertPublicationBudget({ fileCount, totalBytes }) {
  if (fileCount > MAX_FILES) {
    throw new Error(`Public demo contains ${fileCount} files; KiddoSprout's publication budget allows ${MAX_FILES}.`);
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new Error(
      `Public demo is ${(totalBytes / 1024 / 1024).toFixed(1)} MiB; KiddoSprout's publication budget allows 32 MiB.`
    );
  }
}

function processIsRunning(processId) {
  if (!Number.isSafeInteger(processId) || processId <= 0) return false;
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

async function stalePublicationLock(lockDirectory) {
  const ownerPath = join(lockDirectory, "owner.json");
  try {
    const owner = JSON.parse(await readFile(ownerPath, "utf8"));
    return !processIsRunning(Number(owner?.pid));
  } catch (error) {
    // A newly created lock may be observed just before its owner file is
    // written. Only reclaim an incomplete lock after the full wait window.
    const info = await stat(lockDirectory).catch(() => null);
    return Boolean(info && Date.now() - info.mtimeMs > PUBLICATION_LOCK_WAIT_MS);
  }
}

export async function withPublicationLock(outputDirectory, callback) {
  const lockDirectory = `${outputDirectory}.lock`;
  const ownerToken = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const deadline = Date.now() + PUBLICATION_LOCK_WAIT_MS;

  while (true) {
    try {
      await mkdir(lockDirectory);
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      if (await stalePublicationLock(lockDirectory)) {
        await rm(lockDirectory, { recursive: true, force: true });
        continue;
      }
      if (Date.now() >= deadline) {
        throw new Error("Timed out waiting for another public bundle build to finish.");
      }
      await delay(25);
      continue;
    }
    try {
      await writeFile(
        join(lockDirectory, "owner.json"),
        JSON.stringify({ pid: process.pid, token: ownerToken }),
        { mode: 0o600 }
      );
    } catch (error) {
      await rm(lockDirectory, { recursive: true, force: true });
      throw error;
    }
    break;
  }

  try {
    return await callback();
  } finally {
    const owner = await readFile(join(lockDirectory, "owner.json"), "utf8").catch(() => "");
    if (owner.includes(`"token":"${ownerToken}"`)) {
      await rm(lockDirectory, { recursive: true, force: true });
    }
  }
}

export async function replaceCompleteDirectory(
  stagingDirectory,
  outputDirectory,
  operations = { mkdtemp, rename, rm }
) {
  const backupContainer = await operations.mkdtemp(join(dirname(outputDirectory), "public-demo-previous-"));
  const backupDirectory = join(backupContainer, "bundle");
  let previousMoved = false;
  let preserveBackup = false;
  try {
    try {
      await operations.rename(outputDirectory, backupDirectory);
      previousMoved = true;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }

    try {
      await operations.rename(stagingDirectory, outputDirectory);
    } catch (replacementError) {
      if (previousMoved) {
        try {
          await operations.rename(backupDirectory, outputDirectory);
          previousMoved = false;
        } catch (restoreError) {
          // Preserve the previous complete bundle for manual recovery if even
          // the restoration rename fails.
          preserveBackup = true;
          throw new AggregateError(
            [replacementError, restoreError],
            `Public bundle replacement and recovery both failed; the previous bundle remains at ${backupDirectory}.`
          );
        }
      }
      throw replacementError;
    }
  } finally {
    if (!preserveBackup) {
      await operations.rm(backupContainer, { recursive: true, force: true });
    }
  }
}

export async function buildPublicDemo() {
  const outputParent = dirname(OUTPUT_DIRECTORY);
  await mkdir(outputParent, { recursive: true });
  let stagingDirectory = await mkdtemp(join(outputParent, "public-demo-build-"));

  try {
    const storyAssets = await publicStoryAssets();
    const files = [...PUBLIC_FILES, ...storyAssets.files];
    for (const file of files) {
      if (extname(file).toLowerCase() === ".svg") {
        await assertReviewedPublicSvg(file, join(ROOT, file));
      }
      await copyPublicFile(join(ROOT, file), join(stagingDirectory, file));
    }

    // The source pages use this synchronous head script to move accidental
    // localhost file-server visits onto the private Docker app. A published
    // demo never redirects, so remove the otherwise render-blocking request
    // while leaving local source and Docker behaviour untouched.
    for (const file of files.filter((name) => [".css", ".html", ".js"].includes(extname(name).toLowerCase()))) {
      const outputPath = join(stagingDirectory, file);
      const html = await readFile(outputPath, "utf8");
      let publicSource = extname(file).toLowerCase() === ".html"
        ? html.replace(LOCAL_DOCKER_REDIRECT_TAG, "")
        : html;
      if (file === "index.html") {
        if (!publicSource.includes("<body>")) {
          throw new Error("Public demo could not mark the dashboard as demo-only before first paint.");
        }
        publicSource = publicSource.replace("<body>", PUBLIC_DEMO_BODY_TAG);
      }
      if (file === "js.js") {
        if (!publicSource.includes(PUBLIC_UPDATE_NOTICE_MARKER)) {
          throw new Error("Public demo could not install its quiet background-update guard.");
        }
        publicSource = publicSource.replace(PUBLIC_UPDATE_NOTICE_MARKER, PUBLIC_UPDATE_NOTICE_GUARD);
      }
      // The bundled Rookavelle app has its own account/network policy and is
      // intentionally outside this account-free publication allow-list. Keep
      // the reviewed separate-site card useful instead of shipping a local
      // link to files that the safe static bundle correctly omits.
      if (file === "games/index.html") {
        if (!publicSource.includes(PRIVATE_CHESS_ACADEMY_CARD)) {
          throw new Error("Public demo could not replace the private Chess Academy card safely.");
        }
        publicSource = publicSource.replace(PRIVATE_CHESS_ACADEMY_CARD, PUBLIC_CHESS_ACADEMY_CARD);
      }
      for (const [sourceAsset, publicAsset] of storyAssets.replacements) {
        publicSource = publicSource.replaceAll(sourceAsset, publicAsset);
      }
      const minifyLoader = PUBLIC_MINIFIED_FILES.get(file);
      if (minifyLoader) {
        const minified = await transform(publicSource, {
          loader: minifyLoader,
          minify: true,
          legalComments: "none",
          target: "es2020"
        });
        publicSource = minified.code;
      }
      await writeFile(outputPath, publicSource, { mode: 0o644 });
    }

    // Never copy the developer's generated config. This constant contains no
    // endpoint, browser key, CAPTCHA key, account flag, or provider credential.
    await writeFile(join(stagingDirectory, "supabase-config.js"), PUBLIC_CONFIG, { mode: 0o644 });
    await writeFile(
      join(stagingDirectory, "local-docker-redirect.js"),
      PUBLIC_LOCAL_DOCKER_REDIRECT,
      { mode: 0o644 }
    );
    await writeFile(join(stagingDirectory, "_headers"), SECURITY_HEADERS, { mode: 0o644 });

    const { fileCount, totalBytes } = await measureOutput(stagingDirectory);
    assertPublicationBudget({ fileCount, totalBytes });

    const outputInfo = await stat(stagingDirectory);
    if (!outputInfo.isDirectory()) throw new Error("Public demo output was not created.");

    // Move the last complete bundle aside before installing the new one. If
    // that final rename fails, restore the previous bundle instead of leaving
    // Wrangler and Docker with no publication directory.
    await withPublicationLock(
      OUTPUT_DIRECTORY,
      () => replaceCompleteDirectory(stagingDirectory, OUTPUT_DIRECTORY)
    );
    stagingDirectory = "";

    console.log(`Built safe public demo: ${fileCount} files in .cloudflare/public-demo`);
    return { directory: OUTPUT_DIRECTORY, fileCount };
  } finally {
    if (stagingDirectory) await rm(stagingDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await buildPublicDemo();
}
