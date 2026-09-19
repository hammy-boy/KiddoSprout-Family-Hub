import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { buildPublicDemo, OUTPUT_DIRECTORY } from "./build-public-demo.mjs";

const PUBLIC_HTML = [
  "404.html",
  "index.html",
  "offline.html",
  "recipe.html",
  "app_7.html",
  "blocker-setup.html",
  "creator-studio.html",
  "games/index.html",
  "games/pattern-painter/index.html",
  "games/melody-meadow/index.html",
  "games/compass-quest/index.html",
  "games/science-sorter/index.html",
  "games/robot-routes/index.html",
  "games/word-builder/index.html",
  "games/learning-world/index.html",
  "games/brick-breaker/index.html",
  "games/memory-game/index.html",
  "games/meteor-game/index.html",
  "games/multiplication-runner/index.html",
  "games/platformer-game/index.html",
  "games/racing-game/index.html",
  "games/snake-game/index.html",
  "move-breaks.html",
  "nature-explorer.html",
  "report_problem.html",
  "story-theater.html",
  "story-voices.html"
];
const PUBLIC_CSS = [
  "style.css",
  "kid-hubs.css",
  "blocker-setup.css",
  "games/arcade-shell.css",
  "games/pattern-painter/style.css",
  "games/melody-meadow/style.css",
  "games/compass-quest/style.css",
  "games/science-sorter/style.css",
  "games/robot-routes/style.css",
  "games/word-builder/style.css",
  "games/learning-world/style.css",
  "games/brick-breaker/style.css",
  "games/memory-game/style.css",
  "games/meteor-game/style.css",
  "games/multiplication-runner/style.css",
  "games/platformer-game/style.css",
  "games/racing-game/style.css",
  "games/snake-game/style.css",
  "story-voices.css"
];
const STORY_DATA = ["story-library-data.js", "story-ethan-leo-data.js"];
const VIRTUAL_INDEX_ROUTES = new Set(["login", "signup", "parent", "child"]);
const LOCAL_ORIGIN = "https://public-link-check.invalid";
const virtualStoryRoutes = new Set();

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function isDynamic(value) {
  return /\$\{|\{\{|<%/.test(value);
}

function isIgnoredScheme(value) {
  return /^(?:data|blob|mailto|tel|javascript):/i.test(value) || value.startsWith("//");
}

function fileNameForUrl(url) {
  const decodedPath = decodeURIComponent(url.pathname);
  if (decodedPath === "/" || decodedPath.endsWith("/")) return `${decodedPath}index.html`.replace(/^\//, "");
  return decodedPath.replace(/^\//, "");
}

async function exists(path) {
  try {
    return (await stat(path)).isFile();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function htmlIds(source, file) {
  const ids = new Map();
  for (const match of source.matchAll(/\bid\s*=\s*(["'])([^"']+)\1/gi)) {
    const id = match[2];
    const locations = ids.get(id) || [];
    locations.push(`${file}:${lineNumber(source, match.index)}`);
    ids.set(id, locations);
  }
  return ids;
}

function staticAttributeReferences(source) {
  const references = [];
  for (const match of source.matchAll(/\b(src|href|poster)\s*=\s*(["'])(.*?)\2/gis)) {
    references.push({
      attribute: match[1].toLowerCase(),
      value: match[3].trim(),
      index: match.index
    });
  }
  return references;
}

function attributeValue(openingTag, name) {
  const escapedName = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return openingTag.match(new RegExp(`\\b${escapedName}\\s*=\\s*(["'])(.*?)\\1`, "i"))?.[2] || "";
}

function cssReferences(source) {
  const references = [];
  for (const match of source.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gis)) {
    references.push({ value: match[2].trim(), index: match.index });
  }
  return references;
}

async function assertLocalReference({ sourceFile, source, value, index, idsByFile, allowApi = true }) {
  if (!value || isDynamic(value) || isIgnoredScheme(value)) return;
  const baseUrl = new URL(`/${sourceFile}`, LOCAL_ORIGIN);
  const target = new URL(value, baseUrl);
  if (target.origin !== LOCAL_ORIGIN) return;
  if (allowApi && target.pathname.startsWith("/api/")) return;

  const targetFile = fileNameForUrl(target);
  const label = `${sourceFile}:${lineNumber(source, index)} (${value})`;
  assert.equal(
    await exists(join(OUTPUT_DIRECTORY, targetFile)),
    true,
    `Public page references a missing local file at ${label}`
  );

  if (!target.hash || extname(targetFile).toLowerCase() !== ".html") return;
  const fragment = decodeURIComponent(target.hash.slice(1));
  if (targetFile === "index.html" && VIRTUAL_INDEX_ROUTES.has(fragment)) return;
  if (targetFile === "story-theater.html" && virtualStoryRoutes.has(fragment)) return;
  assert.equal(
    idsByFile.get(targetFile)?.has(fragment),
    true,
    `Public link points to a missing section at ${label}`
  );
}

await buildPublicDemo();

for (const file of ["story-theater.html", ...STORY_DATA]) {
  const source = await readFile(join(OUTPUT_DIRECTORY, file), "utf8");
  for (const match of source.matchAll(/(?:\bid|["']id["'])\s*:\s*["']([^"']+)["']/gi)) {
    virtualStoryRoutes.add(`story-${match[1]}`);
  }
}

const idsByFile = new Map();
const htmlSources = new Map();
for (const file of PUBLIC_HTML) {
  const source = await readFile(join(OUTPUT_DIRECTORY, file), "utf8");
  const ids = htmlIds(source, file);
  const duplicateIds = [...ids.entries()].filter(([, locations]) => locations.length > 1);
  assert.deepEqual(
    duplicateIds,
    [],
    `Duplicate IDs found in ${file}: ${duplicateIds.map(([id, locations]) => `${id} (${locations.join(", ")})`).join("; ")}`
  );
  idsByFile.set(file, new Set(ids.keys()));
  htmlSources.set(file, source);
}

for (const [file, source] of htmlSources) {
  const bodyStart = source.match(/<body\b[^>]*>\s*/i);
  const skipLinks = [...source.matchAll(/<a\b[^>]*\bclass\s*=\s*(["'])[^"']*\bskip-link\b[^"']*\1[^>]*>/gi)];
  assert.equal(skipLinks.length, 1, `${file} must have exactly one keyboard skip link.`);
  assert.equal(
    skipLinks[0].index,
    (bodyStart?.index || 0) + (bodyStart?.[0].length || 0),
    `${file} keyboard skip link must be the first element inside body.`
  );
  const skipTargetId = attributeValue(skipLinks[0][0], "href").replace(/^#/, "");
  assert.ok(skipTargetId, `${file} keyboard skip link must point to a local target.`);
  const targetOpening = [...source.matchAll(/<main\b[^>]*>/gi)]
    .find((match) => attributeValue(match[0], "id") === skipTargetId)?.[0] || "";
  assert.ok(targetOpening, `${file} keyboard skip link must point to its main element.`);
  assert.equal(
    attributeValue(targetOpening, "tabindex"),
    "-1",
    `${file} skip target must accept programmatic focus.`
  );

  for (const reference of staticAttributeReferences(source)) {
    assert.notEqual(
      reference.value,
      "",
      `Empty ${reference.attribute} found at ${file}:${lineNumber(source, reference.index)}`
    );
    if (reference.attribute === "href") {
      assert.notEqual(
        reference.value,
        "#",
        `Anchor points nowhere at ${file}:${lineNumber(source, reference.index)}`
      );
      assert.doesNotMatch(
        reference.value,
        /^javascript:/i,
        `Anchor uses a script URL instead of a destination at ${file}:${lineNumber(source, reference.index)}`
      );
    }
    await assertLocalReference({ sourceFile: file, source, ...reference, idsByFile });
  }

  for (const match of source.matchAll(/<a\b([^>]*)>/gis)) {
    const isInertBlockerResource = file === "blocker-setup.html"
      && /\bdata-live-blocker-resource\b/i.test(match[1]);
    if (isInertBlockerResource) {
      assert.doesNotMatch(
        match[1],
        /\bhref\s*=/i,
        `Protected blocker resource is live before JavaScript at ${file}:${lineNumber(source, match.index)}`
      );
      assert.match(match[1], /\baria-disabled\s*=\s*(["'])true\1/i);
      assert.match(match[1], /\btabindex\s*=\s*(["'])-1\1/i);
      continue;
    }
    assert.match(
      match[1],
      /\bhref\s*=/i,
      `Anchor has no destination at ${file}:${lineNumber(source, match.index)}`
    );
  }

  for (const match of source.matchAll(/\b(aria-controls|aria-describedby|aria-labelledby|for)\s*=\s*(["'])([^"']+)\2/gi)) {
    if (isDynamic(match[3])) continue;
    for (const id of match[3].trim().split(/\s+/).filter(Boolean)) {
      assert.equal(
        idsByFile.get(file)?.has(id),
        true,
        `${match[1]} points to missing ID "${id}" at ${file}:${lineNumber(source, match.index)}`
      );
    }
  }

  for (const match of source.matchAll(/\bdata-jump\s*=\s*(["'])([^"']+)\1/gi)) {
    assert.equal(
      idsByFile.get(file)?.has(match[2]),
      true,
      `Section button points to missing ID "${match[2]}" at ${file}:${lineNumber(source, match.index)}`
    );
  }

  for (const form of source.matchAll(/<form\b[\s\S]*?<\/form>/gi)) {
    for (const button of form[0].matchAll(/<button\b(?![^>]*\btype\s*=)[^>]*>/gi)) {
      assert.fail(
        `Form button has no explicit type at ${file}:${lineNumber(source, form.index + button.index)}`
      );
    }
  }
}

for (const file of PUBLIC_CSS) {
  const source = await readFile(join(OUTPUT_DIRECTORY, file), "utf8");
  for (const reference of cssReferences(source)) {
    await assertLocalReference({ sourceFile: file, source, ...reference, idsByFile, allowApi: false });
  }
}

const sharedHubCss = await readFile(join(OUTPUT_DIRECTORY, "kid-hubs.css"), "utf8");
const blockerCss = await readFile(join(OUTPUT_DIRECTORY, "blocker-setup.css"), "utf8");
const arcadeShellCss = await readFile(join(OUTPUT_DIRECTORY, "games/arcade-shell.css"), "utf8");
const voiceCss = await readFile(join(OUTPUT_DIRECTORY, "story-voices.css"), "utf8");
const mainCss = await readFile(join(OUTPUT_DIRECTORY, "style.css"), "utf8");
for (const [file, source] of htmlSources) {
  const linkedCss = file === "index.html"
    ? mainCss
    : file === "blocker-setup.html"
      ? blockerCss
      : file.startsWith("games/")
        ? arcadeShellCss
      : ["creator-studio.html", "nature-explorer.html", "move-breaks.html", "story-theater.html", "story-voices.html"].includes(file)
        ? `${sharedHubCss}\n${file === "story-voices.html" ? voiceCss : ""}`
        : "";
  const visualSource = `${linkedCss}\n${source}`;
  assert.match(visualSource, /\.skip-link\s*\{[\s\S]*?min-height:\s*44px/i, `${file} skip link needs a 44px target.`);
  assert.match(visualSource, /\.skip-link:focus(?:-visible)?[\s\S]*?transform:\s*translateY\(0\)/i, `${file} skip link must become visible on focus.`);
}

assert.match(sharedHubCss, /\.series-clear\s*\{[\s\S]*?min-height:\s*44px/i, "Story series Clear needs a 44px target.");
assert.match(voiceCss, /\.voice-source-tabs button\s*\{[\s\S]*?min-height:\s*44px/i, "Voice filters need 44px targets.");
assert.match(blockerCss, /\.blocker-topbar a,[\s\S]*?min-height:\s*44px/i, "Blocker navigation needs a 44px target.");
assert.match(blockerCss, /\.blocker-topbar a\s*\{[\s\S]*?font-size:\s*16px/i, "Blocker navigation text must remain readable.");
assert.match(htmlSources.get("recipe.html"), /\.category-chip\s*\{[\s\S]*?min-height:\s*44px/i, "Recipe categories need 44px targets.");
assert.match(htmlSources.get("app_7.html"), /input\s*\{[\s\S]*?min-height:\s*44px/i, "Smart Spending inputs need 44px targets.");

for (const file of STORY_DATA) {
  const source = await readFile(join(OUTPUT_DIRECTORY, file), "utf8");
  for (const match of source.matchAll(/["'](?:cover|image)["']\s*:\s*["']([^"']+)["']/gi)) {
    await assertLocalReference({
      sourceFile: file,
      source,
      value: match[1],
      index: match.index,
      idsByFile,
      allowApi: false
    });
  }
}

const manifestSource = await readFile(join(OUTPUT_DIRECTORY, "manifest.webmanifest"), "utf8");
const manifest = JSON.parse(manifestSource);
for (const icon of [
  ...(manifest.icons || []),
  ...(manifest.shortcuts || []).flatMap((shortcut) => shortcut.icons || [])
]) {
  await assertLocalReference({
    sourceFile: "manifest.webmanifest",
    source: manifestSource,
    value: icon.src,
    index: manifestSource.indexOf(icon.src),
    idsByFile,
    allowApi: false
  });
}
for (const shortcut of manifest.shortcuts || []) {
  await assertLocalReference({
    sourceFile: "manifest.webmanifest",
    source: manifestSource,
    value: shortcut.url,
    index: manifestSource.indexOf(shortcut.url),
    idsByFile,
    allowApi: false
  });
}

const publishedNames = new Set();
async function collectFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) await collectFiles(target);
    else if (entry.isFile()) publishedNames.add(relative(OUTPUT_DIRECTORY, target));
  }
}
await collectFiles(OUTPUT_DIRECTORY);
for (const file of [...PUBLIC_HTML, ...PUBLIC_CSS, ...STORY_DATA, "manifest.webmanifest", "service-worker.js"]) {
  assert.equal(publishedNames.has(file), true, `${file} was not included in the public bundle.`);
}

console.log(`Public link audit passed for ${PUBLIC_HTML.length} pages.`);
