import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const ASSET_DIRECTORY = join(ROOT, "assets");
export const STORY_IMAGE_MANIFEST = join(ROOT, "story-image-derivatives.json");
const SOURCE_NAME = /^(story-[a-z0-9-]+)\.(?:jpe?g)$/i;
const DERIVATIVE_NAME = /^(story-[a-z0-9-]+)-v([a-f0-9]{12})\.webp$/i;
const MAX_DERIVATIVE_BYTES = 512 * 1024;
const MANIFEST_VERSION = 1;

async function digest(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function writeManifestAtomically(manifestPath, manifest) {
  const temporaryDirectory = await mkdtemp(join(dirname(manifestPath), ".kiddosprout-story-manifest-"));
  const temporaryPath = join(temporaryDirectory, "manifest.json");
  try {
    await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o644 });
    await rename(temporaryPath, manifestPath);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function renderStoryWebp(sourcePath, outputPath) {
  await sharp(sourcePath)
    .rotate()
    .webp({ quality: 76, effort: 6, smartSubsample: true })
    .toFile(outputPath);
}

async function storyImageInventory(assetDirectory) {
  const names = (await readdir(assetDirectory)).sort();
  const sources = new Map();
  const derivatives = new Map();

  for (const name of names) {
    const source = name.match(SOURCE_NAME);
    if (source) sources.set(source[1], name);
    const derivative = name.match(DERIVATIVE_NAME);
    if (!derivative) continue;
    const items = derivatives.get(derivative[1]) || [];
    items.push({ name, expectedDigest: derivative[2].toLowerCase() });
    derivatives.set(derivative[1], items);
  }
  return { sources, derivatives };
}

export async function optimizeStoryImages({
  check = false,
  assetDirectory = ASSET_DIRECTORY,
  manifestPath = STORY_IMAGE_MANIFEST
} = {}) {
  const { sources, derivatives } = await storyImageInventory(assetDirectory);
  const problems = [];
  const manifestImages = {};
  let written = 0;
  let removed = 0;

  for (const [stem, items] of derivatives) {
    if (!sources.has(stem)) {
      if (check) {
        problems.push(`assets/${items[0].name} has no source JPEG`);
      } else {
        for (const item of items) {
          await rm(join(assetDirectory, item.name));
          removed += 1;
        }
      }
    }
  }

  for (const [stem, sourceName] of sources) {
    const existing = derivatives.get(stem) || [];
    const valid = [];
    for (const item of existing) {
      const path = join(assetDirectory, item.name);
      const actualDigest = (await digest(path)).slice(0, 12);
      const info = await stat(path);
      if (actualDigest === item.expectedDigest && info.size <= MAX_DERIVATIVE_BYTES) valid.push(item);
      else if (check) problems.push(`assets/${item.name} is stale or exceeds 512 KiB`);
    }

    const sourcePath = join(assetDirectory, sourceName);
    const sourceSha256 = await digest(sourcePath);
    const temporaryDirectory = await mkdtemp(join(assetDirectory, ".kiddosprout-image-build-"));
    const temporaryPath = join(temporaryDirectory, `${stem}.webp`);
    try {
      // Re-render even in check mode. A derivative can be internally valid yet
      // stale after its source JPEG is replaced, and a self-hash alone cannot
      // detect that mismatch.
      await renderStoryWebp(sourcePath, temporaryPath);
      const info = await stat(temporaryPath);
      if (info.size > MAX_DERIVATIVE_BYTES) {
        throw new Error(`${sourceName} remains larger than 512 KiB after WebP optimisation.`);
      }
      const derivativeSha256 = await digest(temporaryPath);
      const targetName = `${stem}-v${derivativeSha256.slice(0, 12)}.webp`;
      manifestImages[sourceName] = {
        sourceSha256,
        derivative: targetName,
        derivativeSha256
      };
      const isCurrent = existing.length === 1
        && valid.length === 1
        && existing[0].name === targetName;
      if (check) {
        if (!isCurrent) problems.push(`assets/${sourceName} needs exactly one current WebP derivative`);
        continue;
      }
      if (isCurrent) continue;
      await rename(temporaryPath, join(assetDirectory, targetName));
      written += 1;
      for (const item of existing) {
        if (item.name === targetName) continue;
        await rm(join(assetDirectory, item.name));
        removed += 1;
      }
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }

  const desiredManifest = {
    version: MANIFEST_VERSION,
    images: manifestImages
  };
  if (check) {
    try {
      const savedManifest = JSON.parse(await readFile(manifestPath, "utf8"));
      if (!isDeepStrictEqual(savedManifest, desiredManifest)) {
        problems.push("story-image-derivatives.json does not match the current source artwork");
      }
    } catch (error) {
      problems.push("story-image-derivatives.json is missing or invalid");
    }
  }

  if (problems.length) {
    throw new Error(`${problems.join("\n")}\nRun npm run optimize:story-images after adding or replacing story artwork.`);
  }
  if (!check) await writeManifestAtomically(manifestPath, desiredManifest);
  return { sources: sources.size, written, removed };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes("--check");
  const result = await optimizeStoryImages({ check });
  console.log(check
    ? `Verified ${result.sources} optimised story images.`
    : `Optimised ${result.sources} story images (${result.written} written, ${result.removed} stale removed).`);
}
