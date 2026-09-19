import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const [index, app, style, liveInteractionAudit, livePageAudit] = await Promise.all([
  read("index.html"),
  read("js.js"),
  read("style.css"),
  read("scripts/audit-live-interactions.mjs"),
  read("scripts/audit-live-browser.mjs")
]);

assert.doesNotMatch(style, /font-size:\s*(?:10|11)px/,
  "Shared interface labels must remain readable instead of shrinking to 10–11px.");
assert.match(index, /<picture>[\s\S]*?<source srcset="family-tech-hub-v[0-9a-f]{12}\.avif" type="image\/avif">[\s\S]*?<source srcset="family-tech-hub-v[0-9a-f]{12}\.webp" type="image\/webp">[\s\S]*?class="hero-photo" src="family-tech-hub-v[0-9a-f]{12}\.jpg" width="1672" height="941"[^>]*fetchpriority="high"/,
  "The home hero should negotiate modern formats, reserve its space, and be prioritised for first paint.");
assert.doesNotMatch(index, /family-tech-hub\.png/,
  "The home page must not request the oversized PNG hero.");
assert.match(style, /\.hero > picture\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?inset:\s*0;[\s\S]*?z-index:\s*-2;/,
  "The responsive hero picture must not become an extra grid row or shift the hero content.");
assert.match(style, /\.hero-photo\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;[\s\S]*?object-fit:\s*cover;/,
  "The negotiated hero image must fill its positioned picture wrapper.");
assert.match(liveInteractionAudit, /Emulation\.setEmulatedMedia[\s\S]*?prefers-reduced-motion[\s\S]*?reduce/,
  "The live interaction audit must disable decorative perpetual motion in headless Chrome.");
assert.match(liveInteractionAudit, /querySelector\('#resetDemo'\)\?\.click\(\)/,
  "The repeatable live audit must reset its fictional tab data before interaction assertions.");
assert.match(livePageAudit, /loadedUrl\.startsWith\("chrome-error:\/\/"\)/,
  "The live page audit must reject Chrome's network error document.");
assert.match(livePageAudit, /new URL\(loadedUrl\)\.origin !== baseUrl\.origin/,
  "The live page audit must reject unexpected cross-origin navigation.");
assert.match(livePageAudit, /const failedResults = results\.filter[\s\S]*?result\.navigationProblem[\s\S]*?if \(failedResults\.length\)[\s\S]*?process\.exitCode = 1/,
  "Navigation failures must make the live page audit fail instead of producing a false pass.");
assert.match(livePageAudit, /"#login",\s*"#signup"/,
  "The live page audit must cover both public account-form routes.");

function functionRange(source, firstName, nextName) {
  const firstMarker = source.indexOf(`function ${firstName}`);
  const nextMarker = source.indexOf(`function ${nextName}`, firstMarker);
  assert.notEqual(firstMarker, -1, `Missing ${firstName}.`);
  assert.notEqual(nextMarker, -1, `Missing boundary after ${firstName}.`);
  const start = source.slice(firstMarker - 6, firstMarker) === "async " ? firstMarker - 6 : firstMarker;
  const end = source.slice(nextMarker - 6, nextMarker) === "async " ? nextMarker - 6 : nextMarker;
  return source.slice(start, end);
}

assert.match(index, /id="settingsToggle"[^>]*aria-haspopup="dialog"/,
  "The Quick Settings trigger must expose the kind of popup it opens.");
assert.match(index, /id="settingsMenu"[^>]*role="dialog"[^>]*aria-modal="false"[^>]*aria-hidden="true"[^>]*inert/,
  "Closed Quick Settings must be unavailable to focus and assistive technology.");
assert.match(style, /\.settings-menu\s*\{[\s\S]*?visibility:\s*hidden;/);
assert.match(style, /\.settings-menu\.open\s*\{[\s\S]*?visibility:\s*visible;/);
assert.match(style, /\.settings-menu\s*\{[\s\S]*?overflow-y:\s*auto;[\s\S]*?overscroll-behavior:\s*contain;/,
  "Quick Settings must scroll inside a short phone or landscape viewport.");
assert.match(style, /\.settings-menu\.open #settingsClose\s*\{[\s\S]*?visibility:\s*visible;/,
  "The first quick-settings control must be focusable while the menu begins its transition.");
assert.match(app, /settingsMenu\.setAttribute\("aria-hidden", String\(!open\)\)/);
assert.match(app, /settingsMenu\.removeAttribute\("inert"\)/);
assert.match(app, /settingsMenu\.setAttribute\("inert", ""\)/);
assert.match(app, /settingsClose\.focus\(\)/);
assert.match(app, /settingsMenu\.getBoundingClientRect\(\);\s*fitSettingsMenuToViewport\(\);\s*settingsClose\.focus\(\)/,
  "Quick Settings must apply its visible layout before moving keyboard focus inside it.");
const settingsViewportFit = functionRange(app, "fitSettingsMenuToViewport", "setSettingsMenu");
assert.match(settingsViewportFit, /window\.visualViewport/);
assert.match(settingsViewportFit, /viewport\.offsetTop \+ viewport\.height/,
  "Quick Settings must fit the currently visible mobile viewport, including an on-screen keyboard.");
assert.match(settingsViewportFit, /viewportBottom - Math\.max\(0, menuTop\) - 16/);
assert.doesNotMatch(app, /requestAnimationFrame\(\(\) => settingsClose\.focus/,
  "Opening quick settings must not depend on an animation frame before moving focus.");
assert.match(app, /settingsMenu\.classList\.contains\("open"\)[\s\S]*?!settingsMenu\.contains\(document\.activeElement\)[\s\S]*?settingsClose\.focus\(\{ preventScroll: true \}\)/,
  "Quick settings must recover focus after a delayed mode-entry callback.");
assert.match(app, /closeSettingsMenu\(\{ restoreFocus: true \}\)/);
const settingsMenuClose = functionRange(app, "closeSettingsMenu", "openParentSettingsFromMenu");
assert.match(settingsMenuClose, /const ownedFocus = settingsMenu\.contains\(document\.activeElement\)/);
assert.match(settingsMenuClose, /ownedFocus && options\.restoreFocus !== false/,
  "Closing Quick Settings must not leave focus stranded inside its newly inert subtree.");
const parentSettingsNavigation = functionRange(app, "openParentSettingsFromMenu", "logoutKiddoSprout");
const parentSettingsModeChange = parentSettingsNavigation.indexOf('setMode("parent")');
const parentSettingsFocus = parentSettingsNavigation.indexOf('target.querySelector("summary")?.focus({ preventScroll: true })');
assert.ok(parentSettingsModeChange >= 0 && parentSettingsFocus > parentSettingsModeChange,
  "Quick Parent settings must focus its visible summary after changing modes.");
assert.match(parentSettingsNavigation, /viewMode !== "parent" \|\| parentGate\.classList\.contains\("open"\)\) return/,
  "Quick Parent settings must not steal focus from an authentication gate.");
assert.match(parentSettingsNavigation, /cancelPendingModeEntryFocus\(\);[\s\S]*?target\.querySelector\("summary"\)\?\.focus/,
  "Quick Parent settings must cancel the superseded delayed page-entry focus request.");
assert.match(parentSettingsNavigation, /scrollToJumpTarget\(target\)/,
  "Quick Parent settings must account for the sticky header when it scrolls into view.");
assert.doesNotMatch(parentSettingsNavigation, /setTimeout|requestAnimationFrame/,
  "Quick Parent settings must not use delayed focus that can override a later user action.");

assert.match(index, /id="secondParentNameSetting"[^>]*maxlength="80"[^>]*aria-describedby="secondParentStatus"/,
  "The second-parent name must have the same bounded length and nearby status as signup.");
assert.match(index, /id="secondParentEmailSetting"[^>]*maxlength="254"[^>]*aria-describedby="secondParentStatus"/,
  "The second-parent email must have the same bounded length and nearby status as signup.");
assert.match(index, /id="secondParentStatus"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/,
  "Second-parent validation needs a persistent live status beside the settings fields.");

assert.match(index, /id="trustedContactsInput"[^>]*maxlength="2000"[^>]*aria-describedby="trustedContactsHelp trustedContactsStatus"/,
  "Trusted contacts need a bounded input and nearby help/status relationship.");
assert.match(index, /id="trustedContactsHelp"[^>]*data-i18n="settings\.contacts\.help"/,
  "Trusted-contact limits need translated visible guidance.");
assert.match(index, /id="trustedContactsStatus"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/,
  "Trusted-contact save adjustments need a persistent live status.");

const trustedContactConstants = app.match(/const TRUSTED_CONTACT_LIMIT = \d+;\s*const TRUSTED_CONTACT_NAME_LIMIT = \d+;/)?.[0] || "";
const trustedContactNormalizerSource = functionRange(app, "normalizeTrustedContacts", "makeChildId");
assert.ok(trustedContactConstants, "Missing trusted-contact safety limits.");
const normalizeTrustedContacts = new Function(
  `${trustedContactConstants}\n${trustedContactNormalizerSource}\nreturn normalizeTrustedContacts;`
)();
const oversizedLoadedContacts = [
  "  Mum  ",
  "mum",
  "X".repeat(120),
  ...Array.from({ length: 30 }, (_, index) => `Contact ${index}`),
  null
];
const boundedLoadedContacts = normalizeTrustedContacts(oversizedLoadedContacts);
assert.equal(boundedLoadedContacts.contacts.length, 20,
  "An oversized loaded family state must be capped before rendering.");
assert.equal(new Set(boundedLoadedContacts.contacts.map((contact) => contact.toLowerCase())).size, 20,
  "Loaded trusted contacts must be de-duplicated case-insensitively.");
assert.ok(boundedLoadedContacts.contacts.every((contact) => contact.length <= 80),
  "No loaded trusted-contact name may exceed its per-name limit.");
assert.equal(boundedLoadedContacts.adjusted, true);
assert.match(functionRange(app, "normalizePrivateFamilyState", "legacyStateMatchesSession"),
  /normalized\.trustedContacts = normalizeTrustedContacts\(normalized\.trustedContacts\)\.contacts/,
  "Cloud and legacy family state must be bounded at the normalization boundary.");
assert.match(functionRange(app, "ensureChildAppState", "escapeHtml"),
  /state\.trustedContacts = normalizeTrustedContacts\([\s\S]*?state\.trustedContacts \?\? DEFAULT_STATE\.trustedContacts[\s\S]*?\)\.contacts/,
  "Existing in-memory family state must be repaired before child controls render.");
assert.match(functionRange(app, "renderTrustedContacts", "renderMoodCheckins"),
  /const normalized = normalizeTrustedContacts\(state\.trustedContacts\);[\s\S]*?state\.trustedContacts = contacts/,
  "Trusted-contact rendering must fail bounded even if state is changed after loading.");

const trustedContactSaveSource = functionRange(app, "saveTrustedContacts", "submitProblemReport");
const trustedContactState = { trustedContacts: [] };
const trustedContactsInput = { value: "" };
const trustedContactsStatus = { textContent: "", dataset: {}, removeAttribute() {} };
let trustedContactSaveCount = 0;
let trustedContactRenderCount = 0;
const trustedContactToasts = [];
const saveTrustedContacts = new Function(
  "state",
  "trustedContactsInput",
  "trustedContactsStatus",
  "renderTrustedContacts",
  "queueSave",
  "setTranslatedText",
  "setAuthStatus",
  "showToast",
  `${trustedContactConstants}\n${trustedContactNormalizerSource}\n${trustedContactSaveSource}\nreturn saveTrustedContacts;`
)(
  trustedContactState,
  trustedContactsInput,
  trustedContactsStatus,
  () => { trustedContactRenderCount += 1; },
  () => { trustedContactSaveCount += 1; },
  (element, key, fallback) => {
    element.dataset.i18n = key;
    element.textContent = fallback;
  },
  (element, message, stateName) => {
    element.textContent = message;
    element.dataset.state = stateName;
  },
  (message, options) => { trustedContactToasts.push({ message, options }); }
);
trustedContactsInput.value = [
  "  Mum  ",
  "MUM",
  "Y".repeat(120),
  ...Array.from({ length: 30 }, (_, index) => `Person ${index}`)
].join("\n");
saveTrustedContacts();
assert.equal(trustedContactState.trustedContacts.length, 20,
  "Pasted trusted contacts must not bloat saved family state.");
assert.ok(trustedContactState.trustedContacts.every((contact) => contact.length <= 80));
assert.equal(trustedContactsStatus.dataset.i18n, "settings.contacts.adjusted");
assert.equal(trustedContactsStatus.dataset.state, "notice");
assert.equal(trustedContactToasts.at(-1).options.announce, false,
  "The nearby live status should announce adjusted saves without a duplicate toast announcement.");

trustedContactsInput.value = "  Mum  \n  School   office  ";
saveTrustedContacts();
assert.deepEqual(trustedContactState.trustedContacts, ["Mum", "School office"]);
assert.equal(trustedContactsStatus.dataset.i18n, "settings.contacts.saved");
assert.equal(trustedContactsStatus.dataset.state, "success");

trustedContactsInput.value = "";
saveTrustedContacts();
assert.deepEqual(trustedContactState.trustedContacts, [], "Clearing the trusted-contact field must still work.");
assert.equal(trustedContactsStatus.dataset.i18n, "settings.contacts.cleared");
assert.equal(trustedContactSaveCount, 3);
assert.equal(trustedContactRenderCount, 3);

const childConstantsStart = app.indexOf("const CHILD_PROFILE_LIMIT");
const childConstantsEnd = app.indexOf("const todayTasks", childConstantsStart);
assert.ok(childConstantsStart >= 0 && childConstantsEnd > childConstantsStart,
  "Missing child-profile safety limits.");
const childConstants = app.slice(childConstantsStart, childConstantsEnd);
const pendingRequestNormalizers = functionRange(app, "emptyPendingRequest", "updatePendingRequestView");
const familyStateNormalizers = functionRange(app, "isPlainFamilyRecord", "normalizePrivateFamilyState");
const childStateSafety = new Function(
  "APP_CATALOG",
  "APP_RULE_VALUES",
  "todayTasks",
  "dailyGoalItems",
  `${childConstants}\n${pendingRequestNormalizers}\n${familyStateNormalizers}\nreturn { isPlainFamilyRecord, isSafeChildProfileId, normalizeChildProfile, normalizeChildProfiles, normalizeFamilyCollections };`
)(
  {
    studio: { defaultRule: "request" },
    explore: { defaultRule: "allowed" },
    move: { defaultRule: "allowed" },
    story: { defaultRule: "allowed" },
    recipe: { defaultRule: "allowed" },
    spending: { defaultRule: "allowed" },
    arcade: { defaultRule: "request" },
    flyer: { defaultRule: "request" },
    gameSites: { defaultRule: "blocked" },
    roblox: { defaultRule: "blocked" }
  },
  new Set(["allowed", "request", "blocked"]),
  ["chore", "explore", "move", "story"].map((id) => ({ id })),
  ["learn", "move", "read", "kind", "safe"].map((id) => ({ id }))
);

const malformedProfiles = childStateSafety.normalizeChildProfiles({
  nullChild: null,
  textChild: "broken",
  arrayChild: [],
  valid: {
    name: "A".repeat(120),
    report: "broken",
    streaks: [],
    requests: {},
    currentRequest: {},
    creatorQueue: {},
    completedTasks: {},
    dailyWins: [],
    readingLog: "broken",
    achievementChart: {},
    appRules: "broken",
    dailyLimit: 999,
    usedToday: 99999,
    blockedHits: -4,
    careNote: "N".repeat(700)
  }
}, "nullChild");
assert.deepEqual(Object.keys(malformedProfiles.children), ["valid"],
  "Null, scalar, and array child rows must be removed before rendering.");
assert.equal(malformedProfiles.activeChild, "valid",
  "A removed active child must fall back to the first usable profile.");
const repairedChild = malformedProfiles.children.valid;
assert.equal(repairedChild.name.length, 80);
assert.equal(repairedChild.careNote.length, 500);
assert.equal(repairedChild.dailyLimit, 300);
assert.equal(repairedChild.usedToday, 1440);
assert.equal(repairedChild.blockedHits, 0);
assert.deepEqual(repairedChild.report, { Explorer: 0, Stories: 0, Movement: 0, Games: 0 });
assert.deepEqual(repairedChild.streaks, { reading: 0, homework: 0, exercise: 0, chores: 0 });
assert.deepEqual(repairedChild.requests, []);
assert.deepEqual(repairedChild.creatorQueue, []);
assert.deepEqual(repairedChild.completedTasks, []);
assert.deepEqual(repairedChild.dailyWins, {});
assert.deepEqual(repairedChild.readingLog, []);
assert.deepEqual(repairedChild.achievementChart, []);

const defaultChildFactory = new Function(
  `${functionRange(app, "createDefaultChild", "setUnderFiveWarning")}; return createDefaultChild;`
)();
const defaultChild = defaultChildFactory("Child", "", "", "Tablet", "star", "#147d7f", "Explorer", "", "", "");
assert.deepEqual(
  Object.keys(repairedChild).filter((key) => key !== "appRules").sort(),
  Object.keys(defaultChild).sort(),
  "Normalization must retain every field the app creates for a child profile."
);
for (const costume of ["Explorer", "Space Pilot", "Story Wizard", "Dance Captain", "Ocean Guide", "Inventor"]) {
  assert.equal(childStateSafety.normalizeChildProfile({ name: "Child", costume }).costume, costume,
    `The valid ${costume} costume must survive normalization.`);
}

const manyProfiles = Object.fromEntries(Array.from({ length: 25 }, (_, index) => [`child-${index + 1}`, { name: `Child ${index + 1}` }]));
const cappedProfiles = childStateSafety.normalizeChildProfiles(manyProfiles, "child-25");
assert.equal(Object.keys(cappedProfiles.children).length, 20);
assert.equal(cappedProfiles.activeChild, "child-25");
assert.ok(cappedProfiles.children["child-25"], "The active valid profile must survive collection capping.");
assert.deepEqual(
  childStateSafety.normalizeChildProfiles({ ["x".repeat(161)]: { name: "Long ID" }, constructor: { name: "Unsafe" } }, "constructor"),
  { children: Object.create(null), activeChild: "" },
  "Oversized and unsafe child IDs must be discarded."
);

const validActivity = {
  safetyAlerts: [{ child: "Ada", message: "Asked for help", time: "10:15" }],
  moodCheckins: [{ child: "Ada", mood: "Curious", time: "10:16" }],
  problemReports: [{ child: "Ada", type: "Link", urgency: "Review", note: "Please check", time: "10:17", status: "New" }],
  scanHistory: [{ label: "example.com", result: "Allowed", time: "10:18" }],
  familyRules: ["Use kind words"],
  chores: [{ title: "Tidy desk" }]
};
assert.deepEqual(childStateSafety.normalizeFamilyCollections(validActivity), validActivity,
  "Valid activity, rule, and chore rows must remain exact.");
const activityIdentity = {
  id: "report-1700000000000-example",
  childId: "child-a",
  child: "Same Name",
  type: "Link",
  urgency: "Review",
  note: "Please check",
  time: "10:17",
  createdAt: "2026-09-18T10:17:00.000Z",
  status: "New"
};
assert.deepEqual(
  childStateSafety.normalizeFamilyCollections({ problemReports: [activityIdentity] }).problemReports[0],
  activityIdentity,
  "Activity normalization must retain the stable child ID and event metadata used by private exports."
);
assert.deepEqual(
  childStateSafety.normalizeFamilyCollections({
    safetyAlerts: [{ childId: "Unsafe Child ID", child: "Ada", message: "Help", time: "10:15", createdAt: "not-a-date" }]
  }).safetyAlerts[0],
  { child: "Ada", message: "Help", time: "10:15" },
  "Invalid activity identity metadata must not survive normalization."
);
const badCollections = childStateSafety.normalizeFamilyCollections({
  safetyAlerts: Array.from({ length: 110 }, () => ({ child: "C".repeat(100), message: "M".repeat(700), time: "T".repeat(100) })),
  moodCheckins: "broken",
  problemReports: {},
  scanHistory: Array.from({ length: 20 }, () => ({ label: "L".repeat(100), result: "R".repeat(100), time: "T".repeat(100) })),
  familyRules: "broken",
  chores: [null, " Wash dishes ", { title: "C".repeat(300) }]
});
assert.equal(badCollections.safetyAlerts.length, 100);
assert.equal(badCollections.safetyAlerts[0].child.length, 80);
assert.equal(badCollections.safetyAlerts[0].message.length, 500);
assert.deepEqual(badCollections.moodCheckins, []);
assert.deepEqual(badCollections.problemReports, []);
assert.equal(badCollections.scanHistory.length, 12);
assert.deepEqual(badCollections.familyRules, []);
assert.equal(badCollections.chores.length, 2);
assert.equal(badCollections.chores[0].title, "Wash dishes");
assert.equal(badCollections.chores[1].title.length, 160);

const familyActivityForChild = new Function(
  "isSafeChildProfileId",
  "isPlainFamilyRecord",
  `${functionRange(app, "familyActivityForChild", "exportWeeklySummary")}\nreturn familyActivityForChild;`
)(childStateSafety.isSafeChildProfileId, childStateSafety.isPlainFamilyRecord);
const sameNameFamilyRows = [
  { childId: "child-a", child: "Same Name", message: "Selected child" },
  { childId: "child-b", child: "Same Name", message: "Sibling" },
  { child: "Same Name", message: "Legacy unassigned record" }
];
assert.deepEqual(
  familyActivityForChild(sameNameFamilyRows, "child-a"),
  [sameNameFamilyRows[0]],
  "Weekly exports must select activity by stable profile ID, never by a shared or changed display name."
);
assert.deepEqual(familyActivityForChild(sameNameFamilyRows, "Unsafe Child ID"), [],
  "An invalid active profile ID must not export any family activity.");

const familyEventWrites = [...app.matchAll(/state\.(?:safetyAlerts|moodCheckins|problemReports|scanHistory)\.unshift\(\{([\s\S]*?)\n\s*\}\);/g)];
assert.equal(familyEventWrites.length, 9, "The dashboard activity-writer inventory changed; review export ownership coverage.");
familyEventWrites.forEach(([, row], index) => {
  assert.match(row, /\bchildId:/, `Dashboard activity writer ${index + 1} must attach a stable child profile ID.`);
});
assert.match(functionRange(app, "createDemoState", "demoBlockedMessage"),
  /safetyAlerts:[\s\S]*?childId: "demo-child"[\s\S]*?moodCheckins:[\s\S]*?childId: "demo-child"/,
  "Demo activity seeds must carry the same stable child identity as live records.");

const weeklyExportSource = functionRange(app, "exportWeeklySummary", "stopFocusTimer");
assert.match(weeklyExportSource, /const childId = state\.activeChild;/);
assert.match(weeklyExportSource, /child:\s*\{\s*id: childId,/,
  "The weekly summary must identify the selected profile with its stable ID.");
for (const collection of ["safetyAlerts", "moodCheckins", "problemReports", "scanHistory"]) {
  assert.match(weeklyExportSource, new RegExp(`${collection}: familyActivityForChild\\(state\\.${collection}, childId\\)`),
    `The weekly summary must filter ${collection} to the selected child profile.`);
}
assert.doesNotMatch(weeklyExportSource, /\.child\s*===\s*child\.name|child\.name\s*===\s*[^\n]*\.child/,
  "Weekly export privacy must never depend on a child's editable display name.");

const secondParentSaverStart = app.indexOf("function saveSecondParent");
const secondParentSaverEnd = app.indexOf("async function loginKiddoSprout", secondParentSaverStart);
assert.ok(secondParentSaverStart >= 0 && secondParentSaverEnd > secondParentSaverStart,
  "Missing bounded second-parent settings handler.");
const secondParentSaverSource = app.slice(secondParentSaverStart, secondParentSaverEnd);
const emailValidatorSource = functionRange(app, "isValidEmailAddress", "setAuthStatus");
const fieldStatusSource = functionRange(app, "setAuthStatus", "isAccountExistenceDisclosure");
function runSecondParentSave({ name, email, parentEmail, initialName = "Existing", initialEmail = "existing@example.com" }) {
  let focused = "";
  let saveCount = 0;
  const toasts = [];
  const makeInput = (value, label) => ({
    value,
    attributes: {},
    setAttribute(key, nextValue) { this.attributes[key] = String(nextValue); },
    removeAttribute(key) { delete this.attributes[key]; },
    focus() { focused = label; }
  });
  const secondParentNameSetting = makeInput(name, "name");
  const secondParentEmailSetting = makeInput(email, "email");
  const secondParentStatus = {
    id: "secondParentStatus",
    textContent: "",
    dataset: {},
    attributes: {},
    classList: { toggle() {} },
    setAttribute(key, nextValue) { this.attributes[key] = String(nextValue); }
  };
  const state = {
    parentEmail,
    secondParentName: initialName,
    secondParentEmail: initialEmail
  };
  const saveSecondParent = new Function(
    "secondParentNameSetting",
    "secondParentEmailSetting",
    "secondParentStatus",
    "state",
    "queueSave",
    "showToast",
    "translate",
    `${emailValidatorSource}\n${fieldStatusSource}\n${secondParentSaverSource}\nreturn saveSecondParent;`
  )(
    secondParentNameSetting,
    secondParentEmailSetting,
    secondParentStatus,
    state,
    () => { saveCount += 1; },
    (message, options) => { toasts.push({ message, options }); },
    (key, variables, fallback) => fallback
  );
  saveSecondParent();
  return {
    focused,
    saveCount,
    secondParentNameSetting,
    secondParentEmailSetting,
    secondParentStatus,
    state,
    toasts
  };
}

const invalidSecondParent = runSecondParentSave({
  name: "Other Parent",
  email: "not-an-email",
  parentEmail: "parent@example.com"
});
assert.equal(invalidSecondParent.saveCount, 0);
assert.equal(invalidSecondParent.state.secondParentEmail, "existing@example.com",
  "An invalid settings email must not replace the saved second parent.");
assert.equal(invalidSecondParent.focused, "email");
assert.equal(invalidSecondParent.secondParentEmailSetting.attributes["aria-invalid"], "true");
assert.equal(invalidSecondParent.secondParentEmailSetting.attributes["aria-errormessage"], "secondParentStatus");
assert.equal(invalidSecondParent.secondParentStatus.attributes.role, "alert");
assert.equal(invalidSecondParent.secondParentStatus.attributes["aria-live"], "assertive");

const duplicateSecondParent = runSecondParentSave({
  name: "Other Parent",
  email: " PARENT@example.com ",
  parentEmail: "parent@example.com"
});
assert.equal(duplicateSecondParent.saveCount, 0);
assert.equal(duplicateSecondParent.focused, "email");
assert.match(duplicateSecondParent.secondParentStatus.textContent, /different email/i);

const validSecondParent = runSecondParentSave({
  name: " Other Parent ",
  email: " OTHER@example.com ",
  parentEmail: "parent@example.com"
});
assert.equal(validSecondParent.saveCount, 1);
assert.equal(validSecondParent.state.secondParentName, "Other Parent");
assert.equal(validSecondParent.state.secondParentEmail, "other@example.com");
assert.equal(validSecondParent.secondParentStatus.dataset.state, "success");
assert.equal(validSecondParent.toasts.at(-1).options.announce, false,
  "The nearby live status should announce success without a duplicate toast announcement.");

const clearedSecondParent = runSecondParentSave({
  name: "",
  email: "",
  parentEmail: "parent@example.com"
});
assert.equal(clearedSecondParent.saveCount, 1);
assert.equal(clearedSecondParent.state.secondParentName, "");
assert.equal(clearedSecondParent.state.secondParentEmail, "");
assert.match(clearedSecondParent.secondParentStatus.textContent, /cleared/i);

const incompleteSecondParent = runSecondParentSave({
  name: "Other Parent",
  email: "",
  parentEmail: "parent@example.com"
});
assert.equal(incompleteSecondParent.secondParentEmailSetting.attributes["aria-invalid"], "true");
assert.equal(incompleteSecondParent.secondParentStatus.dataset.state, "error");
incompleteSecondParent.secondParentNameSetting.value = "";
const clearSecondParentValidationSource = functionRange(app, "clearSecondParentValidation", "saveSecondParent");
const clearSecondParentValidation = new Function(
  "secondParentNameSetting",
  "secondParentEmailSetting",
  "secondParentStatus",
  `${fieldStatusSource}\n${clearSecondParentValidationSource}\nreturn clearSecondParentValidation;`
)(
  incompleteSecondParent.secondParentNameSetting,
  incompleteSecondParent.secondParentEmailSetting,
  incompleteSecondParent.secondParentStatus
);
clearSecondParentValidation();
assert.equal(incompleteSecondParent.secondParentNameSetting.attributes["aria-invalid"], undefined);
assert.equal(incompleteSecondParent.secondParentEmailSetting.attributes["aria-invalid"], undefined,
  "Fixing a partial second-parent pair via the other field must clear the stale field error.");
assert.equal(incompleteSecondParent.secondParentEmailSetting.attributes["aria-errormessage"], undefined);
assert.equal(incompleteSecondParent.secondParentStatus.textContent, "",
  "Fixing a partial second-parent pair must clear the shared stale error message.");
assert.equal(incompleteSecondParent.secondParentStatus.dataset.state, "notice");
assert.match(app, /\[secondParentNameSetting, secondParentEmailSetting\]\.forEach\(\(input\) => \{\s*input\.addEventListener\("input", clearSecondParentValidation\);\s*\}\)/,
  "Editing either second-parent field must run the shared validation reset.");

const routeUpdaterSource = functionRange(app, "updateRoute", "syncModalBackgroundInert");
const routeCalls = [];
const routeWindow = {
  location: { hash: "#login" },
  history: {
    pushState(...args) { routeCalls.push(["pushState", ...args]); },
    replaceState(...args) { routeCalls.push(["replaceState", ...args]); }
  }
};
const updateRoute = new Function("window", `${routeUpdaterSource}; return updateRoute;`)(routeWindow);
updateRoute("child");
assert.deepEqual(routeCalls.at(-1), ["pushState", { mode: "child" }, "", "#child"]);
updateRoute("parent", { replace: true });
assert.deepEqual(routeCalls.at(-1), ["replaceState", { mode: "parent" }, "", "#parent"],
  "Redirecting a Back/Forward route must replace it instead of trapping the user in a new history entry.");

const heroChildMode = functionRange(app, "openChildModeFromHero", "unlockParent");
assert.match(heroChildMode, /setMode\("child"\);[\s\S]*?viewMode !== "child"[\s\S]*?childWelcome\.setAttribute\("tabindex", "-1"\);[\s\S]*?childWelcome\.focus\(\{ preventScroll: true \}\)/,
  "The hero Child Mode action must focus visible child content after its trigger disappears.");
assert.match(app, /querySelector\("#heroChildMode"\)\.addEventListener\("click", openChildModeFromHero\)/);

assert.match(index, /class="tabs" role="group" aria-label="Filter Kid Hubs"/);
assert.doesNotMatch(index, /class="tabs" role="tablist"/);
assert.equal((index.match(/data-filter="[^\"]+" aria-pressed="(?:true|false)"/g) || []).length, 5);
assert.match(index, /data-filter="play" aria-pressed="false"/,
  "The child hub needs a dedicated Play filter for its game choices.");
assert.match(index, /class="hub-card arcade" data-kind="play"[\s\S]*?data-app-status-label="arcade"[\s\S]*?data-open-app="arcade"/,
  "Sprout Arcade must expose the same parent-rule status and launch control as other hubs.");
assert.match(app, /item\.setAttribute\("aria-pressed", String\(selected\)\)/);
assert.match(app, /card\.hidden = filter !== "all" && card\.dataset\.kind !== filter/);
assert.match(style, /\.hub-card\[hidden\]\s*\{\s*display:\s*none;/);

assert.match(index, /data-jump="today"[^>]*aria-current="location"/);
assert.match(app, /item\.setAttribute\("aria-current", "location"\)/);
assert.match(app, /item\.removeAttribute\("aria-current"\)/);
assert.match(index, /id="profileStrip" role="group" aria-label="Child profiles"/);
assert.match(app, /class="profile-btn[^>]*aria-pressed="\$\{id === state\.activeChild\}"/);
const profileRenderer = functionRange(app, "renderProfiles", "renderReport");
assert.match(profileRenderer, /const childId = button\.dataset\.child;[\s\S]*?state\.activeChild = childId;[\s\S]*?render\(\);[\s\S]*?candidate\.dataset\.child === childId[\s\S]*?selectedButton\?\.focus\(\{ preventScroll: true \}\)/,
  "Switching profiles must restore focus to the selected button after rerendering it.");

const dailyGoalRenderer = functionRange(app, "renderDailyGoalBoard", "renderKindnessQuest");
assert.ok(
  dailyGoalRenderer.includes('data-daily-win="${goal.id}" aria-pressed="${done}"'),
  "Daily goal buttons must expose whether each goal is complete."
);
const completeDailyWin = functionRange(app, "completeDailyWin", "resetDailyWins");
const dailyGoalRerender = completeDailyWin.indexOf("renderControls(child);");
const dailyGoalFocus = completeDailyWin.indexOf('document.querySelector(`[data-daily-win="${goalId}"]`)?.focus({ preventScroll: true });');
assert.ok(dailyGoalRerender >= 0 && dailyGoalFocus > dailyGoalRerender,
  "Completing a Daily Goal must restore focus to its replacement button.");
assert.doesNotMatch(functionRange(app, "completeTask", "resetTodayPlan"), /data-daily-win|goalId/,
  "Daily Goal focus restoration must not leak into the Today Plan completion path.");
const todayPlanRenderer = functionRange(app, "renderTodayPlan", "renderAppAccessRules");
assert.match(todayPlanRenderer, /data-task-card="\$\{task\.id\}" tabindex="-1" aria-labelledby="today-task-title-\$\{task\.id\}"/,
  "Today Plan cards must be programmatically focusable and named after rerendering.");
const completeTodayTask = functionRange(app, "completeTask", "resetTodayPlan");
const todayTaskRerender = completeTodayTask.indexOf("renderControls(child);");
const todayTaskFocus = completeTodayTask.indexOf('document.querySelector(`[data-task-card="${taskId}"]`)?.focus({ preventScroll: true });');
assert.ok(todayTaskRerender >= 0 && todayTaskFocus > todayTaskRerender,
  "Completing a Today Plan task must restore meaningful focus after rerendering.");

const closeAchievementPrompt = functionRange(app, "closeAchievementPasscodePrompt", "updateAchievementLockout");
assert.match(closeAchievementPrompt, /options\.restoreFocus === true[\s\S]*?openAchievementLockButton\.focus\(\{ preventScroll: true \}\)/,
  "Cancelling the Achievement PIN prompt must restore focus to its opener.");
const lockAchievementControls = functionRange(app, "lockAchievementControls", "renderAchievementChart");
assert.match(lockAchievementControls, /renderAchievementChart\(currentChild\(\)\)[\s\S]*?options\.restoreFocus === true[\s\S]*?openAchievementLockButton\.focus\(\{ preventScroll: true \}\)/,
  "Locking Achievement controls must restore focus after the editor is hidden.");
const achievementBindingStart = app.indexOf('cancelAchievementUnlockButton.addEventListener("click"');
const achievementBindingEnd = app.indexOf('document.querySelector("#addAchievement")', achievementBindingStart);
assert.ok(achievementBindingStart >= 0 && achievementBindingEnd > achievementBindingStart,
  "Missing Achievement control event bindings.");
const achievementBindings = app.slice(achievementBindingStart, achievementBindingEnd);
assert.match(achievementBindings, /cancelAchievementUnlockButton\.addEventListener\("click", \(\) => closeAchievementPasscodePrompt\(\{ restoreFocus: true \}\)\)/);
assert.match(achievementBindings, /lockAchievementEditorButton\.addEventListener\("click", \(\) => lockAchievementControls\(\{ restoreFocus: true \}\)\)/);
assert.match(achievementBindings, /event\.key === "Escape"[\s\S]*?closeAchievementPasscodePrompt\(\{ restoreFocus: true \}\)/,
  "Escape from the Achievement PIN prompt must use the focus-restoring close path.");

const achievementRenderer = functionRange(app, "renderAchievementChart", "addAchievementGoal");
assert.ok(
  achievementRenderer.includes('class="achievement-actions" role="group" aria-label="Parent controls for ${escapeHtml(achievement.title)}"'),
  "Each Achievement action set needs a named group."
);
assert.ok(
  achievementRenderer.includes('aria-label="${complete ? "Completed" : "Complete"} ${escapeHtml(achievement.title)}"'),
  "Achievement completion controls need the goal title in their accessible names."
);
assert.ok(
  achievementRenderer.includes('aria-label="Remove ${escapeHtml(achievement.title)}"'),
  "Achievement removal controls need the goal title in their accessible names."
);

const appAccessRulesRenderer = functionRange(app, "renderAppAccessRules", "renderHubAccess");
assert.ok(
  appAccessRulesRenderer.includes('const groupLabel = translate("parent.appRule.group"')
    && appAccessRulesRenderer.includes('role="group" aria-label="${escapeHtml(groupLabel)}"'),
  "Each app's access choices need an accessible group name."
);
for (const rule of ["allowed", "request", "blocked"]) {
  assert.ok(
    appAccessRulesRenderer.includes(`aria-pressed="\${rule === "${rule}"}"`),
    `The ${rule} app access choice must expose its selected state.`
  );
}
assert.ok(
  appAccessRulesRenderer.includes('document.querySelector(`[data-app-rule="${appId}"][data-rule="${rule}"]`)?.focus({ preventScroll: true });'),
  "Changing an app access rule must restore focus after the controls rerender."
);

const appRuleFunctions = functionRange(app, "normalizeAppRules", "appRuleLabel");
const appRules = new Function(`
  const APP_CATALOG = {
    spending: { defaultRule: "allowed" },
    arcade: { defaultRule: "request" },
    flyer: { defaultRule: "request" },
    gameSites: { defaultRule: "blocked" },
    roblox: { defaultRule: "blocked" }
  };
  const APP_RULE_VALUES = new Set(["allowed", "request", "blocked"]);
  const HOMEWORK_PAUSED_APP_IDS = new Set(["arcade", "flyer", "gameSites", "roblox"]);
  ${appRuleFunctions}
  return { normalizeAppRules, getAppRule, effectiveAppRule };
`)();
const protectedRules = {
  appRules: { spending: "blocked", arcade: "allowed", flyer: "allowed", gameSites: "not-a-rule", roblox: "allowed" },
  flyerAllowed: true,
  homeworkMode: false
};
appRules.normalizeAppRules(protectedRules);
assert.equal(protectedRules.appRules.spending, "blocked",
  "A parent's Smart Spending rule must not be reset to Allowed during rendering.");
assert.equal(protectedRules.appRules.gameSites, "blocked",
  "An invalid stored game-site rule must fall back to its safe Block default.");
protectedRules.homeworkMode = true;
assert.equal(appRules.effectiveAppRule(protectedRules, "arcade"), "blocked",
  "Homework Mode must temporarily pause an otherwise allowed Sprout Arcade.");
assert.equal(appRules.effectiveAppRule(protectedRules, "flyer"), "blocked",
  "Homework Mode must temporarily block an otherwise allowed game.");
assert.equal(appRules.effectiveAppRule(protectedRules, "roblox"), "blocked",
  "Homework Mode must temporarily block allowed external game sites.");
protectedRules.homeworkMode = false;
assert.equal(appRules.getAppRule(protectedRules, "arcade"), "allowed",
  "Ending Homework Mode must restore the parent's saved Sprout Arcade rule.");
assert.equal(appRules.getAppRule(protectedRules, "flyer"), "allowed",
  "Ending Homework Mode must restore the parent's saved game rule.");
const malformedRules = { appRules: "corrupted", homeworkMode: false };
assert.doesNotThrow(() => appRules.normalizeAppRules(malformedRules));
assert.equal(malformedRules.appRules.gameSites, "blocked");
assert.equal(malformedRules.appRules.arcade, "request",
  "A missing Sprout Arcade rule must safely fall back to Ask parent.");
assert.doesNotMatch(app, /child\.appRules\.spending\s*=\s*"allowed"/,
  "Normalisation must never force Smart Spending back to Allowed.");
const extensionRules = functionRange(app, "extensionBlockRules", "broadcastExtensionBlockRules");
assert.match(extensionRules, /rule:\s*effectiveAppRule\(child, id\)/,
  "The browser blocker must receive Homework Mode's effective game rules.");
assert.match(app, /const hubPages\s*=\s*\{[\s\S]*?arcade:\s*"games\/index\.html"[\s\S]*?if \(hubPages\[app\]\) \{[\s\S]*?window\.location\.href = hubPages\[app\]/,
  "An approved Sprout Arcade must navigate through an explicit portable index path.");

const familyScheduleRenderer = functionRange(app, "renderFamilySchedule", "refreshTimeSensitiveDashboard");
assert.match(familyScheduleRenderer, /const bedtimeEnabled = Boolean\(child\?\.bedtime\)/);
assert.match(familyScheduleRenderer, /const bedtimeNow = bedtimeEnabled && isNowInsideRange/,
  "The child schedule must not claim bedtime is active when that profile's bedtime switch is off.");
assert.match(familyScheduleRenderer, /schedule\.bedtimeOffHelp/,
  "An off bedtime schedule needs an explicit explanation instead of an active-window message.");
assert.match(index, /id="bedtimeToggle"[^>]*aria-labelledby="bedtimeToggleLabel"[^>]*aria-describedby="bedtimeScheduleSummary"/,
  "The bedtime switch must use its visible heading and schedule as its accessible name and description.");
assert.match(index, /id="parentHomeworkToggle"[^>]*aria-labelledby="parentHomeworkToggleLabel"[^>]*aria-describedby="parentHomeworkLabel"/,
  "The Homework Mode switch must expose its visible name and changing effect.");
assert.match(index, /id="flyerAllowedToggle"[^>]*aria-labelledby="flyerAllowedToggleLabel"[^>]*aria-describedby="flyerAllowedLabel"/,
  "The game-access switch must expose its visible name and changing rule.");
assert.match(index, /class="lock-screen" role="status" aria-live="polite" aria-atomic="true"/,
  "Changing schedule/device status must be announced without moving focus.");
assert.match(index, /id="scheduleNow" role="status" aria-live="polite" aria-atomic="true"/,
  "A child viewing the schedule must hear a time-window status change.");
assert.match(functionRange(app, "toggleHomeworkMode", "saveWellbeingGoals"), /Boolean\(event\?\.target\?\.checked\)/,
  "Homework Mode must save the checkbox's requested state instead of inverting possibly stale state.");
assert.match(app, /window\.addEventListener\("pageshow", refreshTimeSensitiveDashboard\)/,
  "Restoring a cached dashboard must immediately refresh schedule status as well as theme.");
assert.match(app, /document\.addEventListener\("visibilitychange", \(\) => \{[\s\S]*?document\.visibilityState === "visible"\) refreshTimeSensitiveDashboard\(\);[\s\S]*?\}\);/,
  "Returning to a backgrounded dashboard must refresh schedule status immediately.");

assert.match(index, /id="rulesInput" aria-labelledby="familyRulesHeading"/);
assert.match(index, /id="choresInput" aria-labelledby="familyChoresHeading"/);
assert.match(index, /id="focusInput"[^>]*aria-labelledby="familyFocusHeading"/);
assert.match(index, /id="parentNoteInput" aria-labelledby="parentNoteHeading"/);

assert.equal((index.match(/data-avatar-choice="[^\"]+"[^>]*aria-pressed="false"/g) || []).length, 7);
assert.match(index, /class="avatar-choice-grid" role="group" aria-label="Profile picture choices"/);
assert.match(index, /<label class="small" for="kidAvatarIcon">Avatar icon<\/label>/);
assert.match(index, /<label class="small" for="kidAvatarColorText">Avatar color<\/label>/);
assert.match(index, /<label class="small" for="kidCostume">Costume<\/label>/);
assert.match(app, /button\.setAttribute\("aria-pressed", String\(selected\)\)/);

assert.match(style, /\.feature-sidebar\s*\{[\s\S]*?max-height:\s*calc\(100dvh - 100px\);[\s\S]*?overflow-y:\s*auto;/);
assert.match(style, /\.feature-folder summary\s*\{[\s\S]*?min-height:\s*44px;[\s\S]*?font-size:\s*16px;/,
  "Feature-folder summaries need readable text and a full touch target.");
assert.match(style, /\.feature-folder button\s*\{[\s\S]*?min-height:\s*44px;[\s\S]*?font-size:\s*16px;/,
  "Feature-folder actions need readable text and a full touch target.");
assert.match(style, /\.filter-item\s*\{[\s\S]*?font-size:\s*16px;/,
  "App access rows must not shrink their interactive labels below 16px.");
assert.match(style, /#advancedSettings select\s*\{[\s\S]*?min-height:\s*44px;/,
  "Theme and language selectors need a full touch target in the expanded settings panel.");
assert.match(style, /\.settings-menu select\s*\{[\s\S]*?min-height:\s*44px;/,
  "Quick theme and language selectors need a full touch target.");
assert.match(style, /\.icon-button\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;/,
  "The desktop settings trigger needs a 44px target.");
assert.match(style, /\.settings-link\s*\{[\s\S]*?min-height:\s*44px;/,
  "Quick Settings actions need 44px targets.");
assert.match(style, /\.nav button,[\s\S]*?min-height:\s*44px;/,
  "Desktop dashboard tabs need 44px targets.");
assert.match(style, /\.tabs button\s*\{[\s\S]*?min-height:\s*44px;/,
  "Child hub filters need 44px targets.");
assert.match(style, /\.approve,[\s\S]*?\.button-link\s*\{[\s\S]*?min-height:\s*44px;/,
  "Compact actions, including app-access rules, need 44px targets.");
assert.match(style, /#focusInput\s*\{[\s\S]*?min-height:\s*44px;/,
  "The family focus field needs a 44px target.");
assert.match(style, /input\[type="range"\]\s*\{[\s\S]*?height:\s*44px;/,
  "The screen-time slider needs a full touch target without enlarging its visual track.");
assert.match(style, /\.switch\s*\{[\s\S]*?width:\s*54px;[\s\S]*?height:\s*44px;/,
  "Screen-control switches need a 44px target while keeping their 54px rail width.");
assert.match(style, /\.switch input\s*\{[\s\S]*?inset:\s*0;[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;/,
  "A switch's native checkbox must fill the full visible target.");
assert.match(style, /\.switch:has\(input:focus-visible\)/);
assert.match(style, /\.avatar-choice-grid\s*\{[\s\S]*?repeat\(auto-fit, minmax\(44px, 1fr\)\)/);
assert.match(style, /@media \(max-width: 900px\)[\s\S]*?\.topbar > \*\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?max-width:\s*100%;/);
assert.match(style, /@media \(max-width: 760px\)[\s\S]*?\.demo-banner-copy\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;/);
assert.match(style, /@media \(max-width: 760px\)[\s\S]*?\.view-password\s*\{[\s\S]*?min-height:\s*24px;/,
  "Phone-sized password checkbox labels must provide a 24px minimum touch target.");
assert.match(style, /@media \(max-width: 760px\)[\s\S]*?input:not\(\[type="checkbox"\]\)[\s\S]*?select,[\s\S]*?textarea\s*\{[\s\S]*?font-size:\s*16px;/,
  "Phone-sized text fields must stay at 16px so iOS does not zoom and disrupt the layout.");
assert.match(style, /@media \(max-width: 560px\)[\s\S]*?\.hero h1\s*\{[\s\S]*?font-size:\s*clamp\(36px, 10vw, 42px\);/);
assert.match(style, /\.lock-gate\s*\{[\s\S]*?overflow-y:\s*auto;[\s\S]*?overscroll-behavior:\s*contain;/,
  "The parent PIN overlay must remain scrollable in short mobile and landscape viewports.");
assert.match(style, /\.lock-box\s*\{[\s\S]*?max-height:\s*calc\(100dvh - 36px\);[\s\S]*?overflow-y:\s*auto;/,
  "The parent PIN dialog must not extend beyond the dynamic viewport.");
assert.match(style, /@media \(max-width: 560px\)[\s\S]*?\.parent-welcome\s*\{[\s\S]*?flex-direction:\s*column;/,
  "The parent summary action must stack instead of clipping in narrow split view.");

const jumpNavigationStart = app.indexOf("function scrollToJumpTarget");
const jumpNavigationEnd = app.indexOf("navButtons.forEach", jumpNavigationStart);
assert.notEqual(jumpNavigationStart, -1, "Missing scrollToJumpTarget.");
assert.notEqual(jumpNavigationEnd, -1, "Missing navigation setup after scrollToJumpTarget.");
const jumpNavigation = app.slice(jumpNavigationStart, jumpNavigationEnd);
assert.match(jumpNavigation, /topbar\.getBoundingClientRect\(\)\.height/);
assert.match(jumpNavigation, /bannerHeight \+ topbarHeight/);
assert.match(app, /function preferredScrollBehavior\(\)[\s\S]*?prefers-reduced-motion: reduce[\s\S]*?"auto"\s*:\s*"smooth"/,
  "JavaScript navigation must respect the operating system's reduced-motion preference.");
assert.doesNotMatch(app, /behavior:\s*"smooth"/,
  "Dashboard scrolling must use the reduced-motion-aware helper instead of forcing animation.");

function relativeLuminance(hex) {
  const channels = hex.match(/[\da-f]{2}/gi).map((part) => Number.parseInt(part, 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4);
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrastRatio(first, second) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

for (const background of ["6b2e4c", "8d3b35", "174967", "176252", "77410d", "8a2632", "34416f", "583b6b", "76541a", "842f27", "523461", "126070", "37652b", "755516"]) {
  assert.ok(contrastRatio("ffffff", background) >= 4.5, `Hub text contrast failed on #${background}.`);
}
assert.ok(contrastRatio("102323", "df604a") >= 4.5);
assert.ok(contrastRatio("102323", "ff927e") >= 4.5);
assert.match(style, /\.block\s*\{[\s\S]*?color:\s*#102323;[\s\S]*?background:\s*var\(--coral\);/);

assert.match(index, /id="appModal" aria-hidden="true" inert/);
assert.match(index, /aria-labelledby="appTitle" aria-describedby="appSubtitle"/);
assert.match(style, /\.modal\s*\{[\s\S]*?visibility:\s*hidden;/);
assert.match(style, /\.modal\.open\s*\{[\s\S]*?visibility:\s*visible;/);
assert.match(style, /\.modal\.open #closeApp\s*\{[\s\S]*?visibility:\s*visible;/,
  "The first child-app dialog control must be focusable while the modal begins its transition.");
assert.match(app, /appModal\.removeAttribute\("inert"\)/);
assert.match(app, /appModal\.setAttribute\("inert", ""\)/);
const backgroundInertSync = functionRange(app, "syncModalBackgroundInert", "focusModeEntry");
assert.match(backgroundInertSync, /parentGate\.classList\.contains\("open"\) \|\| appModal\.classList\.contains\("open"\)/);
assert.match(backgroundInertSync, /appShell\?\.toggleAttribute\("inert", blockedByOverlay\)/);
assert.match(backgroundInertSync, /demoBanner\?\.toggleAttribute\("inert", blockedByOverlay\)/);
assert.ok((app.match(/syncModalBackgroundInert\(\);/g) || []).length >= 4,
  "Opening and closing either modal must resynchronise background inertness.");
const modeEntryFocus = functionRange(app, "focusModeEntry", "showParentGate");
assert.match(modeEntryFocus, /settingsMenu\.classList\.contains\("open"\)/,
  "A delayed page-entry callback must not steal focus from open quick settings.");
assert.match(modeEntryFocus, /requestGeneration !== modeEntryFocusGeneration/,
  "Only the newest delayed mode-entry focus request may run.");
assert.match(modeEntryFocus, /activeNow !== activeAtRequest[\s\S]*?activeNow\.getClientRects\(\)\.length > 0/,
  "A delayed mode-entry callback must preserve a newer, visible user focus choice.");
const settingsMenuToggle = functionRange(app, "setSettingsMenu", "closeSettingsMenu");
assert.match(settingsMenuToggle, /if \(open\) \{[\s\S]*?cancelPendingModeEntryFocus\(\)/,
  "Opening Quick Settings must invalidate a delayed mode-entry focus request.");
assert.match(app, /appModalTrigger = trigger\?\.focus[\s\S]*?document\.activeElement\?\.focus/);
assert.match(app, /if \(!appModal\.classList\.contains\("open"\)\)/,
  "Updating an open child app must preserve the original dialog trigger.");
assert.match(app, /openApp\(button\.dataset\.openApp, button\)/,
  "Touch and pointer activation must supply an explicit dialog return target.");
assert.match(app, /closeAppButton\?\.focus\(\{ preventScroll: true \}\)/,
  "Opening a child app dialog must synchronously focus its close button.");
assert.match(app, /appModal\.getBoundingClientRect\(\);\s*closeAppButton\?\.focus\(\{ preventScroll: true \}\)/,
  "A child app dialog must apply its visible layout before moving focus out of the inert page.");
assert.doesNotMatch(app, /requestAnimationFrame\(\(\) => document\.querySelector\("#closeApp"\)/,
  "Opening a child app dialog must not depend on a throttled animation frame for keyboard focus.");
assert.match(app, /appModal\.classList\.contains\("open"\)[\s\S]*?!appModal\.contains\(document\.activeElement\)[\s\S]*?closeAppButton\?\.focus\(\{ preventScroll: true \}\)/,
  "An open child app dialog must recover focus after the background becomes inert.");
const hubAccessRenderer = functionRange(app, "renderHubAccess", "setChildControlsDisabled");
assert.match(hubAccessRenderer, /isAppPausedByHomework\(child, id\)/);
assert.match(hubAccessRenderer, /Paused for Homework Mode/,
  "A game paused by Homework Mode must be labelled truthfully in the child hub.");
assert.match(hubAccessRenderer, /rule === "allowed"[\s\S]*?`Open \$\{app\.title\}`/,
  "Allowed Kid Hub controls must announce the action they perform.");
assert.match(hubAccessRenderer, /`Ask a parent to open \$\{app\.title\}`/,
  "Approval-gated Kid Hub controls must announce that they send a parent request.");
assert.match(hubAccessRenderer, /`\$\{app\.title\} is blocked by parent settings`/,
  "Blocked Kid Hub controls must announce why they cannot open.");
assert.match(app, /returnTarget\.focus\(\{ preventScroll: true \}\)/);
assert.match(app, /event\.key !== "Tab" \|\| !appModal\.classList\.contains\("open"\)/);

assert.match(index, /id="parentGate" aria-hidden="true" inert/);
assert.match(index, /role="dialog" aria-modal="true" aria-labelledby="parentGateTitle" aria-describedby="parentGateDescription"/);
assert.match(index, /<label class="small" for="passcodeInput"[^>]*>Parent PIN<\/label>/);
assert.match(index, /id="forgotPassword"[^>]*aria-expanded="false"[^>]*aria-controls="forgotPanel"/);
assert.match(index, /id="passcodeLockoutCountdown" aria-live="off" hidden/);
assert.match(app, /parentGate\.removeAttribute\("inert"\)/);
assert.match(app, /parentGate\.setAttribute\("inert", ""\)/);
assert.match(app, /event\.key === "Tab" && parentGate\.classList\.contains\("open"\)/);
assert.match(app, /event\.key === "Escape" && parentGate\.classList\.contains\("open"\)[\s\S]*?setMode\("child"\)/,
  "Escape must close the Parent Login dialog and return to Child Site.");
assert.match(app, /forgotPasswordButton\.setAttribute\("aria-expanded", String\(opening\)\)/,
  "The parent PIN recovery toggle must expose its open state.");
const passcodeLockout = functionRange(app, "updatePasscodeLockout", "ensureChildAppState");
assert.match(passcodeLockout, /passcodeLockoutCountdown\.textContent = "Try again in " \+ remaining \+ " seconds\."/);
assert.doesNotMatch(passcodeLockout, /passcodeStatus\.textContent\s*=\s*"Too many attempts\. Try again in " \+ remaining/,
  "The live PIN status must not announce every countdown second.");
assert.match(passcodeLockout, /if \(justUnlocked\)[\s\S]*?passcodeInput\.focus\(\{ preventScroll: true \}\)/,
  "PIN focus must return when a lockout expires.");
assert.match(app, /returnTarget\.focus\(\{ preventScroll: true \}\)/);

assert.match(index, /<form class="signup-form" id="loginForm" novalidate>/);
assert.match(index, /<form class="signup-form" id="signupForm" novalidate>/);
assert.match(index, /id="loginKiddoSprout" type="submit"/);
assert.match(index, /id="createAccount" type="submit"/);
assert.match(index, /id="updateAccountPassword" type="submit"/);
assert.match(app, /loginForm\?\.addEventListener\("submit"[\s\S]*?loginKiddoSprout\(\)/);
assert.match(app, /const updatingPassword = !accountPasswordRecoveryPanel\.hidden && !accountPasswordUpdateFields\.hidden;[\s\S]*?updateAccountPasswordFromRecovery\(\)/,
  "The login form must submit the visible verified-reset stage instead of logging in.");
assert.match(
  app,
  /signupForm\?\.addEventListener\("submit", \(event\) => \{\s*event\.preventDefault\(\);[\s\S]*?createAccount\(\)/,
  "The signup form must prevent a page reset and route submission through the guarded account-creation handler."
);
assert.match(index, /id="restartEmailSignup" type="button"/,
  "Email confirmation must provide a native button for changing email or starting over.");
assert.match(app, /input\.setAttribute\("aria-errormessage", statusElement\.id\)/);
assert.match(app, /input\?\.removeAttribute\("aria-errormessage"\)/);
assert.match(app, /function showAuthFieldError[\s\S]*?showToast\(toastMessage, \{ announce: false \}\)/,
  "A focused aria-errormessage must not also be repeated through the global live toast.");
assert.match(app, /function showToast\(message, options = \{\}\)[\s\S]*?toast\.setAttribute\("aria-live", announce \? "polite" : "off"\)/,
  "Visual-only toasts must explicitly disable their live-region announcement.");
const accountConnectionCheck = functionRange(app, "checkKiddoSupabaseConnection", "updateResendEmailButtons");
assert.match(accountConnectionCheck, /fetch\(`\$\{SUPABASE_URL\}\/auth\/v1\/settings`/,
  "The signed-out login screen must check the Auth service itself.");
assert.doesNotMatch(accountConnectionCheck, /rest\/v1\/recipes/,
  "The signed-out login screen must not generate a misleading 401 by probing the private recipe table.");
assert.match(app, /item\.setAttribute\("aria-current", "step"\)/);
assert.match(app, /setMode\("signup"\);\s*focusModeEntry\(viewMode\)/);
assert.match(app, /setMode\("login"\);\s*focusModeEntry\(viewMode\)/);
assert.match(index, /<h2 id="signupEntryTitle"[^>]*>Create Parent Account<\/h2>/,
  "The unavailable sign-up explanation must expose a stable focus target.");
const modeSwitcher = functionRange(app, "setMode", "openChildModeFromHero");
assert.match(modeSwitcher, /rearmHumanCheck\("login"\);\s*focusModeEntry\("login"\)/,
  "Session redirects must move focus into the Login view.");
assert.match(modeSwitcher, /rearmHumanCheck\("signup"\);\s*focusModeEntry\("signup"\)/,
  "Account redirects must move focus into the Sign Up view.");
assert.match(modeSwitcher, /focusModeEntry\(mode\);\s*}/,
  "Every completed mode switch must own its entry focus.");
assert.match(index, /id="googleRecovery"[^>]*aria-describedby="googleRecoveryStatus"/);
assert.match(app, /recoveryCode\.focus\(\{ preventScroll: true \}\)/);
const resetRecovery = functionRange(app, "resetPasscodeWithCode", "updatePasscodeLockout");
assert.ok(resetRecovery.indexOf("const token = recoveryCode.value.trim();") < resetRecovery.indexOf('if (!/^\\d{4,8}$/.test(newPasscode))'),
  "PIN recovery must validate fields in their visual order: code, then new PIN.");
assert.match(resetRecovery, /forgotPanel\.style\.display = "none";[\s\S]*?passcodeInput\.focus\(\{ preventScroll: true \}\)/,
  "A successful PIN reset must collapse recovery and focus the main PIN field.");

const flyerKeyHandler = functionRange(app, "handleFlyerKey", "resetFlyerGame");
assert.match(app, /id="flyerCanvas"[^>]*tabindex="0"/);
assert.match(flyerKeyHandler, /event\.target === flyerGame\.canvas/,
  "Sprout Flyer must only consume Space while its game surface owns focus.");

assert.match(app, /settingsMenuOwnedFocusAtPointerDown = settingsMenu\.classList\.contains\("open"\)[\s\S]*?settingsMenu\.contains\(document\.activeElement\)/,
  "Outside-pointer dismissal must remember whether Quick Settings owned focus before pointer focus moves.");
assert.match(app, /const restoreFocus = \(settingsMenuOwnedFocusAtPointerDown \|\| settingsMenu\.contains\(document\.activeElement\)\)[\s\S]*?&& !focusableTarget/,
  "Outside-pointer dismissal must restore the Settings trigger only when the clicked target is not independently focusable.");
assert.match(app, /function focusModeEntry[\s\S]*?signupFamily, googleSignupButton, document\.querySelector\("#signupEntryTitle"\)[\s\S]*?candidate\.closest\('\[hidden\], \[inert\], \[aria-hidden="true"\]'\)/,
  "Mode-entry focus must skip hidden signup fields and fall back to the visible Google route or heading.");
assert.match(app, /\[googleLoginButton, googleSignupButton, googleRecoveryButton\]\.forEach[\s\S]*?button\.disabled = false;[\s\S]*?button\.setAttribute\("aria-disabled", String\(!googleAuthAvailable\)\)/,
  "Configured Google routes must stay keyboard-reachable while readiness is checked.");
assert.match(app, /forgotPasswordButton\.disabled = false;[\s\S]*?Open recovery details/,
  "Unavailable PIN recovery must open an explanation instead of becoming an unreachable disabled control.");
assert.match(app, /\[document\.querySelector\("#loginToSignup"\), document\.querySelector\("#openSignup"\)\]\.forEach[\s\S]*?button\.disabled = false;[\s\S]*?Open account setup details/,
  "Unavailable sign-up routes must still open their visible setup explanation.");
const modeRouteSync = functionRange(app, "synchronizeModeRoute", "openChildModeFromHero");
assert.match(modeRouteSync, /if \(modeRouteSyncQueued\) return;[\s\S]*?window\.setTimeout\(\(\) => \{[\s\S]*?modeRouteSyncQueued = false;/,
  "Paired fragment traversal events must be coalesced before mode side effects run.");
assert.match(modeRouteSync, /const nextMode = \(window\.location\.hash \|\| "#login"\)\.slice\(1\);[\s\S]*?setMode\(safeMode, \{ quiet: true, replaceHistory: true \}\)/,
  "History and direct fragment navigation must retain setMode's safe route redirects.");
assert.match(app, /window\.addEventListener\("popstate", synchronizeModeRoute\);\s*window\.addEventListener\("hashchange", synchronizeModeRoute\);/,
  "Back, Forward, and direct hash changes must share one guarded route synchronizer.");
assert.match(liveInteractionAudit, /location\.hash = '#child'[\s\S]*?direct hash navigation opens child mode/,
  "The real-browser audit must cover direct same-document fragment navigation.");
assert.match(liveInteractionAudit, /location\.hash = '#not-a-kiddo-route'[\s\S]*?invalid hash navigation returns to a canonical safe mode/,
  "The real-browser audit must cover invalid fragment canonicalization.");
assert.match(app, /function startDemoMode[\s\S]*?setMode\("parent", \{ unlocked: true, quiet: true \}\);\s*focusModeEntry\("parent"\)/,
  "Entering Colleague Demo Mode must focus the Parent Dashboard heading.");

assert.match(app, /meta\[name="theme-color"\]/);
assert.match(app, /resolved === "night" \? "#0b202c" : "#3fa35b"/);
assert.match(style, /button,\s*input,\s*select,\s*textarea\s*\{\s*font: inherit;/,
  "Textareas must inherit the interface font instead of using the browser's tiny monospace default.");

const queueFunctions = functionRange(app, "emptyPendingRequest", "normalizeAppRules");
const queue = new Function(`${queueFunctions}; return {
  enqueuePendingRequest,
  enqueueTrackedPendingRequest,
  rollbackEnqueuedPendingRequest,
  restoreRemovedPendingRequest,
  snapshotPendingRequestState,
  syncPendingRequests,
  takePendingRequest
};`)();
const request = (number) => [`Request ${number}`, "From child", "R", "appDownload"];
const fullChild = {
  pending: 100,
  currentRequest: request(0),
  requests: Array.from({ length: 100 }, (_, index) => request(index))
};
assert.equal(queue.enqueuePendingRequest(fullChild, request(100)), false);
assert.equal(fullChild.requests.length, 100);
assert.equal(fullChild.pending, 100);

const availableChild = {
  pending: 99,
  currentRequest: request(0),
  requests: Array.from({ length: 99 }, (_, index) => request(index))
};
assert.equal(queue.enqueuePendingRequest(availableChild, request(99)), true);
assert.equal(availableChild.requests.length, 100);
assert.equal(availableChild.pending, 100);

const legacyOverflow = {
  pending: 101,
  currentRequest: ["Legacy overflow", "From child", "L", "appDownload"],
  requests: Array.from({ length: 100 }, (_, index) => request(index))
};
queue.syncPendingRequests(legacyOverflow);
assert.equal(legacyOverflow.requests.length, 100);
assert.equal(legacyOverflow.pending, 100);

const concurrentAddChild = {
  pending: 1,
  currentRequest: request(0),
  requests: [request(0)]
};
const beforeCriticalAdd = queue.snapshotPendingRequestState(concurrentAddChild);
const criticalAddedRequest = queue.enqueueTrackedPendingRequest(concurrentAddChild, request(1));
queue.enqueuePendingRequest(concurrentAddChild, request(2));
queue.rollbackEnqueuedPendingRequest(concurrentAddChild, beforeCriticalAdd, criticalAddedRequest);
assert.deepEqual(concurrentAddChild.requests.map((row) => row[0]), ["Request 0", "Request 2"],
  "A failed critical request must not erase a request added while its save was pending.");

const concurrentDecisionChild = {
  pending: 2,
  currentRequest: request(0),
  requests: [request(0), request(1)]
};
const beforeCriticalDecision = queue.snapshotPendingRequestState(concurrentDecisionChild);
queue.takePendingRequest(concurrentDecisionChild);
queue.enqueuePendingRequest(concurrentDecisionChild, request(2));
queue.restoreRemovedPendingRequest(concurrentDecisionChild, beforeCriticalDecision);
assert.deepEqual(concurrentDecisionChild.requests.map((row) => row[0]), ["Request 0", "Request 1", "Request 2"],
  "A failed parent decision must restore its request without dropping a concurrent addition.");

assert.match(app, /request\[3\] === "appAccess" && request\[4\] === appId/);
assert.match(app, /is already waiting for parent review/);
assert.doesNotMatch(app, /^\s*enqueuePendingRequest\(child,/m, "Every request enqueue must handle a full queue.");

const saveBatcherStart = app.indexOf("function createSaveBatcher");
const saveBatcherEnd = app.indexOf("const familySaveBatcher", saveBatcherStart);
assert.ok(saveBatcherStart >= 0 && saveBatcherEnd > saveBatcherStart,
  "The delayed-save Promise batcher must remain independently testable.");
const createSaveBatcher = new Function(
  `${app.slice(saveBatcherStart, saveBatcherEnd)}\nreturn createSaveBatcher;`
)();

function fakeSaveScheduler() {
  let nextId = 1;
  const tasks = new Map();
  return {
    set(callback, delay) {
      const id = nextId++;
      tasks.set(id, { callback, delay });
      return id;
    },
    clear(id) {
      tasks.delete(id);
    },
    runNext() {
      const next = [...tasks.entries()].sort(([left], [right]) => left - right)[0];
      assert.ok(next, "Expected a queued save task.");
      tasks.delete(next[0]);
      next[1].callback();
      return next[1].delay;
    },
    get size() {
      return tasks.size;
    }
  };
}

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

{
  const scheduler = fakeSaveScheduler();
  let saveCount = 0;
  const batcher = createSaveBatcher({
    save: async () => { saveCount += 1; return true; },
    canConfirm: () => true,
    setTimer: scheduler.set,
    clearTimer: scheduler.clear,
    delayMs: 450
  });
  const first = batcher.queue();
  const second = batcher.queue({ confirmed: true });
  assert.equal(scheduler.size, 1, "Rapid changes should share one delayed save.");
  assert.equal(scheduler.runNext(), 450);
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(saveCount, 1, "A coalesced batch must perform exactly one write.");
}

{
  const scheduler = fakeSaveScheduler();
  const batcher = createSaveBatcher({
    save: async () => true,
    canConfirm: () => false,
    setTimer: scheduler.set,
    clearTimer: scheduler.clear
  });
  const ordinary = batcher.queue();
  const critical = batcher.queue({ confirmed: true, immediate: true });
  assert.equal(scheduler.runNext(), 0, "Critical actions should flush their batch immediately.");
  assert.deepEqual(await Promise.all([ordinary, critical]), [true, false],
    "Memory-only saves must never be reported as confirmed persistence.");
}

{
  const scheduler = fakeSaveScheduler();
  let saveCount = 0;
  const batcher = createSaveBatcher({
    save: async () => { saveCount += 1; return true; },
    canConfirm: () => true,
    setTimer: scheduler.set,
    clearTimer: scheduler.clear
  });
  const pending = batcher.queue();
  batcher.cancel();
  assert.equal(await pending, false, "Cancellation must settle callers instead of leaving promises pending.");
  assert.equal(scheduler.size, 0);
  assert.equal(saveCount, 0);
}

{
  const scheduler = fakeSaveScheduler();
  let finishSave;
  const batcher = createSaveBatcher({
    save: async () => new Promise((resolve) => { finishSave = resolve; }),
    canConfirm: () => true,
    setTimer: scheduler.set,
    clearTimer: scheduler.clear
  });
  const running = batcher.queue({ confirmed: true, immediate: true });
  scheduler.runNext();
  await flushPromises();
  batcher.cancel();
  finishSave(true);
  assert.equal(await running, false,
    "Cancellation during an in-flight write must not report stale success to its caller.");
}

{
  const scheduler = fakeSaveScheduler();
  let generation = 7;
  let saveCount = 0;
  const batcher = createSaveBatcher({
    save: async () => { saveCount += 1; return true; },
    canConfirm: () => true,
    generation: () => generation,
    setTimer: scheduler.set,
    clearTimer: scheduler.clear
  });
  const stale = batcher.queue({ confirmed: true });
  generation += 1;
  scheduler.runNext();
  assert.equal(await stale, false, "A save queued for another account generation must be rejected.");
  assert.equal(saveCount, 0, "Stale account state must not reach the persistence layer.");
}

{
  const scheduler = fakeSaveScheduler();
  let releaseFirst;
  let memory = "first change";
  const snapshots = [];
  const batcher = createSaveBatcher({
    save: async () => {
      snapshots.push(memory);
      if (snapshots.length === 1) {
        return new Promise((resolve) => { releaseFirst = resolve; });
      }
      return true;
    },
    canConfirm: () => true,
    setTimer: scheduler.set,
    clearTimer: scheduler.clear
  });
  const first = batcher.queue({ confirmed: true, immediate: true });
  scheduler.runNext();
  await flushPromises();
  memory = "second change";
  const second = batcher.queue({ confirmed: true, immediate: true });
  const firstWithRollback = first.then((saved) => {
    if (!saved) memory = "rolled back";
    return saved;
  });
  releaseFirst(false);
  assert.equal(await firstWithRollback, false);
  scheduler.runNext();
  scheduler.runNext();
  assert.equal(await second, true);
  assert.deepEqual(snapshots, ["first change", "rolled back"],
    "A later batch must wait until failed-action rollback continuations have run.");
}

{
  const rollbackState = { safetyAlerts: [{ message: "old" }] };
  const activityRollbackSource = functionRange(app, "removeFamilyActivityRow", "submitProblemReport");
  const { restoreClearedFamilyActivity } = new Function(
    "state",
    `${activityRollbackSource}\nreturn { restoreClearedFamilyActivity };`
  )(rollbackState);
  const beforeClear = rollbackState.safetyAlerts.slice();
  rollbackState.safetyAlerts = [];
  const concurrentAlert = { message: "new while saving" };
  rollbackState.safetyAlerts.unshift(concurrentAlert);
  restoreClearedFamilyActivity("safetyAlerts", beforeClear);
  assert.deepEqual(rollbackState.safetyAlerts, [concurrentAlert, beforeClear[0]],
    "A failed clear must restore old rows without erasing a concurrent alert.");
}

const criticalSaveSource = functionRange(app, "runCriticalSave", "themeChoiceLabel");
assert.match(criticalSaveSource, /queueSave\(\{ confirmed: true, immediate: true \}\)/,
  "Critical actions must require a confirmed immediate save.");
assert.match(criticalSaveSource, /finally \{[\s\S]*?criticalSaveInFlight = false;/,
  "Critical controls and the global lock must release through finally.");
assert.match(criticalSaveSource, /else if \(saved && actionStillCurrent\)[\s\S]*?options\.onSuccess/,
  "Success-only UI changes must run only after persistence is confirmed.");
assert.doesNotMatch(criticalSaveSource, /options\.onSuccess[\s\S]*?saved = false/,
  "A presentation callback must never roll back an already-persisted write.");
assert.match(functionRange(app, "logoutKiddoSprout", "updateRoute"),
  /cancelQueuedSaves\(\);\s*clearKiddoSession\(\)/,
  "Logout must cancel delayed work before invalidating the account generation.");

[
  ["requestAppAccess", "extensionBlockRules"],
  ["submitProblemReport", "clearProblemForm"],
  ["reviewProblemReport", "followUpProblemReport"],
  ["followUpProblemReport", "analyzeScanText"],
  ["nextRequest", "queueSafetyAlertRow"],
  ["sendSafetyAlert", "handleHelpAction"],
  ["sendMoodCheckin", "saveFamilyRules"],
  ["completeFocusSession", "sendParentChat"],
  ["sendParentChat", "clearParentChat"],
  ["submitChore", "resolveCreatorQueueRequest"]
].forEach(([handler, boundary]) => {
  const source = functionRange(app, handler, boundary);
  assert.match(source, /runCriticalSave\(/, `${handler} must wait for confirmed persistence.`);
  assert.doesNotMatch(source, /queueSave\(/, `${handler} must not retain a fire-and-forget save.`);
});
assert.match(app, /reviewProblemReport\(Number\(button\.dataset\.reviewReport\), button\)/);
assert.match(app, /followUpProblemReport\(Number\(button\.dataset\.followReport\), button\)/);
assert.match(app, /submitChore\(Number\(button\.dataset\.chore\), button\)/);
assert.match(app, /handleHelpAction\(button\.dataset\.helpAction, button\)/);
assert.match(app, /sendMoodCheckin\(button\.dataset\.mood, button\)/);
assert.match(app, /id="clearAlerts"[\s\S]*?runCriticalSave|#clearAlerts[\s\S]*?runCriticalSave/,
  "Clearing safety alerts must be rollback-safe.");
assert.match(functionRange(app, "completeFocusSession", "sendParentChat"),
  /if \(criticalSaveInFlight\)[\s\S]*?stopFocusTimer\(\)/,
  "Automatic focus completion must not stop its retry timer while another critical save owns the lock.");
assert.doesNotMatch(functionRange(app, "submitProblemReport", "clearProblemForm"),
  /state\.(?:problemReports|safetyAlerts) = previous/,
  "A failed report must remove only its own rows, preserving concurrent safety activity.");
assert.doesNotMatch(functionRange(app, "sendMoodCheckin", "saveFamilyRules"),
  /state\.(?:moodCheckins|safetyAlerts) = previous/,
  "A failed mood check-in must remove only its own rows, preserving concurrent activity.");

new Function(app);
console.log("Main UI safety checks passed: focus containment, confirmed save batching, rollback safety, and bounded request queues.");
