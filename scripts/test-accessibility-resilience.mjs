import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

const sharedStyles = ["style.css", "kid-hubs.css", "blocker-setup.css", "story-voices.css"];
for (const relativePath of sharedStyles) {
  const source = await read(relativePath);
  assert.match(source, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, `${relativePath} must respect reduced motion`);
  assert.match(source, /@media\s*\(prefers-contrast:\s*more\)/, `${relativePath} must strengthen high-contrast presentation`);
  assert.match(source, /@media\s*\(forced-colors:\s*active\)/, `${relativePath} must support forced-colours mode`);
  assert.match(source, /outline:\s*3px solid Highlight/, `${relativePath} must preserve a system-colour focus indicator`);
  assert.match(source, /(?:button|:where\([^)]*button)[^{]*:disabled[\s\S]{0,500}?opacity:\s*1/, `${relativePath} must keep disabled buttons legible`);
}

const standalonePages = ["404.html", "report_problem.html", "app_7.html", "recipe.html"];
for (const relativePath of standalonePages) {
  const source = await read(relativePath);
  assert.match(source, /@media\s*\(prefers-contrast:\s*more\)/, `${relativePath} must respond to increased contrast`);
  assert.match(source, /@media\s*\(forced-colors:\s*active\)/, `${relativePath} must support forced-colours mode`);
  assert.match(source, /outline:\s*3px solid Highlight/, `${relativePath} must use the system highlight for keyboard focus`);
}

const mainStyle = await read("style.css");
assert.match(
  mainStyle,
  /:where\(summary, \[role="button"\], \[tabindex\]:not\(\[tabindex="-1"\]\)\):focus-visible/,
  "shared dashboard styles must expose keyboard focus on custom interactive controls"
);
assert.match(
  mainStyle,
  /@media\s*\(forced-colors:\s*active\)[\s\S]*?\.switch input\s*\{[\s\S]*?opacity:\s*1;/,
  "custom switches must expose their native checkbox in forced-colours mode"
);
assert.match(
  mainStyle,
  /@media\s*\(forced-colors:\s*active\)[\s\S]*?\.switch::before,[\s\S]*?\.switch \.knob\s*\{[\s\S]*?display:\s*none;/,
  "forced-colours mode must not cover the native checkbox with decorative switch parts"
);
assert.ok(
  mainStyle.lastIndexOf(".switch input:disabled") > mainStyle.indexOf("input:disabled,"),
  "disabled-field colours must not make the normally transparent switch checkbox cover its custom rail"
);
assert.match(mainStyle, /\.view-password\s*\{[\s\S]*?min-height:\s*24px;/,
  "password-visibility checkbox labels must provide a 24px target at every viewport size");

const [blockerPage, blockerScript, blockerStyle] = await Promise.all([
  read("blocker-setup.html"),
  read("blocker-setup.js"),
  read("blocker-setup.css")
]);
assert.match(blockerScript, /function setConfirmPINRequired[\s\S]*?confirmField\.contains\(document\.activeElement\)[\s\S]*?pinInput\.focus\(\{ preventScroll: true \}\)[\s\S]*?confirmField\.hidden/,
  "an async blocker check must move focus before hiding the PIN confirmation field");
assert.doesNotMatch(blockerScript, /confirmField\.hidden\s*=\s*pinConfigured/,
  "blocker status checks must use the focus-safe confirmation-field helper");
assert.match(blockerStyle, /\.unsigned-note a\s*\{[\s\S]*?min-height:\s*44px;/,
  "the live blocker checksum download must meet the shared touch-target size");
assert.match(blockerPage, /id="blocker-enrollment-fields"[\s\S]*?hidden/,
  "first-time parent reauthentication controls must start hidden until the API confirms no PIN exists");
assert.match(blockerPage, /human-check\.js\?v=4/,
  "the blocker enrollment page must load the reviewed shared human-check helper");
assert.match(blockerScript, /setEnrollmentRequired\(!pinConfigured\)/,
  "the password and safety check must be shown only for first-time blocker PIN enrollment");
assert.match(blockerPage, /blocker-setup\.css\?v=10/);
assert.match(blockerPage, /blocker-setup\.js\?v=19/);

const recipePage = await read("recipe.html");
assert.match(
  recipePage,
  /body\s*\{[\s\S]*?--focus-ring:\s*#5f2fac;/,
  "FlavorNest must use an opaque, high-contrast day focus ring."
);
assert.match(
  recipePage,
  /html\.theme-night body:not\(\.auth-page\)\s*\{[\s\S]*?--focus-ring:\s*#ffe08a;/,
  "FlavorNest night mode must use a bright focus ring."
);
assert.match(
  recipePage,
  /\.recipe-card:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--focus-ring\)/,
  "Recipe cards must use the same visible focus indicator as other controls."
);
assert.match(
  recipePage,
  /:is\(\.btn-ghost, \.back-btn, \.add-row-btn, \.remove-row-btn\):disabled[\s\S]{0,240}?background:\s*#38515a;/,
  "FlavorNest's disabled editor controls must retain a night-mode palette."
);
assert.match(
  recipePage,
  /\.detail-actions \.btn-ghost\s*\{[^}]*min-height:\s*44px;/,
  "recipe detail actions must meet the shared touch-target size"
);
assert.match(
  recipePage,
  /\.recipe-delete-dialog\s*\{[\s\S]*?max-height:\s*calc\(100dvh - 28px\);[\s\S]*?overflow-y:\s*auto;[\s\S]*?overscroll-behavior:\s*contain;/,
  "the recipe removal dialog must remain usable in short and zoomed viewports"
);

const mainPage = await read("index.html");
assert.match(mainPage, /style\.css\?v=33/);
assert.match(mainPage, /id="accountPasswordRecoveryPanel" hidden inert aria-hidden="true"/,
  "inactive password-recovery controls must be hidden from keyboard and assistive-technology navigation");
assert.match(mainPage, /id="emailConfirmationCard" hidden inert aria-hidden="true"/,
  "inactive email-confirmation controls must be hidden from keyboard and assistive-technology navigation");
assert.match(mainPage, /id="restartEmailSignup" type="button"/,
  "the email-confirmation escape path must be keyboard-native");
const mainScript = await read("js.js");
assert.match(mainScript, /accountPasswordRecoveryPanel\.scrollIntoView[\s\S]{0,300}?accountPasswordNew\.focus\(\{ preventScroll: true \}\)/,
  "password recovery must scroll the revealed panel before assigning focus");
assert.match(mainScript, /signupEmail\.scrollIntoView[\s\S]{0,300}?signupEmail\.focus\(\{ preventScroll: true \}\)/,
  "starting email signup over must reveal the email field before assigning focus");

const smartSpendingPage = await read("app_7.html");
assert.match(
  smartSpendingPage,
  /dialog\s*\{[\s\S]*?max-height:\s*calc\(100dvh - 32px\);[\s\S]*?overflow-y:\s*auto;[\s\S]*?overscroll-behavior:\s*contain;/,
  "Smart Spending dialogs must remain scrollable inside short dynamic viewports"
);
assert.match(
  smartSpendingPage,
  /heading\.id = "smartSpendingGateTitle";[\s\S]*?heading\.tabIndex = -1;[\s\S]*?document\.body\.replaceChildren\(main\);[\s\S]*?heading\.focus\(\{ preventScroll: true \}\);/,
  "an asynchronously rendered Smart Spending access gate must receive programmatic focus"
);

const hubStyle = await read("kid-hubs.css");
assert.ok(
  hubStyle.lastIndexOf(":where(button, input, select, textarea):disabled") > hubStyle.indexOf(".record-controls button:disabled"),
  "the legible shared disabled-control rule must override older opacity-only hub styles"
);

function relativeLuminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((channel) => Number.parseInt(channel, 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4);
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrastRatio(first, second) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const light = Math.max(firstLuminance, secondLuminance);
  const dark = Math.min(firstLuminance, secondLuminance);
  return (light + 0.05) / (dark + 0.05);
}

const storyFocusSelectors = [
  ".series-library:focus-visible",
  ".series-choose-button:focus-visible",
  ".series-book-ready:focus-visible",
  ".book-page:focus-visible",
  ".story-scene:focus",
  ".story-voice-mood:focus-visible",
  ".choose-sound-button:focus-visible"
];
for (const selector of storyFocusSelectors) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(
    hubStyle,
    new RegExp(`${escapedSelector}\\s*\\{[^}]*outline:\\s*3px solid #fff;[^}]*box-shadow:\\s*0 0 0 [67]px #5b3a82;`),
    `${selector} must preserve the opaque dual day-theme focus ring`
  );
}
assert.ok(
  contrastRatio("5b3a82", "ffffff") >= 3,
  "the Story Theater day focus ring must have at least 3:1 contrast against its light surfaces"
);
assert.ok(
  contrastRatio("ffda7b", "102934") >= 3,
  "the inherited Story Theater night focus ring must have at least 3:1 contrast against its dark cards"
);

console.log("Accessibility resilience checks passed.");
