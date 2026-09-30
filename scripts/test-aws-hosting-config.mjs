import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);
const amplifyConfigUrl = new URL("amplify.yml", repositoryRoot);
const customHeadersUrl = new URL("customHttp.yml", repositoryRoot);
const packageJsonUrl = new URL("package.json", repositoryRoot);

async function readConfig(url, label) {
  try {
    return await readFile(url, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      assert.fail(`${label} is missing at the repository root.`);
    }
    throw error;
  }
}

function assertContains(source, pattern, message) {
  assert.match(source, pattern, message);
}

function commandOffset(source, pattern, command) {
  const match = pattern.exec(source);
  assert.ok(match, `amplify.yml must run ${command}.`);
  return match.index;
}

function normalizedScalar(value) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"')))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function headerMap(source) {
  const headers = new Map();
  const lines = source.replace(/\r\n?/g, "\n").split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const keyMatch = /^(\s*)-\s*key\s*:\s*(.+?)\s*$/.exec(lines[index]);
    if (!keyMatch) continue;

    const keyIndent = keyMatch[1].length;
    const key = normalizedScalar(keyMatch[2]).toLowerCase();
    let value = "";

    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const nextKeyMatch = /^(\s*)-\s*key\s*:/.exec(lines[cursor]);
      if (nextKeyMatch && nextKeyMatch[1].length <= keyIndent) break;

      const valueMatch = /^(\s*)value\s*:\s*(.*?)\s*$/.exec(lines[cursor]);
      if (!valueMatch) continue;

      const valueIndent = valueMatch[1].length;
      const firstValue = valueMatch[2];
      if (/^[>|][-+]?\s*$/.test(firstValue)) {
        const continuations = [];
        for (let lineIndex = cursor + 1; lineIndex < lines.length; lineIndex += 1) {
          const continuation = /^(\s*)(.*)$/.exec(lines[lineIndex]);
          if (continuation[2].trim() && continuation[1].length <= valueIndent) break;
          if (continuation[1].length > valueIndent) continuations.push(continuation[2].trim());
        }
        value = continuations.join(" ");
      } else {
        value = normalizedScalar(firstValue);
      }
      break;
    }

    headers.set(key, value);
  }

  return headers;
}

function requiredHeader(headers, name) {
  const value = headers.get(name.toLowerCase());
  assert.ok(value, `customHttp.yml must set a non-empty ${name} header.`);
  return value;
}

test("Amplify builds and publishes only the reviewed static public demo", async () => {
  const source = await readConfig(amplifyConfigUrl, "amplify.yml");

  assertContains(source, /^version\s*:\s*["']?1["']?\s*$/m, "amplify.yml must use Amplify build specification version 1.");
  assertContains(source, /^frontend\s*:\s*$/m, "amplify.yml must define a frontend build.");
  assertContains(source, /^\s*phases\s*:\s*$/m, "amplify.yml must define frontend build phases.");
  assertContains(source, /^\s*artifacts\s*:\s*$/m, "amplify.yml must define the static artifacts to publish.");
  assertContains(
    source,
    /^\s*baseDirectory\s*:\s*["']?\.cloudflare\/public-demo\/?["']?\s*$/m,
    "Amplify must publish .cloudflare/public-demo and no broader directory."
  );
  assertContains(
    source,
    /^\s*-\s*["']?\*\*\/\*["']?\s*$/m,
    "Amplify must include all files beneath the reviewed artifact directory."
  );

  const commands = [
    {
      name: "nvm use 22",
      pattern: /^\s*-\s*(?:["']\s*)?nvm\s+use\s+22(?:\s|["']|$)/m
    },
    {
      name: "npm ci --ignore-scripts",
      pattern: /^\s*-\s*(?:["']\s*)?npm\s+ci\b[^\r\n]*--ignore-scripts\b[^\r\n]*$/m
    },
    {
      name: "npm run build:public-demo",
      pattern: /^\s*-\s*(?:["']\s*)?npm\s+run\s+build:public-demo(?:\s|["']|$)/m
    },
    {
      name: "node scripts/include-chess-academy.mjs",
      pattern: /^\s*-\s*(?:["']\s*)?node\s+(?:\.\/)?scripts\/include-chess-academy\.mjs(?:\s|["']|$)/m
    },
    {
      name: "npm run audit:public-artifact",
      pattern: /^\s*-\s*(?:["']\s*)?npm\s+run\s+audit:public-artifact(?:\s|["']|$)/m
    }
  ];
  const offsets = commands.map(({ name, pattern }) => commandOffset(source, pattern, name));
  for (let index = 1; index < offsets.length; index += 1) {
    assert.ok(
      offsets[index - 1] < offsets[index],
      `${commands[index - 1].name} must run before ${commands[index].name}.`
    );
  }
});

test("AWS hosting configuration contains no local stack, credentials, or backend deployment", async () => {
  const [amplifySource, customHeadersSource] = await Promise.all([
    readConfig(amplifyConfigUrl, "amplify.yml"),
    readConfig(customHeadersUrl, "customHttp.yml")
  ]);
  const combined = `${amplifySource}\n${customHeadersSource}`;
  const forbidden = [
    [/\bdocker(?:file|-compose)?\b|\bdocker\s+compose\b/i, "Docker commands or files"],
    [
      /\bSUPABASE_(?:SERVICE_ROLE(?:_KEY)?|SECRET(?:_KEY)?|DB_PASSWORD|DATABASE_PASSWORD|ACCESS_TOKEN|JWT_SECRET)\b/i,
      "Supabase server secrets"
    ],
    [
      /\bAWS_(?:ACCESS_KEY_ID|SECRET_ACCESS_KEY|SESSION_TOKEN|SECURITY_TOKEN)\b|\b(?:accessKeyId|secretAccessKey)\b|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/i,
      "AWS credentials"
    ],
    [/\bamplify\s+(?:push|publish|pipeline-deploy)\b/i, "Amplify backend deployment commands"],
    [/\b(?:npx\s+)?(?:cdk|sam|serverless)\s+deploy\b/i, "backend framework deployment commands"],
    [/\b(?:terraform\s+apply|pulumi\s+up|wrangler\s+deploy)\b/i, "infrastructure deployment commands"],
    [/\baws\s+[a-z0-9-]+(?:\s+[a-z0-9-]+)*\s+(?:deploy|create|update|delete|put)\b/i, "AWS backend mutation commands"],
    [/\b(?:npm|pnpm|yarn)\s+(?:run\s+)?deploy(?::[a-z0-9:_-]+)?\b/i, "application deployment commands"],
    [/\bsupabase\s+(?:db\s+push|migration\s+up|functions\s+deploy)\b/i, "Supabase deployment commands"]
  ];

  for (const [pattern, label] of forbidden) {
    assert.doesNotMatch(combined, pattern, `${label} must not be present in static AWS hosting configuration.`);
  }
  assert.doesNotMatch(amplifySource, /^\s*backend\s*:/mi, "amplify.yml must not define an Amplify backend phase.");
  assert.doesNotMatch(
    amplifySource,
    /^\s*(?:env|environment|secrets?)\s*:/mi,
    "amplify.yml must not declare environment variables or secrets for the static public demo."
  );
});

test("package scripts expose the offline AWS hosting check", async () => {
  const packageJson = JSON.parse(await readConfig(packageJsonUrl, "package.json"));
  assert.equal(
    packageJson.scripts?.["test:aws-hosting-config"],
    "node scripts/test-aws-hosting-config.mjs",
    "package.json must expose the AWS hosting validator as test:aws-hosting-config."
  );
  assert.match(
    packageJson.scripts?.test ?? "",
    /(?:^|&&)\s*npm\s+run\s+test:aws-hosting-config(?:\s*(?:&&|$))/,
    "The main test command must run test:aws-hosting-config."
  );
});

test("Amplify custom headers protect every public-demo response and prevent indexing", async () => {
  const source = await readConfig(customHeadersUrl, "customHttp.yml");
  assertContains(source, /^customHeaders\s*:\s*$/m, "customHttp.yml must define customHeaders.");
  assertContains(
    source,
    /^\s*-\s*pattern\s*:\s*["']?(?:\*\*|\*\*\/\*)["']?\s*$/m,
    "Security headers must apply to every published path (** or **/*)."
  );

  const headers = headerMap(source);
  const contentSecurityPolicy = requiredHeader(headers, "Content-Security-Policy");
  for (const directive of [
    /\bdefault-src\s+'self'(?:\s*;|$)/i,
    /\bbase-uri\s+'self'(?:\s*;|$)/i,
    /\bobject-src\s+'none'(?:\s*;|$)/i,
    /\bframe-ancestors\s+'none'(?:\s*;|$)/i
  ]) {
    assert.match(contentSecurityPolicy, directive, `Content-Security-Policy is missing ${directive.source}.`);
  }
  assert.doesNotMatch(contentSecurityPolicy, /'unsafe-eval'/i, "Content-Security-Policy must not permit unsafe-eval.");

  assert.match(requiredHeader(headers, "Strict-Transport-Security"), /\bmax-age=\d+/i);
  assert.equal(requiredHeader(headers, "X-Content-Type-Options").toLowerCase(), "nosniff");
  assert.equal(requiredHeader(headers, "X-Frame-Options").toUpperCase(), "DENY");
  assert.match(
    requiredHeader(headers, "Referrer-Policy"),
    /^(?:no-referrer|same-origin|strict-origin|strict-origin-when-cross-origin)$/i
  );

  const permissionsPolicy = requiredHeader(headers, "Permissions-Policy");
  for (const controlledFeature of ["camera", "geolocation", "microphone"]) {
    assert.match(
      permissionsPolicy,
      new RegExp(`\\b${controlledFeature}\\s*=\\s*\\(\\s*(?:self)?\\s*\\)`, "i"),
      `Permissions-Policy must explicitly control ${controlledFeature}.`
    );
  }

  const robots = requiredHeader(headers, "X-Robots-Tag");
  assert.match(robots, /\bnoindex\b/i, "X-Robots-Tag must prevent search indexing.");
  assert.match(robots, /\bnofollow\b/i, "X-Robots-Tag must prevent following public-demo links.");
});
