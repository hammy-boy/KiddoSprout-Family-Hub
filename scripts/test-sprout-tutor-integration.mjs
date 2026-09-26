import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const ROOT = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, ROOT), "utf8");

const [
  markup,
  styles,
  controller,
  config,
  dashboard,
  dashboardMarkup,
  gate,
  learningMarkup,
  publicBuilder,
  serviceWorker,
  pythonPreview
] = await Promise.all([
  read("sprout-tutor.html"),
  read("sprout-tutor.css"),
  read("sprout-tutor.js"),
  read("sprout-tutor-config.js"),
  read("js.js"),
  read("index.html"),
  read("kid-hub-gate.js"),
  read("learning-path.html"),
  read("scripts/build-public-demo.mjs"),
  read("service-worker.js"),
  read("kiddosprout_python.py")
]);

new vm.Script(controller, { filename: "sprout-tutor.js" });
new vm.Script(config, { filename: "sprout-tutor-config.js" });

assert.match(markup, /<html\s+lang=["']en-GB["']/i);
assert.match(markup, /<main\b[^>]*\bclass=["'][^"']*\bhidden\b[^"']*["'][^>]*\bdata-hub-page/i,
  "Tutor content must stay hidden until the family gate allows it.");
assert.match(markup, /data-hub-lock[^>]*\brole=["']main["'][^>]*\btabindex=["']-1["']/i);
assert.match(markup, /Keep private things private/i);
assert.match(markup, /id=["']privacy-storage["']/i);
assert.match(markup, /short, limited copy of the chat in this browser tab/i);
const markupIds = [...markup.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
assert.equal(markupIds.length, new Set(markupIds).size,
  "Tutor element IDs must be unique.");
assert.doesNotMatch(markup, /<[^>]+\son[a-z]+\s*=/i,
  "Tutor markup must not use inline handlers blocked by the public CSP.");

const gateIndex = markup.indexOf('src="kid-hub-gate.js?v=10"');
const configIndex = markup.indexOf('src="sprout-tutor-config.js?v=1"');
const controllerIndex = markup.indexOf('src="sprout-tutor.js?v=1"');
assert.ok(gateIndex >= 0 && configIndex > gateIndex && controllerIndex > configIndex,
  "Family gate and endpoint config must load before the tutor controller.");

assert.match(controller, /const APP_ID = "sproutTutor";[\s\S]*?KiddoHubGate\.protect\(APP_ID, APP_TITLE\)/);
assert.match(controller, /KIDDO_SPROUT_SUPABASE\?\.publicDemoOnly === true[\s\S]*?return null/,
  "The isolated public demo must never send a child's prompt to the AI service.");
assert.match(controller, /window\.location\.protocol === "https:"[\s\S]*?!isGitHubPagesHost\(hostname\)/,
  "A same-origin HTTPS Worker or custom Worker domain may be considered as an AI candidate.");
assert.match(controller, /hostname === "github\.io" \|\| hostname\.endsWith\("\.github\.io"\)/,
  "GitHub Pages must not be mistaken for a same-origin AI Worker.");
assert.match(controller, /HEALTH_PATH = "\/api\/sprout-tutor\/health"/);
assert.match(controller, /verifyTutorHealth\(candidate\.origin\)[\s\S]*?if \(!health\)[\s\S]*?kind: "coach"/,
  "A candidate service must pass its health check before the page claims AI is ready.");
assert.match(controller, /method:\s*"GET"[\s\S]*?cache:\s*"no-store"[\s\S]*?credentials:\s*"omit"/,
  "The AI readiness probe must be a fresh, credential-free GET.");
assert.match(controller, /payload\.status !== "ready" \|\| payload\.authentication !== "parent-account"/,
  "The page must verify the expected authenticated tutor health contract.");
assert.doesNotMatch(controller, /if \(window\.location\.protocol === "https:" \|\| window\.location\.protocol === "http:"\)/,
  "An ordinary static or Docker preview must not pretend it has an AI backend.");
assert.match(controller, /credentials:\s*"omit"/);
assert.match(controller, /window\.KiddoSproutSession\.getAccessToken\(\)/,
  "AI requests must obtain the current parent access token instead of reading browser storage directly.");
assert.match(controller, /async function requestTutorReply[\s\S]*?const accessToken = await getTutorAccessToken\(\)[\s\S]*?method:\s*"POST"[\s\S]*?"Authorization": `Bearer \$\{accessToken\}`/,
  "AI POST requests must use a freshly obtained parent bearer token.");
assert.match(controller, /async function clearRemoteConversation[\s\S]*?const accessToken = await getTutorAccessToken\(\)[\s\S]*?method:\s*"DELETE"[\s\S]*?"Authorization": `Bearer \$\{accessToken\}`/,
  "AI DELETE requests must use a freshly obtained parent bearer token.");
assert.match(controller, /if \(!accessToken\)[\s\S]*?(?:return "signed-out"|throw new TutorRequestError)/,
  "AI POST and DELETE operations must fail closed when the parent access token is unavailable.");
assert.match(controller, /"Authorization": `Bearer \$\{accessToken\}`/,
  "Authenticated AI requests must send the current parent bearer token.");
assert.match(controller, /containsPrivateDetails\(message\)/,
  "Obvious private details must be stopped before entering the local transcript or network request.");
for (const phrase of ["me llamo", "je m'appelle", "mein name ist", "eu me chamo", "mi chiamo"]) {
  assert.equal(controller.includes(phrase), true,
    `Private-detail filtering must cover ${phrase} before browser storage.`);
}
assert.match(controller, /\\p\{L\}/,
  "Likely full-name introductions must be stopped before browser storage.");
assert.match(controller, /textContent = entry\.text/);
assert.doesNotMatch(controller, /\b(?:eval|Function)\s*\(|\.innerHTML\s*=|insertAdjacentHTML|document\.write\s*\(/,
  "Tutor messages must never pass through a string-to-HTML or string-to-code sink.");
assert.match(controller, /MAX_TRANSCRIPT_MESSAGES = 24/);
assert.match(controller, /MAX_TRANSCRIPT_CHARACTERS = 24000/);
assert.match(controller, /method:\s*"DELETE"/,
  "New chat must request deletion of the old remote conversation.");
assert.match(controller, /function stopActiveRequest\(\)[\s\S]*?rotateTutorSession\(\)[\s\S]*?controller\.abort\(\)[\s\S]*?clearRemoteConversation\(oldSessionId, oldMode\.origin\)/,
  "Stop must abort, rotate to a fresh session, and request deletion of the old remote conversation.");
assert.match(controller, /Stopped\. Your chat stays on this page/,
  "Stop must explain that the local transcript remains while remote context is cleared.");
assert.match(controller, /up to six recent question-and-answer pairs under a random session/,
  "AI mode must disclose its bounded remote lesson context.");
assert.match(controller, /Practice Coach · not AI/,
  "The offline fallback must be clearly labelled as non-AI.");

assert.match(styles, /@media\s*\(max-width:\s*(?:6[0-9]{2}|7[0-2][0-9])px\)/i,
  "The tutor needs a phone layout.");
assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/i);
assert.match(styles, /@media\s*\(forced-colors:\s*active\)/i);
assert.match(styles, /\.hidden\s*\{[\s\S]*?display:\s*none\s*!important/i,
  "The family gate's hidden class must actually hide tutor content before approval.");

assert.match(config, /KIDDO_SPROUT_TUTOR_ORIGIN = ""/,
  "Source config must default to the honest non-AI Practice Coach.");
assert.doesNotMatch(config, /(?:api[_-]?key|token|password|secret)\s*[:=]\s*["'][^"']+/i,
  "Browser tutor config must not contain a secret.");

assert.match(dashboard, /sproutTutor:\s*\{\s*title:\s*"Sprout Tutor"[\s\S]*?defaultRule:\s*"request"/);
assert.match(dashboard, /sproutTutor:\s*"allowed"/,
  "The colleague demo should be able to exercise the tutor without creating a real request.");
assert.match(dashboard, /sproutTutor:\s*"sprout-tutor\.html"/);
assert.match(dashboardMarkup, /data-app-status-label="sproutTutor"[\s\S]*?data-open-app="sproutTutor"/);
assert.match(gate, /sproutTutor:\s*"request"/,
  "Real family data with no tutor rule must fail closed to parent approval.");
assert.match(learningMarkup, /href="sprout-tutor\.html"[^>]*>Ask Sprout Tutor</);

for (const source of [publicBuilder, serviceWorker, pythonPreview]) {
  for (const file of ["sprout-tutor.html", "sprout-tutor.css", "sprout-tutor-config.js", "sprout-tutor.js"]) {
    assert.equal(source.includes(`"${file}"`) || source.includes(`"/${file}"`), true,
      `${file} is missing from a public/offline allow-list.`);
  }
}

console.log("Sprout Tutor integration safety passed.");
