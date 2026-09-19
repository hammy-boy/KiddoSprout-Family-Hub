import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const [languagePacksSource, languageSource, index, app, demoSource, worker, publicBuild, notFound, offline] = await Promise.all([
  read("language-packs.js"),
  read("language-settings.js"),
  read("index.html"),
  read("js.js"),
  read("demo-mode.js"),
  read("service-worker.js"),
  read("scripts/build-public-demo.mjs"),
  read("404.html"),
  read("offline.html")
]);

function translatableElement(dataset = {}) {
  return {
    dataset,
    textContent: "",
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = String(value); }
  };
}

const translatedNode = translatableElement({ i18n: "nav.today" });
const labelledNode = translatableElement({ i18nAriaLabel: "settings.openMenu" });
const placeholderNode = translatableElement({ i18nPlaceholder: "auth.signup.passcodePlaceholder" });
const titledNode = translatableElement({ i18nTitle: "parent.blocker.previewTitle" });
const languageSelector = { dataset: { languageSetting: "" }, value: "en-GB" };
const document = {
  documentElement: { lang: "en-GB", dataset: {} },
  querySelectorAll(selector) {
    if (selector === "[data-i18n]") return [translatedNode];
    if (selector === "[data-i18n-aria-label]") return [labelledNode];
    if (selector === "[data-i18n-placeholder]") return [placeholderNode];
    if (selector === "[data-i18n-title]") return [titledNode];
    if (selector === "[data-language-setting]") return [languageSelector];
    return [];
  }
};
const window = {};
vm.runInNewContext(languagePacksSource, { window, Object }, { filename: "language-packs.js" });
vm.runInNewContext(languageSource, { window, document, Object, String }, { filename: "language-settings.js" });
const language = window.KiddoSproutLanguage;

assert.deepEqual(Array.from(language.supported), ["en-GB", "es", "fr", "pt", "de"]);
assert.equal(language.normalize("es-MX"), "es");
assert.equal(language.normalize("fr-CA"), "fr");
assert.equal(language.normalize("pt-BR"), "pt");
assert.equal(language.normalize("de-DE"), "de");
assert.equal(language.normalize("not-supported"), "en-GB");
assert.equal(language.normalize(""), "en-GB");
assert.equal(language.turnstileLanguage("en-GB"), "en");
assert.equal(language.turnstileLanguage("es"), "es");
assert.equal(language.turnstileLanguage("fr"), "fr");
assert.equal(language.turnstileLanguage("pt"), "pt");
assert.equal(language.turnstileLanguage("de"), "de");
assert.equal(language.label("fr", "fr"), "Français");
assert.equal(language.label("pt", "pt"), "Português");
assert.equal(language.label("de", "de"), "Deutsch");
assert.equal(language.text("nav.today", {}, "fr"), "Aujourd’hui");
assert.equal(language.text("nav.today", {}, "pt"), "Hoje");
assert.equal(language.text("nav.today", {}, "de"), "Heute");
assert.equal(language.text("__proto__", {}, "es"), "__proto__", "Prototype keys must not leak through translation lookup.");
assert.equal(language.text("constructor", {}, "es"), "constructor", "Inherited translation keys must fall back safely.");
assert.equal(language.text("mode.childWelcome", { name: "Sam" }, "es"), "Modo infantil de Sam");
assert.equal(language.text("schedule.activeNow", {}, "es"), "Activo ahora");
assert.equal(language.text("schedule.schoolTime", {}, "es"), "Horario escolar");
assert.equal(language.text("schedule.bedtimeActiveHelp", {}, "es"), "El horario de dormir guardado está activo ahora.");
assert.equal(language.text("theme.saved", { theme: "Noche" }, "es"), "Tema Noche guardado.");
assert.equal(
  language.text("theme.currentA11y", { resolved: "Día", choice: "Automático según la hora" }, "es"),
  "Aspecto actual: Día. Ajuste de tema: Automático según la hora."
);
assert.equal(language.text("settings.wellbeing.saved", {}, "es"), "Metas de bienestar guardadas.");
assert.equal(language.text("settings.schedule.saved", {}, "es"), "Horario familiar guardado.");
assert.equal(language.text("settings.contacts.saved", {}, "es"), "Contactos de confianza guardados.");
assert.equal(language.text("settings.contacts.cleared", {}, "es"), "Contactos de confianza eliminados.");
assert.match(language.text("settings.contacts.adjusted", {}, "es"), /20 contactos únicos/);
assert.equal(language.text("settings.secondParent.invalidEmail", {}, "es"), "Introduce un correo completo para el segundo adulto.");
assert.equal(language.text("settings.secondParent.sameEmail", {}, "es"), "Usa un correo diferente para el segundo adulto.");
assert.equal(
  language.text("theme.notSaved", {}, "es"),
  "El tema ha cambiado por ahora, pero este navegador no pudo guardarlo."
);
assert.equal(
  language.text("human.themeRearm", {}, "es"),
  "El tema ha cambiado. Marca la casilla para repetir la comprobación de seguridad."
);
assert.equal(
  language.text("schedule.range", { start: "20:30", end: "07:00" }, "es"),
  "De 20:30 a 07:00",
  "Dynamic schedule ranges must use locale-aware connecting words."
);
assert.equal(language.text("mode.childWelcome", null, "es"), "Modo infantil de {{name}}", "Invalid replacement maps must be harmless.");
assert.equal(
  language.text("hero.child.description", {}, "en-GB"),
  "Choose a hub, finish a small win, and share what you discover with someone at home."
);
assert.equal(
  language.text("hero.child.description", {}, "es"),
  "Elige un centro, completa un pequeño logro y comparte en casa lo que descubras."
);
assert.equal(language.apply("es", document), "es");
assert.equal(document.documentElement.lang, "es");
assert.equal(document.documentElement.dataset.languageMode, "es");
assert.equal(languageSelector.value, "es", "Every marked language selector must follow the applied locale.");
assert.equal(translatedNode.textContent, "Hoy");
assert.equal(labelledNode.attributes["aria-label"], "Abrir el menú de ajustes");
assert.equal(placeholderNode.attributes.placeholder, "De 4 a 8 dígitos");
assert.equal(titledNode.attributes.title, "Abrir la vista previa de solo lectura del bloqueador de juegos");
assert.equal(language.apply("unsupported", document), "en-GB");
assert.equal(document.documentElement.lang, "en-GB");
assert.equal(document.documentElement.dataset.languageMode, "en-GB");
assert.equal(languageSelector.value, "en-GB");
assert.equal(translatedNode.textContent, "Today");
assert.equal(placeholderNode.attributes.placeholder, "4–8 digits");

assert.equal(language.text("auth.google.onboardingTitle", {}, "es"), "¡Google confirmó tu correo!");
assert.equal(language.text("settings.loggingOut", {}, "es"), "Cerrando sesión…");
assert.equal(language.text("auth.signup.confirmationTitle", {}, "es"), "Ahora confirma tu correo");
assert.equal(language.text("auth.signup.confirmationChange", {}, "es"), "Cambiar correo / Empezar de nuevo");
assert.equal(language.text("auth.accountRecovery.title", {}, "es"), "Restablecer la contraseña de la cuenta");
assert.equal(language.text("auth.accountRecovery.finishingAction", {}, "es"), "Finalizando…");
assert.equal(language.text("auth.recovery.send", {}, "es"), "Enviar código de un solo uso");
assert.equal(language.text("auth.parent.description", {}, "es"), "Introduce el PIN parental para abrir aprobaciones, límites de pantalla, filtros e informes.");
assert.equal(
  language.text("auth.recovery.unavailableTitle", {}, "en-GB"),
  "Open Parent PIN recovery details and see what still needs to be enabled."
);
assert.equal(
  language.text("auth.signup.unavailableActionTitle", {}, "es"),
  "Abre los detalles de registro de la cuenta y consulta qué falta por activar."
);
assert.equal(
  language.text("auth.signup.progress.step", {
    step: 2,
    total: 3,
    label: language.text("auth.signup.progress.safety", {}, "es"),
    state: language.text("auth.signup.progress.current", {}, "es")
  }, "es"),
  "Paso 2 de 3: Comprobación de seguridad. Paso actual.",
  "Dynamic signup progress announcements must follow the selected language."
);

const subtreeDocument = { documentElement: { lang: "en-GB" } };
const subtree = {
  dataset: { i18n: "nav.reports", i18nAriaLabel: "nav.dashboardSections" },
  ownerDocument: subtreeDocument,
  textContent: "",
  attributes: {},
  matches: () => true,
  querySelectorAll: () => [],
  setAttribute(name, value) { this.attributes[name] = String(value); }
};
language.apply("es", subtree);
assert.equal(subtree.textContent, "Informes", "Applying a language to a subtree must include its root element.");
assert.equal(subtree.attributes["aria-label"], "Secciones del panel");
assert.equal(subtreeDocument.documentElement.lang, "es");

const keys = [...index.matchAll(/data-i18n(?:-(?:aria-label|placeholder|title))?="([^"]+)"/g)].map((match) => match[1]);
assert.ok(new Set(keys).size >= 80, "The visible dashboard shell needs meaningful translation coverage.");
for (const key of new Set(keys)) {
  assert.notEqual(language.text(key, {}, "en-GB"), key, `Missing English fallback for ${key}.`);
  assert.notEqual(language.text(key, {}, "es"), key, `Missing Spanish translation for ${key}.`);
}

for (const key of [
  "auth.google.loginTitle",
  "auth.google.signupHelp",
  "auth.google.onboardingHelp",
  "auth.signup.progress.label",
  "auth.signup.familyName",
  "auth.signup.confirmationTitle",
  "auth.signup.confirmationChange",
  "auth.signup.createAndSend",
  "auth.signup.noteHelp",
  "auth.parent.title",
  "auth.parent.description",
  "auth.parent.pin",
  "auth.parent.forgot",
  "auth.google.recoveryHelp",
  "auth.recovery.email",
  "auth.recovery.send",
  "auth.recovery.reset",
  "auth.accountRecovery.open",
  "auth.accountRecovery.title",
  "auth.accountRecovery.send",
  "auth.accountRecovery.newPassword",
  "auth.accountRecovery.confirmPassword",
  "auth.accountRecovery.viewPassword",
  "auth.accountRecovery.update"
]) {
  assert.ok(
    index.includes(`data-i18n="${key}"`) || index.includes(`data-i18n-aria-label="${key}"`),
    `${key} must be attached to its visible auth control.`
  );
}

for (const selector of ["quickLanguageModeSetting", "languageModeSetting"]) {
  const match = index.match(new RegExp(`<select id="${selector}"[^>]*>([\\s\\S]*?)<\\/select>`));
  assert.ok(match, `Missing ${selector}.`);
  assert.deepEqual(
    [...match[1].matchAll(/<option value="([^"]+)"/g)].map((option) => option[1]),
    ["en-GB", "es", "fr", "pt", "de"],
    `${selector} must expose the same supported languages.`
  );
  assert.match(match[0], /data-language-setting/, `${selector} must opt into shared selector synchronisation.`);
}

assert.ok(
  index.indexOf("document.documentElement.lang = language") < index.indexOf('<link rel="stylesheet"'),
  "The saved language must reach the document before visible dashboard content loads."
);
for (const key of [
  "settings.theme.help",
  "settings.language.help",
  "settings.passcode",
  "settings.passcode.placeholder",
  "settings.passcode.view",
  "settings.passcode.update",
  "settings.secondParent.save",
  "settings.wellbeing.waterGoal",
  "settings.wellbeing.eyeGoal",
  "settings.wellbeing.save",
  "settings.schedule.schoolStart",
  "settings.schedule.schoolEnd",
  "settings.schedule.bedtimeStart",
  "settings.schedule.morningUnlock",
  "settings.schedule.save",
  "settings.contacts.trusted",
  "settings.contacts.placeholder",
  "settings.contacts.help",
  "settings.contacts.save"
]) {
  assert.ok(index.includes(`="${key}"`), `${key} must be attached to its Advanced Settings control.`);
  assert.notEqual(language.text(key, {}, "es"), key, `${key} must have real Spanish copy.`);
}

assert.ok(index.indexOf("language-packs.js") < index.indexOf("language-settings.js"), "Additional language packs must load before the language helper.");
assert.ok(index.indexOf("language-settings.js") < index.indexOf("js.js"), "The language helper must load before the app.");
assert.match(app, /"languageMode": "en-GB"/);
assert.match(app, /KiddoSproutLanguage\?\.normalize\?\.\(state\.languageMode\)/);
assert.match(app, /KiddoSproutDemo\.write\(state\)/, "Demo language changes must use tab-scoped state.");
assert.match(app, /persistSafeFamilyPreferences\(state\)/,
  "Live language changes must persist only the harmless display preference locally.");
assert.match(app, /familyStateApi\.save\(snapshot, \{ expectedOwnerId: ownerId \}\)/,
  "Signed-in language changes must also use the owner-scoped family state.");
assert.doesNotMatch(app, /localStorage\.setItem\("kiddosproutState"/,
  "Language changes must never restore the complete readable family document to localStorage.");
assert.match(app, /language: window\.KiddoSproutLanguage\?\.turnstileLanguage\?\.\(state\?\.languageMode\) \|\| "en"/);
assert.match(app, /rearmHumanCheck\(kind, translate\("human\.rearm"/, "Changing locale must discard an active CAPTCHA token.");
assert.match(app, /childMode \? "hero\.child\.description" : "hero\.parent\.description"/,
  "Mode-aware language refresh must keep child-facing hero copy in child mode.");
assert.match(app, /async function saveDisplayPreferences[\s\S]*?savedInBrowser[\s\S]*?savedInFamilyState[\s\S]*?savedInBrowser \|\| \(Boolean\(ownerId\) && savedInFamilyState\)/,
  "Display choices must count safe browser persistence even when a parent is signed out, while retaining verified account persistence as a fallback.");
assert.match(app, /async function saveLanguageMode[\s\S]*?const saved = await saveDisplayPreferences\(\)/,
  "Language changes must verify that their selected persistence store accepted the update.");
assert.match(app, /translate\("language\.notSaved"/,
  "Storage failures must not be announced as a successful saved preference.");
assert.match(app, /function updateThemeStatus[\s\S]*?translate\(\s*"theme\.currentA11y"/,
  "The resolved theme indicator must expose a translated accessible name.");
for (const key of [
  "settings.passcode.useDigits",
  "settings.passcode.securing",
  "settings.passcode.couldNotSave",
  "settings.passcode.updated",
  "settings.secondParent.completeBoth",
  "settings.secondParent.saved",
  "settings.secondParent.cleared",
  "settings.wellbeing.saved",
  "settings.schedule.saved",
  "settings.contacts.saved",
  "settings.contacts.adjusted",
  "settings.contacts.cleared"
]) {
  assert.ok(app.includes(`"${key}"`), `${key} must be used by the dynamic Advanced Settings state.`);
}
assert.match(app, /async function saveThemeMode[\s\S]*?const saved = await saveDisplayPreferences\(\)/,
  "Theme changes must verify that their selected persistence store accepted the update.");
assert.match(app, /translate\("theme\.notSaved"/,
  "A failed theme write must not be announced as a saved preference.");
assert.match(app, /translate\("human\.themeRearm"/,
  "CAPTCHA reset guidance must follow the newly selected language after a theme change.");
assert.match(app, /function setSignupProgress[\s\S]*?translate\(\s*"auth\.signup\.progress\.step"/,
  "Dynamic signup progress aria-labels must use the language helper.");
assert.match(app, /signupProgressStage = stage === "complete" \|\| stages\.includes\(stage\)/,
  "A completed signup must remain completed when its progress labels are translated.");
assert.match(app, /function applyLanguageMode[\s\S]*?updateGoogleAuthPresentation\(\);[\s\S]*?setSignupProgress\(signupProgressStage\);/,
  "Changing language must redraw Google onboarding and the current signup progress state.");
assert.match(app, /translate\("auth\.signup\.googleNoteHelp"/,
  "Google onboarding must not overwrite Spanish copy with a hard-coded English explanation.");
assert.match(app, /function updateAuthActionButtons[\s\S]*?"auth\.recovery\.busy"[\s\S]*?translate\(busyKey/,
  "Recovery actions must keep their translated label while a request is running.");
assert.match(app, /function updateAuthActionButtons[\s\S]*?auth\.accountRecovery\.sending[\s\S]*?auth\.accountRecovery\.updating/,
  "Account-password recovery buttons must keep translated busy labels.");
assert.match(app, /function applyLanguageMode[\s\S]*?setAccountPasswordRecoveryStage\(accountPasswordUpdateFields\.hidden \? "request" : "update"\)/,
  "Changing language must redraw the currently visible account-password recovery stage.");
assert.match(app, /if \(!child\) \{[\s\S]*?translate\("parent\.noRequest"[\s\S]*?translate\("parent\.noRequestHelp"/,
  "No-child request copy must update immediately when the locale changes.");
assert.match(app, /renderFamilySchedule\(\{ syncInputs: false \}\);[\s\S]*?const child = currentChild\(\)/,
  "Changing language must redraw the dynamic schedule before either child or parent-only state returns.");
const scheduleBlock = app.slice(
  app.indexOf("function renderFamilySchedule"),
  app.indexOf("function refreshTimeSensitiveDashboard")
);
for (const key of [
  "schedule.bedtimeHours",
  "schedule.schoolTime",
  "schedule.freeTime",
  "schedule.range",
  "schedule.school",
  "schedule.bedtime",
  "schedule.schoolActiveHelp",
  "schedule.schoolSaved",
  "schedule.bedtimeActiveHelp",
  "schedule.bedtimeSaved"
]) {
  assert.ok(scheduleBlock.includes(`"${key}"`), `Dynamic schedule rendering must use ${key}.`);
}
const bedtimeBlock = app.slice(
  app.indexOf("function renderBedtimeStatus"),
  app.indexOf("function renderParentNote")
);
for (const key of ["schedule.activeNow", "schedule.scheduled", "schedule.off"]) {
  assert.ok(bedtimeBlock.includes(`"${key}"`), `Bedtime status rendering must use ${key}.`);
}
assert.match(app, /window\.addEventListener\("storage", syncPreferencesFromStorage\)/,
  "Live family tabs must refresh when another tab changes the family language.");
assert.match(app, /event\?\.storageArea && event\.storageArea !== window\.localStorage/,
  "Session-storage and unrelated storage events must not overwrite the live-family language.");
assert.match(app, /state\.languageMode = language;\s*applyLanguageMode\(language\);/,
  "A same-language cross-tab write must still repair selector and translated-shell drift.");
assert.match(app, /const preferencesCleared = event\?\.key === null[\s\S]*?event\?\.key === FAMILY_PREFERENCES_KEY && event\.newValue === null[\s\S]*?themeMode: "auto", languageMode: "en-GB"/,
  "Removing or clearing safe preferences in another tab must reset stale display settings.");
assert.match(app, /const generation = \+\+displayPreferenceSaveGeneration[\s\S]*?generation !== displayPreferenceSaveGeneration/,
  "A slow earlier display save must not announce stale UI state after a newer choice.");
assert.match(app, /translate\("settings\.loggingOut"[\s\S]*?translate\("settings\.logout"/,
  "The settings menu logout action must stay translated throughout its async state.");
assert.match(app, /if \(isDemoMode\(\) \|\| \(!preferencesCleared && event\?\.key !== FAMILY_PREFERENCES_KEY\)\) return/,
  "Tab-scoped demos must ignore safe live-family preference events.");
for (const key of [
  "parent.appRule.group",
  "parent.appRule.allowed",
  "parent.appRule.request",
  "parent.appRule.blocked",
  "parent.appStatus.paused",
  "parent.appStatus.allowed",
  "parent.appStatus.blocked",
  "parent.appStatus.request",
  "parent.appAction.paused",
  "parent.appAction.open",
  "parent.appAction.blocked",
  "parent.appAction.request",
  "app.close"
]) {
  assert.notEqual(language.text(key, { app: "Explorer Lab" }, "es"), key, `${key} needs Spanish shell copy.`);
  assert.ok(app.includes(`"${key}"`) || index.includes(`="${key}"`), `${key} must be used by the dashboard shell.`);
}
assert.match(app, /renderAppAccessRules\(child\);\s*renderHubAccess\(child\);/,
  "Changing language must redraw dynamic app-rule buttons and their accessible labels.");
assert.match(worker, /"\/language-settings\.js"/);
assert.match(worker, /"\/language-packs\.js"/);
assert.match(publicBuild, /"language-settings\.js"/);
assert.match(publicBuild, /"language-packs\.js"/);
for (const [name, source] of [["404", notFound], ["offline", offline]]) {
  assert.match(source, /\["en-GB", "es", "fr", "pt", "de"\]/,
    `${name} page must follow every supported saved language.`);
  assert.match(source, /document\.documentElement\.lang = selectedLanguage/,
    `${name} page must expose its selected language to assistive technology.`);
  assert.match(source, /document\.addEventListener\?\.\("DOMContentLoaded", applyTheme\)/,
    `${name} page must translate visible content after its DOM is available.`);
  for (const languageCode of ["es", "fr", "pt", "de"]) {
    assert.match(source, new RegExp(`${languageCode}: \\{`),
      `${name} page must provide real ${languageCode} fallback copy.`);
  }
}
for (const id of ["not-found-skip", "not-found-heading", "not-found-message", "not-found-home"]) {
  assert.match(notFound, new RegExp(`id="${id}"`), `404 page is missing translatable target ${id}.`);
}
for (const id of ["offline-skip", "offline-heading", "offline-message", "offline-options", "retry-page", "offline-home"]) {
  assert.match(offline, new RegExp(`id="${id}"`), `Offline page is missing translatable target ${id}.`);
}

class StorageMock {
  constructor(entries = {}) { this.values = new Map(Object.entries(entries)); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(String(key)); }
}
const realState = JSON.stringify({ languageMode: "en-GB", familyName: "Private family" });
const localStorage = new StorageMock({ kiddosproutState: realState });
const sessionStorage = new StorageMock();
const demoWindow = { localStorage, sessionStorage, KIDDO_SPROUT_SUPABASE: {} };
vm.runInNewContext(demoSource, { window: demoWindow, JSON, Object, String }, { filename: "demo-mode.js" });
assert.equal(demoWindow.KiddoSproutDemo.start({ languageMode: "es" }), true);
assert.equal(demoWindow.KiddoSproutDemo.read().languageMode, "es");
assert.equal(localStorage.getItem("kiddosproutState"), realState, "Demo language selection changed live family storage.");

class ThrowingStorage {
  getItem() { throw new Error("blocked"); }
  setItem() { throw new Error("blocked"); }
  removeItem() { throw new Error("blocked"); }
}
const blockedDemoWindow = {
  localStorage: new ThrowingStorage(),
  sessionStorage: new ThrowingStorage(),
  KIDDO_SPROUT_SUPABASE: {}
};
vm.runInNewContext(demoSource, { window: blockedDemoWindow, JSON, Object, String }, { filename: "demo-mode-blocked.js" });
assert.equal(blockedDemoWindow.KiddoSproutDemo.active(), false);
assert.equal(blockedDemoWindow.KiddoSproutDemo.start({ languageMode: "es" }), false, "Blocked storage must fail closed without throwing.");

new Function(languagePacksSource);
new Function(languageSource);
new Function(app);
console.log("Language settings passed: English, Spanish, French, Portuguese, and German choices, synced persistence, offline copy, and CAPTCHA locale safety.");
