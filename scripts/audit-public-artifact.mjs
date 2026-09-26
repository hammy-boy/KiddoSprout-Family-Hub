import { createHash } from "node:crypto";
import { readFile, readdir, lstat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  assertPublicationBudget,
  OUTPUT_DIRECTORY,
  PUBLIC_FILES,
  publicStoryAssets
} from "./build-public-demo.mjs";
import { CHESS_FILES } from "./include-chess-academy.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const TEXT_EXTENSIONS = new Set([
  "", ".css", ".cjs", ".html", ".js", ".json", ".mjs", ".svg", ".txt", ".webmanifest", ".xml"
]);
const SECRET_MARKERS = /(?:SUPABASE_SERVICE_ROLE|SERVICE_ROLE_KEY|TURNSTILE_SECRET|ELEVENLABS_API_KEY|SMTP_PASS|RESEND_API_KEY|PLAID_SECRET|CLOUDFLARE_API_TOKEN|postgres(?:ql)?:\/\/|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/i;
const INTERNAL_CHESS_CARD = /<a\b[^>]*href=["']chess-academy\/["'][^>]*>[\s\S]*?<\/a>/gi;
const EXTERNAL_CHESS_CARD = /<a\b[^>]*href=["']https:\/\/davidolufunmilayo1-blip\.github\.io\/advaced-chess-academy\/["'][^>]*>[\s\S]*?<\/a>/i;
const LOOPBACK_URL = /\bhttps?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?(?:[\/?#"']|$)/i;
const LOCAL_REDIRECT_SCRIPT = /<script\s+src=["']local-docker-redirect\.js(?:\?[^"']*)?["']><\/script>/i;
const INLINE_EVENT_ATTRIBUTE = /<[a-z][^>]*\son[a-z]+\s*=/i;
const FORBIDDEN_PUBLIC_EXTENSION = /\.(?:cjs|dmg|env|exe|go|key|mjs|pem|py|sh|sql|toml|wasm|zip)$/i;
const UNSAFE_SVG = /<!DOCTYPE|<!ENTITY|<(?:script|style|foreignObject|iframe|object|embed|image|use|a)\b|\bon[a-z]+\s*=|(?:xlink:)?href\s*=|\burl\s*\(|(?:javascript|data):/i;
const REVIEWED_SVG_SHA256 = new Map([
  ["games/multiplication-runner/map.svg", "0462f9783982ad057c11e12e777d52ac57bafe46aece18cb3feae1bf769ac8d2"],
  ["games/chess-academy/public/queen.svg", "1a76f89addb25720228355509ed4ecfc0c061669390c87cf6c39b6478bed1cdb"]
]);
const PUBLIC_CHESS_AUTH_CONFIG = `// Public Supabase project settings only. Never put a secret/service-role key here.
// Leave empty until a dedicated academy project and email delivery are configured.
window.ACADEMY_AUTH_CONFIG=Object.freeze({url:'',publishableKey:''});
`;

function publicPath(root, file) {
  return relative(root, file).split(sep).join("/");
}

async function artifactFiles(directory, root = directory) {
  const info = await lstat(directory).catch(() => null);
  if (!info?.isDirectory() || info.isSymbolicLink()) {
    throw new Error("The final public artifact is missing or is not a regular directory.");
  }

  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Final public artifact contains a symbolic link: ${publicPath(root, target)}`);
    }
    if (entry.isDirectory()) {
      files.push(...await artifactFiles(target, root));
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(`Final public artifact contains a non-file entry: ${publicPath(root, target)}`);
    }
    files.push(target);
  }
  return files;
}

async function localEnvironmentValues(repositoryRoot) {
  const entries = await readdir(repositoryRoot, { withFileTypes: true });
  const environmentNames = entries
    .filter((entry) => entry.isFile() && !entry.isSymbolicLink())
    .map((entry) => entry.name)
    .filter((name) => (
      (name === ".env" || name.startsWith(".env.") || name === ".dev.vars" || name.startsWith(".dev.vars."))
      && name !== ".env.example"
    ));
  const values = [];
  for (const name of environmentNames) {
    const source = await readFile(join(repositoryRoot, name), "utf8");
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match) continue;
      const value = match[2].replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, (_, doubleQuoted, singleQuoted) => (
        doubleQuoted ?? singleQuoted ?? ""
      )).trim();
      if (value.length >= 8) values.push({ name: match[1], value });
    }
  }
  return values;
}

export async function auditArtifactDirectory({
  outputRoot,
  expectedFiles,
  repositoryRoot = ROOT,
  chessSourceRoot = null
}) {
  const files = (await artifactFiles(outputRoot)).sort();
  const names = files.map((file) => publicPath(outputRoot, file));
  const expected = [...new Set(expectedFiles)].sort();
  const actualSet = new Set(names);
  const expectedSet = new Set(expected);
  const missing = expected.find((name) => !actualSet.has(name));
  const unexpected = names.find((name) => !expectedSet.has(name));
  if (missing) throw new Error(`Final public artifact is missing reviewed file: ${missing}`);
  if (unexpected) throw new Error(`Final public artifact contains an unreviewed file: ${unexpected}`);
  const forbiddenSource = names.find((name) => FORBIDDEN_PUBLIC_EXTENSION.test(name));
  if (forbiddenSource) {
    throw new Error(`Final public artifact contains a forbidden source, backend, key, or archive file: ${forbiddenSource}`);
  }

  let totalBytes = 0;
  for (const file of files) {
    const info = await lstat(file);
    if (!info.isFile() || info.isSymbolicLink()) {
      throw new Error(`Final public artifact contains a non-regular file: ${publicPath(outputRoot, file)}`);
    }
    if (info.size > MAX_FILE_BYTES) {
      throw new Error(`Final public artifact file exceeds 5 MiB: ${publicPath(outputRoot, file)}`);
    }
    totalBytes += info.size;
  }
  assertPublicationBudget({ fileCount: files.length, totalBytes });

  const localValues = await localEnvironmentValues(repositoryRoot);
  for (const file of files.filter((candidate) => TEXT_EXTENSIONS.has(extname(candidate).toLowerCase()))) {
    const source = await readFile(file, "utf8");
    if (SECRET_MARKERS.test(source)) {
      throw new Error(`Secret-shaped content found in final public artifact: ${publicPath(outputRoot, file)}`);
    }
    if (extname(file).toLowerCase() === ".html") {
      if (LOOPBACK_URL.test(source)) {
        throw new Error(`Loopback-only URL found in final public artifact: ${publicPath(outputRoot, file)}`);
      }
      if (LOCAL_REDIRECT_SCRIPT.test(source) || INLINE_EVENT_ATTRIBUTE.test(source)) {
        throw new Error(`Unsafe development redirect or inline event handler found in final public artifact: ${publicPath(outputRoot, file)}`);
      }
    }
    for (const setting of localValues) {
      if (source.includes(setting.value)) {
        throw new Error(`${setting.name} leaked into final public artifact file ${publicPath(outputRoot, file)}.`);
      }
    }
  }

  for (const name of names.filter((candidate) => extname(candidate).toLowerCase() === ".svg")) {
    const expectedDigest = REVIEWED_SVG_SHA256.get(name);
    if (!expectedDigest) throw new Error(`Final public artifact contains an unreviewed SVG: ${name}`);
    const svg = await readFile(join(outputRoot, name));
    const text = svg.toString("utf8");
    if (!/^<svg\b[\s\S]*<\/svg>\s*$/i.test(text) || UNSAFE_SVG.test(text)) {
      throw new Error(`Final public artifact SVG contains unsafe or unsupported markup: ${name}`);
    }
    if (createHash("sha256").update(svg).digest("hex") !== expectedDigest) {
      throw new Error(`Final public artifact SVG changed and needs a fresh security review: ${name}`);
    }
  }

  const chooser = await readFile(join(outputRoot, "games", "index.html"), "utf8");
  if ([...chooser.matchAll(INTERNAL_CHESS_CARD)].length !== 1 || EXTERNAL_CHESS_CARD.test(chooser)) {
    throw new Error("Final public game chooser must contain exactly one internal Chess Academy destination.");
  }

  if (chessSourceRoot) {
    for (const name of CHESS_FILES) {
      const published = await readFile(join(outputRoot, "games", "chess-academy", name));
      const reviewed = await readFile(join(chessSourceRoot, name));
      if (!published.equals(reviewed)) {
        throw new Error(`Published Chess Academy file differs from its reviewed source: ${name}`);
      }
    }
    const publishedAuthConfig = await readFile(
      join(outputRoot, "games", "chess-academy", "public", "auth-config.js"),
      "utf8"
    );
    if (publishedAuthConfig !== PUBLIC_CHESS_AUTH_CONFIG) {
      throw new Error("Published Chess Academy auth config must remain empty and account-free.");
    }
  }

  return { fileCount: files.length, totalBytes };
}

export async function auditPublicArtifact({
  outputRoot = OUTPUT_DIRECTORY,
  repositoryRoot = ROOT,
  chessSourceRoot = join(ROOT, "public-site", "games", "chess-academy")
} = {}) {
  const storyAssets = await publicStoryAssets(
    join(repositoryRoot, "assets"),
    join(repositoryRoot, "story-image-derivatives.json")
  );
  const expectedFiles = [
    ...PUBLIC_FILES,
    ...storyAssets.files,
    "_headers",
    "supabase-config.js",
    ...CHESS_FILES.map((name) => `games/chess-academy/${name}`)
  ];
  return auditArtifactDirectory({ outputRoot, expectedFiles, repositoryRoot, chessSourceRoot });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await auditPublicArtifact();
  console.log(`Final public artifact audit passed: ${result.fileCount} reviewed files, no secret-shaped content.`);
}
