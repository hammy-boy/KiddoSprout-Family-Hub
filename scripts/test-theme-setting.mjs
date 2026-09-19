import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const pageNames = [
  "recipe.html",
  "app_7.html",
  "blocker-setup.html",
  "creator-studio.html",
  "nature-explorer.html",
  "move-breaks.html",
  "story-theater.html",
  "story-voices.html",
  "report_problem.html",
  "offline.html",
  "404.html"
];
const [app, ...pages] = await Promise.all([
  readFile(new URL("js.js", root), "utf8"),
  ...pageNames.map((name) => readFile(new URL(name, root), "utf8"))
]);

const style = await readFile(new URL("style.css", root), "utf8");
const index = await readFile(new URL("index.html", root), "utf8");
assert.match(style, /:root\s*\{[\s\S]*?--focus-ring:\s*#5b3a82;/,
  "Day mode must use a dark focus ring with at least 3:1 contrast against light panels.");
assert.match(style, /body\.theme-night\s*\{[\s\S]*?--focus-ring:\s*#ffe08a;/,
  "Night mode must use a bright focus ring with at least 3:1 contrast against dark panels.");
assert.match(style, /button:focus-visible,[\s\S]*?outline:\s*3px solid var\(--focus-ring\)/,
  "Interactive controls must use the theme-specific high-contrast focus ring.");
assert.doesNotMatch(style, /outline:\s*3px solid color-mix\(in srgb, var\(--gold\) 72%, white 28%\)/,
  "The low-contrast pale-gold focus outline must not return.");
assert.ok(
  index.indexOf('document.documentElement.classList.add(`theme-${resolved}`)') < index.indexOf('<link rel="stylesheet"'),
  "The dashboard must resolve its saved theme before loading CSS to avoid a day-theme flash at night."
);
assert.match(index, /<body>\s*<a class="skip-link"[\s\S]*?<script>[\s\S]*?document\.body\.classList\.add\(`theme-\$\{resolved\}`\)[\s\S]*?<section class="demo-banner"/,
  "The keyboard skip link must remain first while the resolved theme reaches the body before visible dashboard content is parsed.");
assert.match(index, /<output[^>]+id="themeModeStatus"[^>]+aria-live="polite"[^>]*>/,
  "Current look must be a live output instead of an extra readonly text-field stop.");
assert.match(index, /<output[^>]+id="quickThemeModeStatus"[^>]+aria-live="polite"[^>]*>/,
  "Quick Settings must show whether Auto currently resolved to Day or Night.");
assert.match(style, /\.theme-mode-status\s*\{[\s\S]*?min-height:\s*44px/,
  "The semantic theme output must retain the visible control-sized presentation.");
assert.match(style, /\.theme-mode-status::before\s*\{[\s\S]*?content:\s*"☀"/,
  "Day mode must use an unambiguous sun indicator.");
assert.match(style, /body\.theme-night \.theme-mode-status::before\s*\{[\s\S]*?content:\s*"☾"/,
  "Night mode must replace the sun with an unambiguous moon indicator.");
assert.match(style, /\.settings-menu select\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;/,
  "Long translated language and theme options must fit a narrow settings menu.");

assert.match(
  app,
  /function resolveTheme[\s\S]*?hour >= 19 \|\| hour < 7 \? "night" : "day"/,
  "The dashboard must keep the documented 19:00–06:59 automatic night window."
);
assert.match(app, /function syncPreferencesFromStorage[\s\S]*?event\?\.key !== FAMILY_PREFERENCES_KEY[\s\S]*?state\.themeMode = theme;[\s\S]*?applyThemeMode\(theme\)/,
  "The dashboard must pick up a safe theme preference changed in another family tab.");
assert.match(app, /function updateThemeStatus[\s\S]*?output\.dataset\.resolvedTheme = resolved;[\s\S]*?output\.setAttribute\("aria-label"/,
  "Theme indicators must keep their visual state and accessible label in sync.");
assert.match(app, /updateThemeStatus\(themeModeStatus, themeChoice, resolved\);[\s\S]*?updateThemeStatus\(quickThemeModeStatus, themeChoice, resolved\);/,
  "Advanced and Quick Settings must report the same resolved theme.");
assert.doesNotMatch(app, /passcodeSettingStatus\.style\.color\s*=/,
  "Advanced Settings status feedback must use theme-aware classes instead of a day-only inline colour.");
assert.match(app, /window\.addEventListener\("storage", syncPreferencesFromStorage\)/);
assert.match(app, /window\.addEventListener\("pageshow", refreshAutomaticTheme\)/,
  "The dashboard must refresh Auto theme when restored from the back-forward cache.");
assert.match(app, /document\.visibilityState === "visible"\) refreshAutomaticTheme\(\)/,
  "The dashboard must refresh Auto theme after a sleeping or backgrounded tab returns.");
assert.match(app, /const preferencesCleared = event\?\.key === null[\s\S]*?themeMode: "auto", languageMode: "en-GB"/,
  "Clearing saved preferences in another tab must restore automatic theme instead of leaving stale night/day state.");

pageNames.forEach((name, index) => {
  const source = pages[index];
  assert.match(source, /const hour = new Date\(\)\.getHours\(\)/, `${name} must read the current hour.`);
  assert.match(source, /hour >= 19 \|\| hour < 7/, `${name} must use the dashboard's automatic night window.`);
  assert.doesNotMatch(source, /const prefersNight\s*=|media\?\.matches\s*\?\s*"night"/, `${name} must not silently switch Auto by time back to the operating-system theme.`);
});

for (const name of pageNames) {
  const source = pages[pageNames.indexOf(name)];
  assert.match(source, /typeof window\.setInterval === "function"/, `${name} must tolerate restricted browser-like contexts without timers.`);
  assert.match(source, /setInterval[\s\S]*?60000/, `${name} must refresh the automatic theme while it stays open.`);
  assert.match(source, /["']pageshow["'][\s\S]*?apply(?:Saved)?Theme/,
    `${name} must refresh its theme when restored from the browser's back-forward cache.`);
  assert.match(source, /document\.visibilityState === "visible"[\s\S]*?apply(?:Saved)?Theme\(\)/,
    `${name} must refresh Auto theme when a sleeping or backgrounded tab returns.`);
  assert.match(source, /event\??\.key === "kiddosproutPreferences"[\s\S]*?apply(?:Saved)?Theme\(\)/,
    `${name} must pick up a theme changed in another family tab.`);
  assert.doesNotMatch(source, /localStorage\.(?:getItem|setItem)\(["']kiddosproutState["']\)/,
    `${name} must not read the complete legacy family document before authentication.`);
}

for (const name of ["offline.html", "404.html"]) {
  const source = pages[pageNames.indexOf(name)];
  assert.match(source, /html\.theme-night\s*\{/, `${name} must honour an explicitly saved night theme.`);
  assert.match(source, /html:not\(\.theme-day\):not\(\.theme-night\)/,
    `${name} may use the operating-system dark theme only as a no-script fallback.`);
  assert.doesNotMatch(source, /@media \(prefers-color-scheme: dark\)\s*\{\s*:root/,
    `${name} must not let an operating-system dark theme override an explicitly saved day theme.`);
}

const reportSource = pages[pageNames.indexOf("report_problem.html")];
assert.doesNotMatch(reportSource, /localStorage\.(?:getItem|setItem)\(["']kiddosproutState["']/,
  "Problem Reports must read only the non-sensitive preference record before authenticating.");

const storySource = pages[pageNames.indexOf("story-theater.html")];
assert.match(storySource, /document\.visibilityState === "visible"[\s\S]*?applyTheme\(\)/,
  "A long reading session must refresh Auto theme as soon as a sleeping or backgrounded tab returns.");
assert.match(storySource, /event\?\.key === "kiddosproutPreferences"[\s\S]*?applyTheme\(\)/,
  "Story Theater must pick up a theme changed in another family tab.");

console.log("Theme settings passed: every public page uses the same time-based day/night rule.");
