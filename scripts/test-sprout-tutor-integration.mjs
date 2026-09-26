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

const privacyFunctionSource = controller.match(
  /function containsPrivateDetails\(message\) \{[\s\S]*?\n  \}(?=\n\n  async function retryTutorConnection)/
)?.[0];
assert.ok(privacyFunctionSource, "Could not inspect the browser private-detail filter.");
const containsPrivateDetails = vm.runInNewContext(
  `${privacyFunctionSource}; containsPrivateDetails`,
  {}
);
for (const privateExample of [
  "I'm Alice",
  "my name's Alice",
  "I live in London",
  "our house is 10 Downing Street",
  "my birthday is 3 May 2015"
]) {
  assert.equal(containsPrivateDetails(privateExample), true,
    `Browser privacy filtering missed: ${privateExample}`);
}
for (const learningExample of [
  "I am learning fractions",
  "i am learning maths",
  "I am very confused",
  "I am solving this"
]) {
  assert.equal(containsPrivateDetails(learningExample), false,
    `Browser privacy filtering blocked an ordinary learning statement: ${learningExample}`);
}

const configWindow = {
  KIDDO_SPROUT_TUTOR_ORIGIN: "https://primary.example.workers.dev",
  KIDDO_SPROUT_TUTOR_ORIGINS: [
    "https://backup-1.example.workers.dev",
    42,
    "https://backup-2.example.workers.dev",
    "https://backup-3.example.workers.dev",
    "https://ignored.example.workers.dev"
  ]
};
vm.runInNewContext(config, { window: configWindow });
assert.equal(configWindow.KIDDO_SPROUT_TUTOR_ORIGIN, "https://primary.example.workers.dev");
assert.deepEqual(
  Array.from(configWindow.KIDDO_SPROUT_TUTOR_ORIGINS),
  [
    "https://backup-1.example.workers.dev",
    "https://backup-2.example.workers.dev",
    "https://backup-3.example.workers.dev",
    "https://ignored.example.workers.dev"
  ],
  "Tutor config must preserve at most four string Worker candidates and discard non-string values."
);
assert.equal(Object.isFrozen(configWindow.KIDDO_SPROUT_TUTOR_ORIGINS), true,
  "The deployment-provided Worker list must not be mutable after config initialisation.");

assert.match(markup, /<html\s+lang=["']en-GB["']/i);
assert.match(markup, /<meta name="robots" content="noindex, nofollow, noarchive">/,
  "The child tutor page must not be indexed or cached by search engines.");
assert.match(markup, /<main\b[^>]*\bclass=["'][^"']*\bhidden\b[^"']*["'][^>]*\bdata-hub-page/i,
  "Tutor content must stay hidden until the family gate allows it.");
assert.match(markup, /data-hub-lock[^>]*\brole=["']main["'][^>]*\btabindex=["']-1["']/i);
assert.match(markup, /Keep private things private/i);
assert.match(markup, /Connecting to Sprout Tutor AI/i,
  "The initial interface must identify the real AI service it is checking.");
assert.match(markup, /id=["']privacy-storage["']/i);
assert.match(markup, /short, limited copy of the chat in this browser tab/i);
const markupIds = [...markup.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
assert.equal(markupIds.length, new Set(markupIds).size,
  "Tutor element IDs must be unique.");
assert.doesNotMatch(markup, /<[^>]+\son[a-z]+\s*=/i,
  "Tutor markup must not use inline handlers blocked by the public CSP.");

const gateIndex = markup.indexOf('src="kid-hub-gate.js?v=10"');
const configIndex = markup.indexOf('src="sprout-tutor-config.js?v=2"');
const controllerIndex = markup.indexOf('src="sprout-tutor.js?v=2"');
assert.ok(gateIndex >= 0 && configIndex > gateIndex && controllerIndex > configIndex,
  "Family gate and endpoint config must load before the tutor controller.");
assert.match(markup, /id=["']retry-tutor["'][^>]*\bhidden\b[^>]*>Try AI again</i,
  "The tutor must offer an accessible retry action when its Worker is unavailable.");
assert.match(markup, /id=["']message-input["'][^>]*\baria-errormessage=["']request-status["'][^>]*\bdisabled\b/i,
  "The composer must start disabled and keep validation errors associated with the question field.");
assert.match(markup, /id=["']send-message["'][^>]*\bdisabled\b/i,
  "Native form submission must stay unavailable until the controller finishes its safety checks.");
assert.match(markup, /id=["']retry-question["'][^>]*\bhidden\b[^>]*>Try question again</i,
  "A failed AI request must have a real retry action.");
assert.match(markup, /<noscript>[\s\S]*?<main\b[\s\S]*?<h1/i,
  "The no-JavaScript fallback must provide the visible main landmark and page heading.");
assert.match(markup, /class=["']skip-link["']\s+href=["']#noscript-content["']/i,
  "Without JavaScript, Skip to the tutor must target the no-script main landmark.");
assert.match(controller, /function initialize\(\)[\s\S]*?querySelector\("\.skip-link"\)\?\.setAttribute\("href", "#main-content"\)/,
  "After the family gate allows the app, the skip link must target the interactive main content.");
assert.doesNotMatch(markup, /Practice Coach|built-in guide|not AI/i,
  "The finished tutor surface must stay branded as Sprout Tutor instead of presenting a fixed coach as the product.");

assert.match(controller, /const APP_ID = "sproutTutor";[\s\S]*?KiddoHubGate\.protect\(APP_ID, APP_TITLE\)/);
assert.match(controller, /function resolveTutorCandidates\(\)[\s\S]*?KIDDO_SPROUT_TUTOR_ORIGIN[\s\S]*?KIDDO_SPROUT_TUTOR_ORIGINS[\s\S]*?tutorOrigin/,
  "The page must discover an explicitly configured remote Worker as well as a deployment-provided tutor origin.");
assert.match(controller, /configuredOrigins\.slice\(0, 4\)|KIDDO_SPROUT_TUTOR_ORIGINS\.slice\(0, 4\)/,
  "Endpoint discovery must keep the configured candidate list bounded.");
assert.match(controller, /window\.location\.protocol === "https:"[\s\S]*?!isGitHubPagesHost\(hostname\)/,
  "A same-origin HTTPS Worker or custom Worker domain may be considered as an AI candidate.");
assert.match(controller, /hostname === "github\.io" \|\| hostname\.endsWith\("\.github\.io"\)/,
  "GitHub Pages must not be mistaken for a same-origin AI Worker.");
assert.match(controller, /HEALTH_PATH = "\/api\/sprout-tutor\/health"/);
assert.match(controller, /accessToken = await getTutorAccessToken\(\)[\s\S]*?verifyTutorHealth\(candidate\.origin, accessToken, expectedIdentity\)[\s\S]*?if \(!health\?\.ready\) continue;[\s\S]*?kind: "ai"/,
  "A current parent session and authenticated candidate service must both pass before the page claims AI is ready.");
assert.match(controller, /async function verifyTutorHealth\(origin, accessToken, expectedIdentity\)[\s\S]*?method:\s*"GET"[\s\S]*?"Authorization": `Bearer \$\{accessToken\}`[\s\S]*?\[EXPECTED_OWNER_HEADER\]: expectedIdentity\.ownerId[\s\S]*?\[EXPECTED_CHILD_HEADER\]: expectedIdentity\.childId[\s\S]*?cache:\s*"no-store"[\s\S]*?credentials:\s*"omit"/,
  "The AI readiness probe must be a fresh authenticated GET without ambient browser credentials.");
assert.match(controller, /payload\.status !== "ready" \|\| payload\.authentication !== "parent-account"/,
  "The page must verify the expected authenticated tutor health contract.");
assert.doesNotMatch(controller, /if \(window\.location\.protocol === "https:" \|\| window\.location\.protocol === "http:"\)/,
  "An ordinary static or Docker preview must not pretend it has an AI backend.");
assert.match(controller, /credentials:\s*"omit"/);
assert.match(controller, /window\.KiddoSproutSession\.getAccessToken\(\)/,
  "AI requests must obtain the current parent access token instead of reading browser storage directly.");
assert.match(controller, /async function requestTutorReply[\s\S]*?const accessToken = await getTutorAccessToken\(\)[\s\S]*?method:\s*"POST"[\s\S]*?"Authorization": `Bearer \$\{accessToken\}`/,
  "AI POST requests must use a freshly obtained parent bearer token.");
assert.match(controller, /async function clearRemoteConversation[\s\S]*?accessToken = await getTutorAccessToken\(\)[\s\S]*?method:\s*"DELETE"[\s\S]*?"Authorization": `Bearer \$\{accessToken\}`/,
  "AI DELETE requests must use a freshly obtained parent bearer token.");
assert.match(controller, /async function requestTutorReply[\s\S]*?method:\s*"POST"[\s\S]*?redirect:\s*"error"/,
  "Question requests must refuse redirects so a child prompt cannot be forwarded to another origin.");
assert.match(controller, /async function clearRemoteConversation[\s\S]*?method:\s*"DELETE"[\s\S]*?redirect:\s*"error"/,
  "Conversation deletion requests must refuse redirects.");
assert.match(controller, /async function clearRemoteConversation[\s\S]*?for \(let attempt = 0; attempt < 2; attempt \+= 1\)/,
  "Conversation deletion must make one bounded retry after a temporary failure.");
assert.match(controller, /if \(!accessToken\)[\s\S]*?(?:return "signed-out"|throw new TutorRequestError)/,
  "AI POST and DELETE operations must fail closed when the parent access token is unavailable.");
assert.match(controller, /kind: "unavailable"[\s\S]*?reason: "signed-out"/,
  "A healthy Worker without a parent session must stay unavailable instead of pretending the AI is ready.");
assert.match(controller, /if \(mode\.kind !== "ai"\)[\s\S]*?unavailableStatusMessage\(mode\)[\s\S]*?return;/,
  "The submit path must fail closed before storing or sending a question when AI is unavailable.");
assert.match(controller, /function setServiceAvailability\(\)[\s\S]*?const canAsk = mode\?\.kind === "ai"[\s\S]*?dom\.message\.disabled = !canAsk[\s\S]*?dom\.message\.readOnly = busy[\s\S]*?dom\.send\.disabled = busy \|\| !canAsk/,
  "The question box must stay disabled until AI is ready and remain focus-stable/read-only while a request runs.");
assert.match(controller, /dom\.form\.addEventListener\("submit", \(event\) => event\.preventDefault\(\)\)[\s\S]*?KiddoHubGate\.protect/,
  "A synchronous submit guard must prevent native GET submission before async initialisation finishes.");
assert.match(controller, /function offerQuestionRetry[\s\S]*?lastFailedRequest[\s\S]*?async function retryLastQuestion/,
  "Transient AI failures must preserve an in-memory retry action without duplicating the learner message.");
assert.match(controller, /async function handleSubmit[\s\S]*?if \(busy \|\| actionPending\) return;[\s\S]*?actionPending = true;[\s\S]*?await currentStorageScopeMatches\(\)/,
  "Submitting must acquire a synchronous lock before the first identity-check await.");
assert.match(controller, /async function retryLastQuestion[\s\S]*?actionPending[\s\S]*?const retryRequest = \{ \.\.\.lastFailedRequest \};[\s\S]*?actionPending = true;[\s\S]*?await currentStorageScopeMatches\(\)/,
  "Retrying must snapshot the failed question and acquire a synchronous lock before awaiting.");
assert.match(controller, /error\.status === 401 \|\| error\.status === 403[\s\S]*?closeConversationForIdentityChange\(/,
  "Expired sign-in or approval must close the AI-ready conversation.");
assert.match(controller, /conversationVersion \+= 1;[\s\S]*?addTranscriptEntry\(\{ role: "user"/,
  "A new question must invalidate status callbacks from an older reset or stop operation.");
assert.match(controller, /crypto\.subtle\.digest\("SHA-256"[\s\S]*?configureScopedStorage/,
  "Transcript and session keys must use a non-reversible parent-and-child scope.");
assert.match(controller, /function clearScopedTranscripts\(\)[\s\S]*?transcript\.ai[\s\S]*?transcript\.unavailable[\s\S]*?function resetConversation\(\)[\s\S]*?clearScopedTranscripts\(\)/,
  "New chat must clear both AI and unavailable transcript slots so an old conversation cannot reappear after reconnecting.");
assert.match(controller, /window\.addEventListener\("pageshow"[\s\S]*?event\.persisted[\s\S]*?revalidateFamilyContext\(\)/,
  "Returning from the back-forward cache must revalidate the current parent and child before showing a transcript.");
assert.match(controller, /window\.addEventListener\("focus"[\s\S]*?revalidateFamilyContext\(\)/,
  "Returning to a still-open tutor tab must revalidate the parent and child.");
assert.match(controller, /document\.addEventListener\("visibilitychange"[\s\S]*?visibilityState === "visible"[\s\S]*?revalidateFamilyContext\(\)/,
  "A tutor tab becoming visible must revalidate before leaving another child's transcript on screen.");
assert.match(controller, /async function revalidateFamilyContext\(\)[\s\S]*?KiddoHubGate\.protect\(APP_ID, APP_TITLE\)[\s\S]*?currentStorageScopeMatches\(\)[\s\S]*?closeConversationForIdentityChange\(\)/,
  "A changed child or revoked approval must close the visible conversation.");
assert.match(controller, /async function requestTutorReply[\s\S]*?\[EXPECTED_OWNER_HEADER\]: expectedIdentity\.ownerId[\s\S]*?\[EXPECTED_CHILD_HEADER\]: expectedIdentity\.childId/,
  "Each AI request must bind the browser's expected parent and child for server-side comparison.");
assert.match(controller, /async function requestTutorReply[\s\S]*?if \(!await revalidateFamilyContext\(\)\) return;[\s\S]*?addTranscriptEntry\(\{ role: "tutor"/,
  "A response must not render until the current family identity has been revalidated.");
assert.match(controller, /function closeConversationForIdentityChange[\s\S]*?clearScopedTranscripts\(\)[\s\S]*?dom\.message\.value = ""[\s\S]*?renderTranscript\(\)/,
  "Changing family identity must clear both stored transcripts and the previous child's draft.");
assert.doesNotMatch(controller, /`\$\{STORAGE_PREFIX\}\.transcript\.\$\{mode\.kind\}`/,
  "The legacy cross-child transcript key must not be reused.");
assert.match(controller, /"Authorization": `Bearer \$\{accessToken\}`/,
  "Authenticated AI requests must send the current parent bearer token.");
assert.match(controller, /containsPrivateDetails\(message\)/,
  "Obvious private details must be stopped before entering the local transcript or network request.");
for (const phrase of ["me llamo", "je m'appelle", "mein name ist", "eu me chamo", "mi chiamo"]) {
  assert.equal(controller.includes(phrase), true,
    `Private-detail filtering must cover ${phrase} before browser storage.`);
}
assert.match(controller, /my birthday is\|my date of birth is\|i was born on/,
  "Birth dates must be stopped before browser storage or an AI request.");
assert.match(controller, /\(\?:I\|i\)[\s\S]*?\\p\{Lu\}/,
  "First-person introductions followed by likely title-cased names must be stopped.");
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
assert.match(controller, /request\.reason === "timeout"[\s\S]*?rotateTutorSession\(\)[\s\S]*?offerQuestionRetry/,
  "A timed-out request must rotate away from the still-active remote session before offering a retry.");
assert.match(controller, /const clearStatusVersion = statusVersion[\s\S]*?statusVersion !== clearStatusVersion/,
  "A late remote-clear result must not replace a newer validation or request status.");
assert.doesNotMatch(controller, /Math\.random\(/,
  "AI session identifiers must fail closed instead of using predictable random numbers.");
assert.match(controller, /reason: "unsupported-browser"/,
  "A browser without secure random UUID support must keep AI unavailable.");
assert.match(controller, /Stopped\. Your chat stays on this page/,
  "Stop must explain that the local transcript remains while remote context is cleared.");
assert.match(controller, /up to six recent question-and-answer pairs under a random session/,
  "AI mode must disclose its bounded remote lesson context.");
assert.doesNotMatch(controller, /createPracticeCoachReply|COACH_GUIDES|COACH_PRACTICE|Practice Coach/,
  "The frontend must not manufacture fixed answers and present them in place of the AI tutor.");
assert.match(controller, /AI tutor unavailable/,
  "A failed service check must produce an honest AI-unavailable state.");
assert.match(controller, /async function retryTutorConnection\(\)[\s\S]*?mode = await resolveTutorMode\(\)/,
  "A learner must be able to retry the real Worker connection without reloading the whole page.");
assert.match(controller, /const refreshedIdentity = readStorageIdentity\(\);[\s\S]*?refreshedIdentity !== storageIdentity[\s\S]*?closeConversationForIdentityChange\("account-changed"[\s\S]*?storageIdentity = refreshedIdentity/,
  "Retrying after a parent or child switch must clear the previous draft before adopting the new identity scope.");
assert.match(controller, /const allowed = await window\.KiddoHubGate\.protect\(APP_ID, APP_TITLE\);[\s\S]*?if \(allowed !== true\)[\s\S]*?describeMode\(\);[\s\S]*?setRequestStatus\(unavailableStatusMessage\(mode\), "error"\);[\s\S]*?return;/,
  "A failed family recheck must leave retry in a clear unavailable state instead of a permanent loading state.");

assert.match(styles, /@media\s*\(max-width:\s*(?:6[0-9]{2}|7[0-2][0-9])px\)/i,
  "The tutor needs a phone layout.");
assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/i);
assert.match(styles, /@media\s*\(forced-colors:\s*active\)/i);
assert.match(styles, /\.hidden\s*\{[\s\S]*?display:\s*none\s*!important/i,
  "The family gate's hidden class must actually hide tutor content before approval.");
assert.match(styles, /textarea::placeholder\s*\{[\s\S]*?color:\s*var\(--muted\)/,
  "Placeholder text must use the tested opaque muted colour for readable contrast.");
assert.match(styles, /\.prompt-button:not\(:disabled\):hover/,
  "Disabled prompt controls must not animate as though they were clickable.");

assert.match(config, /KIDDO_SPROUT_TUTOR_ORIGIN = ""/,
  "Source config must not invent an undeployed Worker origin.");
assert.match(config, /KIDDO_SPROUT_TUTOR_ORIGINS[\s\S]*?Object\.freeze\(configuredOrigins\)/,
  "Frontend config must support a bounded deployment-provided Worker failover list.");
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
