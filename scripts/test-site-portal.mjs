import assert from "node:assert/strict";
import { lstat, readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { PUBLIC_FILES } from "./build-public-demo.mjs";

const ROOT = new URL("../", import.meta.url);
const PORTAL = new URL("portal/", ROOT);
const EXPECTED_FILES = ["404.html", "index.html"];
const KIDDO_SPROUT_URL = "https://hammy-boy.github.io/KiddoSprout-Family-Hub/";
const ROOKAVELLE_URL = `${KIDDO_SPROUT_URL}games/chess-academy/`;

function attributeValue(openingTag, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return openingTag.match(new RegExp(`\\b${escapedName}\\s*=\\s*(["'])(.*?)\\1`, "i"))?.[2] || "";
}

function visibleText(markup) {
  return markup
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|#160);/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function anchorDetails(source) {
  return [...source.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((match) => ({
    openingTag: match[0].slice(0, match[0].indexOf(">") + 1),
    href: attributeValue(match[1], "href"),
    name: attributeValue(match[1], "aria-label") || visibleText(match[2])
  }));
}

function assertSafeStaticPage(source, fileName) {
  assert.match(source, /^<!doctype html>/i, `${fileName} must be a complete HTML document.`);
  assert.match(source, /<html\b[^>]*\blang\s*=\s*(["'])en\1/i,
    `${fileName} must identify its language.`);
  assert.match(source, /<meta\b[^>]*\bname\s*=\s*(["'])viewport\1[^>]*>/i,
    `${fileName} must include a responsive viewport.`);
  const viewport = source.match(/<meta\b[^>]*\bname\s*=\s*(["'])viewport\1[^>]*>/i)?.[0] || "";
  const viewportContent = attributeValue(viewport, "content");
  assert.match(viewportContent, /(?:^|,)\s*width\s*=\s*device-width\s*(?:,|$)/i,
    `${fileName} must size itself to the device width.`);
  assert.match(viewportContent, /(?:^|,)\s*initial-scale\s*=\s*1(?:\.0+)?\s*(?:,|$)/i,
    `${fileName} must start at a readable zoom level.`);

  assert.equal((source.match(/<main\b/gi) || []).length, 1,
    `${fileName} must have one main landmark.`);
  assert.equal((source.match(/<h1\b/gi) || []).length, 1,
    `${fileName} must have one page heading.`);
  assert.match(source, /<nav\b[^>]*(?:\baria-label|\baria-labelledby)\s*=/i,
    `${fileName} must give its navigation landmark an accessible name.`);
  assert.match(source, /<footer\b/i, `${fileName} must include a footer landmark.`);

  const styles = [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((match) => match[1])
    .join("\n");
  assert.ok(styles.trim(), `${fileName} must include its self-contained responsive CSS.`);
  assert.match(styles, /(?:@media\b|\brepeat\(\s*auto-(?:fit|fill)\b|\bclamp\s*\(|\bmin\s*\()/i,
    `${fileName} must adapt its layout or sizing to smaller viewports.`);
  assert.match(styles, /:focus-visible\b/i,
    `${fileName} must keep keyboard focus visible.`);

  for (const link of anchorDetails(source)) {
    assert.ok(link.href, `${fileName} contains a link without a destination.`);
    assert.ok(link.name, `${fileName} contains a link without an accessible name.`);
    assert.doesNotMatch(link.href, /^javascript:/i,
      `${fileName} must not use JavaScript URLs.`);
    if (/\btarget\s*=\s*(["'])_blank\1/i.test(link.openingTag)) {
      const rel = attributeValue(link.openingTag, "rel").toLowerCase().split(/\s+/);
      assert.ok(rel.includes("noopener") && rel.includes("noreferrer"),
        `${fileName} links that open a new tab must isolate the opener and referrer.`);
    }
  }

  assert.doesNotMatch(source, /<\/?(?:script|form|iframe)\b/i,
    `${fileName} must remain a script-free, form-free, frame-free chooser.`);
  assert.doesNotMatch(source, /<meta\b[^>]*\bhttp-equiv\s*=\s*(["'])refresh\1/i,
    `${fileName} must not navigate visitors with a hidden refresh.`);
  assert.doesNotMatch(source, /<[^>]+\son[a-z]+\s*=/i,
    `${fileName} must not contain inline event handlers.`);
  assert.doesNotMatch(source, /\b(?:localhost|0\.0\.0\.0|127(?:\.\d{1,3}){3}|\[?::1\]?)\b/i,
    `${fileName} must not send visitors to a loopback address.`);
  assert.doesNotMatch(source,
    /google-analytics|googletagmanager|connect\.facebook\.net|facebook\s*pixel|hotjar|mixpanel|plausible\.io|matomo|navigator\.sendBeacon|\bgtag\s*\(/i,
    `${fileName} must not contain tracking code or tracking endpoints.`);
  assert.doesNotMatch(source, /<[^>]+\bping\s*=/i,
    `${fileName} must not attach tracking pings to links.`);
  assert.doesNotMatch(source,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:SUPABASE_SERVICE_ROLE(?:_KEY)?|TURNSTILE_SECRET|ELEVENLABS_API_KEY|SMTP_PASS|RESEND_API_KEY|PLAID_SECRET|CLOUDFLARE_API_TOKEN|AWS_SECRET_ACCESS_KEY|AWS_ACCESS_KEY_ID|SECRET_ACCESS_KEY|PRIVATE_KEY)\b|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\beyJhbGciOiJ[A-Za-z0-9_-]+|\b(?:api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]/i,
    `${fileName} must not contain credentials or secret configuration.`);

  for (const match of source.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
    const tagName = match[1].toLowerCase();
    for (const attribute of match[2].matchAll(/\b(src|href|action|poster|ping|data)\s*=\s*(["'])(.*?)\2/gi)) {
      const [attributeName, value] = [attribute[1].toLowerCase(), attribute[3].trim()];
      if (!/^(?:https?:)?\/\//i.test(value)) continue;
      assert.equal(tagName === "a" && attributeName === "href" && /^https:\/\//i.test(value), true,
        `${fileName} must not load remote resources or use link-tracking attributes.`);
    }
  }
}

test("portal contains only its two reviewed static pages", async () => {
  const entries = await readdir(PORTAL, { withFileTypes: true });
  const names = entries.map((entry) => entry.name).sort();
  assert.deepEqual(names, EXPECTED_FILES,
    "portal/ must contain only index.html and its static 404 page.");
  for (const entry of entries) {
    assert.equal(entry.isFile(), true, `portal/${entry.name} must be a regular file.`);
    const info = await lstat(new URL(entry.name, PORTAL));
    assert.equal(info.isSymbolicLink(), false, `portal/${entry.name} must not be a symlink.`);
  }
});

test("portal home is the neutral, accessible S&O Devs project chooser", async () => {
  const source = await readFile(new URL("index.html", PORTAL), "utf8");
  assertSafeStaticPage(source, "portal/index.html");

  const heading = visibleText(source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
  assert.match(heading, /^S&amp;O Devs$/i,
    "portal/index.html must present the shared S&O Devs name.");
  assert.doesNotMatch(heading, /KiddoSprout|Rookavelle/i,
    "The portal heading must stay neutral instead of presenting either site as the owner.");
  const styles = source.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i)?.[1] || "";
  assert.match(styles, /grid-template-columns\s*:\s*repeat\(\s*auto-fit\s*,/i,
    "The project grid must automatically make room for future project cards.");

  const externalLinks = anchorDetails(source)
    .filter(({ href }) => /^https:\/\//i.test(href));
  assert.deepEqual(
    externalLinks.map(({ href }) => href).sort(),
    [KIDDO_SPROUT_URL, ROOKAVELLE_URL].sort(),
    "The chooser must link exactly once to KiddoSprout and once to integrated Rookavelle."
  );
  assert.match(externalLinks.find(({ href }) => href === KIDDO_SPROUT_URL)?.name || "", /KiddoSprout/i,
    "The KiddoSprout destination needs a clear accessible link name.");
  assert.match(externalLinks.find(({ href }) => href === ROOKAVELLE_URL)?.name || "", /Rookavelle.*Chess|Chess.*Rookavelle/i,
    "The Rookavelle destination needs a clear accessible link name.");
});

test("portal 404 stays static and offers a clear route back", async () => {
  const source = await readFile(new URL("404.html", PORTAL), "utf8");
  assertSafeStaticPage(source, "portal/404.html");
  assert.match(visibleText(source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || ""),
    /not found|isn['’]t here|lost/i,
    "portal/404.html must explain that the requested page was not found.");

  const links = anchorDetails(source);
  assert.ok(links.some(({ href, name }) => /^(?:\.\/|index\.html|\/)$/.test(href) && /home|chooser|websites|back/i.test(name)),
    "portal/404.html must provide an accessible link back to the chooser.");
});

test("both portal pages stay on the public-demo and Python preview allow-lists", async () => {
  for (const path of ["portal/index.html", "portal/404.html"]) {
    assert.ok(PUBLIC_FILES.includes(path), `${path} is missing from the public-demo allow-list.`);
  }

  const pythonSource = await readFile(new URL("kiddosprout_python.py", ROOT), "utf8");
  const pythonAllowList = pythonSource.match(/PUBLIC_FILES\s*=\s*frozenset\s*\(\s*\{([\s\S]*?)\}\s*\)/)?.[1];
  assert.ok(pythonAllowList, "kiddosprout_python.py must keep its explicit PUBLIC_FILES allow-list.");
  for (const path of ["portal/index.html", "portal/404.html"]) {
    const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(pythonAllowList, new RegExp(`["']${escapedPath}["']`),
      `${path} is missing from the Python preview allow-list.`);
  }
});
