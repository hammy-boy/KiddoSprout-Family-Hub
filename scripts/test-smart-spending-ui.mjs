import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const html = await readFile(new URL("../app_7.html", import.meta.url), "utf8");
const demoBankFixturesSource = html.match(/const DEMO_BANK_OPTIONS = Object\.freeze\([\s\S]*?(?=\n\s*let verifiedSession)/)?.[0] || "";

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((source) => source.trim());
inlineScripts.forEach((source) => new Function(source));

assert.match(html, /<form class="form" id="spendRequestForm"[^>]*>[\s\S]*?id="requestSpend" type="submit"[\s\S]*?<\/form>/,
  "the spending request controls should be a keyboard-submittable form");
assert.match(html, /id="itemName"[^>]*name="itemName"[^>]*required/,
  "the requested item must have an accessible form name and cannot be blank");
assert.match(html, /id="itemCost"[^>]*name="itemCost"[^>]*step="0\.01"[^>]*required/,
  "the request form should accept required pounds-and-pence style amounts");
assert.match(html, /<select id="itemPriority"[^>]*required[^>]*>[\s\S]*?value="need"[\s\S]*?value="want"[\s\S]*?value="gift"[\s\S]*?<\/select>/,
  "the upgraded planner should help children classify a practice choice before requesting it");
assert.match(html, /id="purchaseHint"[^>]*role="status"[^>]*aria-live="polite"/,
  "affordability guidance should be announced accessibly as a cost changes");
for (const id of ["addAllowance", "saveFive", "requestApproval", "requestSpend", "earnTwo", "changeGoal"]) {
  assert.match(html, new RegExp(`id="${id}"[^>]*disabled`),
    `${id} must stay disabled until the cloud family gate succeeds`);
}
assert.match(html, /spendRequestForm\.addEventListener\("submit", submitSpendRequest\)/);
assert.doesNotMatch(html, /querySelector\("#requestSpend"\)\.addEventListener\("click"/);
assert.match(html, /button:focus-visible,[\s\S]*?input:focus-visible,[\s\S]*?a:focus-visible/);
assert.match(html, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(html, /id="goalProgress"[^>]*role="progressbar"[^>]*aria-valuenow="0"/);
assert.match(html, /id="parentStatus"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/,
  "parent decisions should be announced without interrupting the user");
assert.match(html, /id="bankAccountPassword"[^>]*maxlength="256"/,
  "the sensitive first-time password field should have a defensive input bound");
assert.match(html, /<dialog id="demoBankDialog"[^>]*aria-labelledby="demoBankTitle"[^>]*aria-describedby="demoBankDescription"/,
  "the fictional bank chooser should be an accessible in-page dialog");
assert.match(html, /made-up banks use sample balances only[\s\S]*?Do not enter a real bank name, login, PIN, or account number/,
  "the practice bank chooser must tell testers not to enter real financial details");
assert.match(html, /id="downloadPracticeReport"[^>]*disabled/,
  "the safe practice export should remain locked until the app access gate succeeds");
assert.match(html, /id="resetPractice"[^>]*hidden/,
  "the repeatable reset control should be exposed only after demo mode is confirmed");
assert.match(html, /#goalProgress"\)\.setAttribute\("aria-valuenow", String\(progress\)\)/);
assert.match(html, /<dialog id="goalDialog"[^>]*aria-labelledby="goalDialogTitle"[^>]*aria-describedby="goalDialogDescription"/,
  "changing a savings goal should use an accessible in-page dialog");
assert.match(html, /<form class="pin-form" id="goalForm" novalidate>[\s\S]*?id="goalNameInput"[^>]*maxlength="32"[^>]*required[\s\S]*?id="goalAmountInput"[^>]*min="1"[^>]*max="1000000"[^>]*required/,
  "the goal dialog should expose bounded, labelled form controls");
assert.match(html, /id="saveGoal" type="submit"/,
  "the goal dialog submit action should be addressable while app access is revalidated");
assert.match(html, /goalForm\.addEventListener\("submit"[\s\S]*?goalNameInput\.setAttribute\("aria-invalid", "true"\)[\s\S]*?goalAmountInput\.setAttribute\("aria-invalid", "true"\)/,
  "invalid goal fields should receive specific accessible errors");
assert.match(html, /const goalAmount = parsePracticeRequestAmount\(goalAmountInput\.value\)/,
  "goal amounts should use the same strict two-decimal parser as spending requests");
assert.match(html, /goalDialog\.addEventListener\("close"[\s\S]*?changeGoalButton\.focus\(\)/,
  "closing the goal dialog should restore focus to its trigger");
assert.match(html, /typeof goalDialog\.showModal !== "function"[\s\S]*?browser cannot open the goal editor/,
  "an older browser must get a useful message instead of a broken Change goal button");
assert.match(html, /try \{\s*goalDialog\.showModal\(\);\s*\} catch \(error\)[\s\S]*?goal editor could not open/,
  "a rejected dialog open must recover without breaking the Smart Spending page");
assert.doesNotMatch(html, /\b(?:window\.)?prompt\s*\(/,
  "Smart Spending should not use blocking browser prompts for goal editing");
assert.match(html, /parentStatus: "Ready"/);
assert.match(html, /currency: "GBP"/,
  "the UK colleague demo should use pounds consistently instead of US-dollar defaults");
assert.match(demoBankFixturesSource, /currency: "GBP"/,
  "the fictional bank balances should use the same UK currency as the practice wallet");
assert.doesNotMatch(demoBankFixturesSource, /currency: "USD"/,
  "fictional bank fixtures should not silently switch the UK demo back to dollars");
assert.match(html, /next\.parentStatus = validParentStatus\(next\.parentStatus\)/);
assert.match(html, /const STORAGE_KEY = "kiddoSproutSmartSpendingV3"/);
assert.match(html, /const DEMO_STORAGE_KEY = "kiddosprout\.demo\.v1\.smart-spending"/,
  "refreshable demo progress should use an isolated session-only storage namespace");
assert.ok(
  html.indexOf('auth-session.js?v=7') < html.indexOf('family-state-cloud.js?v=2'),
  "Smart Spending must load shared session validation before the owner-scoped family client"
);
assert.doesNotMatch(html, /kiddosproutState/,
  "Smart Spending must never read or write the retired plaintext family document");
assert.match(html, /const owner = safeText\(verifiedOwnerId, 64\)[\s\S]*?loadedFamily\?\.activeChild[\s\S]*?`\$\{owner\}\\u001f\$\{child\}`/,
  "practice balances should be scoped by the verified Supabase owner ID and active child");
assert.match(html, /profiles\[PRACTICE_SCOPE\] = practiceState/,
  "practice balances should be stored separately for the active family and child");
assert.match(html, /ownerScopedPracticeProfiles\(saved\?\.profiles\)/,
  "legacy email-keyed practice profiles should be removed on the next safe save");
assert.match(html, /function readPracticeRecord\(\)[\s\S]*?raw\.length > MAX_PRACTICE_STORAGE_CHARACTERS[\s\S]*?discardDamagedPracticeRecord\(\)[\s\S]*?JSON\.parse\(raw\)/,
  "damaged or unexpectedly large practice records should be discarded before loading or saving");
assert.match(html, /currentPracticeScope\(\) !== PRACTICE_SCOPE[\s\S]*?location\.reload\(\)/,
  "switching child profiles in another tab must not leave the previous child's money visible");
assert.match(html, /event\.key === STORAGE_KEY[\s\S]*?clearEphemeralBankData\(\);[\s\S]*?location\.reload\(\)/,
  "practice changes from another tab should refresh without leaving bank balances visible");
assert.match(html, /parentStatus: source\.parentStatus/);
assert.match(html, /const practiceState = practiceStateSnapshot\(state\)/,
  "both live and demo persistence should pass through the same allowlisted practice snapshot");
assert.match(html, /#parentStatus"\)\.textContent = state\.parentStatus/);
assert.match(html, /function save\(\) \{[\s\S]*?try \{[\s\S]*?localStorage\.setItem\(STORAGE_KEY,[\s\S]*?catch \(error\)[\s\S]*?Practice changes will last for this visit/,
  "blocked browser storage should not break practice controls");
assert.match(html, /function save\(\)[\s\S]*?if \(READ_ONLY_DEMO\)[\s\S]*?sessionStorage\.setItem\(DEMO_STORAGE_KEY, serialized\)[\s\S]*?return;/,
  "demo practice choices should survive navigation in sessionStorage without entering live family storage");
assert.match(html, /serialized\.length <= MAX_DEMO_STORAGE_CHARACTERS/,
  "the demo session record should have a defensive size bound");
assert.match(html, /function resetDemoPractice\(\)[\s\S]*?clearDemoPracticeRecord\(\);[\s\S]*?render\(\);[\s\S]*?clearDemoPracticeRecord\(\)/,
  "Reset demo should clear its namespaced session record before and after rendering defaults");
assert.match(html, /enqueueDashboardRequest\(\[[\s\S]*?"spendRequest"/,
  "a spending request should be sent to the parent dashboard queue");
assert.match(html, /enqueueDashboardRequest\(\[[\s\S]*?"spendReview"/,
  "Ask parent should be sent to the parent dashboard queue");
assert.doesNotMatch(html, /appId === "spending" && rule === "request"[\s\S]*?rule = "allowed"/,
  "the Smart Spending page must not bypass a parent's Ask setting");
assert.match(html, /normalized\[3\] === "spendRequest"[\s\S]*?smartSpendingAccessAllowed\(child\)[\s\S]*?return "access-changed"/,
  "a queued spending action must recheck the latest parent rule before saving");
assert.match(html, /isFamilyWriteConflict\(error\)[\s\S]*?continue/,
  "a concurrent family update should be reloaded and merged once instead of losing either request");
assert.match(html, /visibilitychange[\s\S]*?await refreshFamilyContext\(\)/,
  "a returning tab should reload parent decisions from owner-scoped cloud storage");
assert.match(html, /const refreshRevision = familyContextRevision[\s\S]*?refreshRevision !== familyContextRevision \|\| document\.hidden/,
  "a refresh that finishes after the page is hidden must not unlock stale controls");
assert.match(html, /async function refreshFamilyContext\(\)[\s\S]*?await refreshBankService\("Refreshing secure bank status…", false\)/,
  "a returning tab should also reconcile bank state changed in another tab");
assert.match(html, /async function refreshFamilyContext\(\)[\s\S]*?setAppAccessReady\(false\);[\s\S]*?await canOpenKiddoSproutApp\("spending", "Smart Spending"\)[\s\S]*?setAppAccessReady\(true\);/,
  "a returning tab must keep practice controls locked until the current parent app rule is revalidated");
assert.match(html, /function setAppAccessReady\(ready\)[\s\S]*?goalNameInput\.readOnly = !appAccessReady;[\s\S]*?goalAmountInput\.readOnly = !appAccessReady;[\s\S]*?saveGoalButton\.disabled = !appAccessReady;/,
  "an already-open goal editor must lock its fields and save action during app-rule revalidation without dropping focus");
assert.match(html, /goalForm\.addEventListener\("submit"[\s\S]*?if \(!appAccessReady\)[\s\S]*?access is being checked/,
  "a programmatic goal submit must fail closed while the current app rule is unknown");
assert.match(html, /function showKiddoSproutGate\(title, message\)[\s\S]*?if \(bankPinDialog\.open\) closeBankPin\(null\);[\s\S]*?if \(goalDialog\.open\) goalDialog\.close\(\);[\s\S]*?heading\.focus\(\{ preventScroll: true \}\)/,
  "an async access denial must close top-layer dialogs and focus its replacement explanation");
assert.match(html, /if \(!await canOpenKiddoSproutApp\("spending", "Smart Spending"\)\) return;\s*refreshParentStatusFromDashboard\(\);/,
  "the saved parent queue should be reconciled when Smart Spending opens");
assert.match(html, /if \(!await canOpenKiddoSproutApp\("spending", "Smart Spending"\)\) return;[\s\S]*?setAppAccessReady\(true\)/,
  "practice controls must not unlock before the verified cloud gate succeeds");
assert.match(html, /async function submitSpendRequest[\s\S]*?await enqueueDashboardRequest\(\[/,
  "the request form must await a confirmed cloud write");
assert.match(html, /requestApprovalButton\.addEventListener\("click", async[\s\S]*?await enqueueDashboardRequest\(\[/,
  "Ask parent must await a confirmed cloud write");
assert.match(html, /await window\.KiddoSproutFamilyState\.save\(family, \{ expectedOwnerId \}\)/,
  "dashboard requests must be persisted through owner-scoped family storage");
assert.doesNotMatch(html, /localStorage\.(?:getItem|setItem)\([^\n]*family/i,
  "family access must not silently fall back to local browser storage");
assert.match(html, /bankBusy \|\| bankPromptOpen/,
  "bank actions should remain locked while the parent PIN dialog is open");
assert.match(html, /let bankService = READ_ONLY_DEMO \? freshDemoBankStatus\(\) : \{/,
  "the colleague preview should boot into a network-free fictional bank service instead of a dead bank panel");
assert.match(html, /function renderBank\(\)[\s\S]*?if \(READ_ONLY_DEMO\)[\s\S]*?Fictional demo only[\s\S]*?complete link, balance, and disconnect journey/,
  "the demo bank panel should clearly explain that its full test journey uses no real bank");
assert.match(html, /const controlsLocked = !appAccessReady \|\| bankBusy \|\| bankPromptOpen/,
  "bank controls must stay locked while the latest parent app rule is being checked");
for (const action of ["connectBank", "syncBank", "disconnectBank"]) {
  assert.match(html, new RegExp(`async function ${action}\\(\\) \\{[\\s\\S]*?if \\(\\!appAccessReady \\|\\| bankBusy`),
    `${action} must fail closed even if invoked while its disabled button is bypassed`);
}
assert.match(html, /async function connectBank\(\)[\s\S]*?if \(READ_ONLY_DEMO\) \{\s*openDemoBankChooser\(\);\s*return;/,
  "demo Connect bank must use the local fictional chooser before any live provider path");
assert.match(html, /async function syncBank\(\)[\s\S]*?if \(READ_ONLY_DEMO\) \{\s*togglePracticeBankBalances\(\);\s*return;/,
  "demo View balances must use only local sample balances");
assert.match(html, /async function disconnectBank\(\)[\s\S]*?if \(READ_ONLY_DEMO\) \{\s*disconnectPracticeBank\(\);\s*return;/,
  "demo Disconnect must reset only the fictional in-tab connection");
assert.match(html, /async function apiPost\(path, body = \{\}\) \{\s*if \(READ_ONLY_DEMO\)[\s\S]*?throw new Error/,
  "bypassing the demo controls must still leave every live bank API call fail-closed");
assert.match(html, /function loadPlaid\(\) \{\s*if \(READ_ONLY_DEMO\)[\s\S]*?Promise\.reject/,
  "the external bank-provider script must remain unreachable in demo mode");
assert.match(html, /function createPracticeReport\(\)[\s\S]*?no real purchases, bank accounts, or bank balances are included/,
  "the download should identify itself as practice-only and explicitly omit bank information");
assert.match(html, /function downloadPracticeReport\(\)[\s\S]*?new Blob[\s\S]*?createObjectURL[\s\S]*?revokeObjectURL/,
  "the report should be generated locally and promptly release its temporary download URL");
assert.match(html, /function resetDemoPractice\(\) \{\s*if \(!READ_ONLY_DEMO \|\| !appAccessReady\) return;/,
  "only the demo may expose the repeatable one-click practice reset");
assert.match(html, /AUTH_SESSION_KEYS\.has\(event\.key\)[\s\S]*?stopBankRequests/,
  "a login change in another tab should immediately cancel and hide bank work");
assert.match(html, /requestRevision !== bankRequestRevision \|\| currentAccessToken !== accessToken/,
  "a bank response from an old login must be discarded");
assert.match(html, /visibilitychange[\s\S]*?stopBankRequests\(\);[\s\S]*?clearEphemeralBankData\(\)/,
  "hiding the tab should cancel requests and clear revealed balances");
assert.match(html, /bankView\.revealed = true/);
assert.match(html, /hasConnection && bankView\.revealed[\s\S]*?No accounts were returned by the bank provider/,
  "an empty successful response should not misleadingly say balances are still PIN-locked");
assert.match(html, /requestResult === "sent" \|\| requestResult === "preview"[\s\S]*?addHistoryNote\(`\$\{priorityLabel\} requested: \$\{name\}`,[\s\S]*?pending/,
  "failed or duplicate requests must not create fake spending-history entries");
assert.doesNotMatch(html, /addHistory\("Requested:[\s\S]*?-cost/,
  "a pending purchase must not look like money was already deducted");
assert.match(html, /addHistoryNote\("Asked parent to review", "Waiting"/,
  "a review request should not appear as a meaningless positive zero transaction");
assert.match(html, /Math\.max\(0, state\.balance - state\.savedWeek\)/,
  "the same practice money must not be counted as newly saved more than once");
assert.match(html, /const progress = Math\.min\(100, Math\.round\(\(state\.savedWeek \/ Math\.max\(1, state\.goal\)\) \* 100\)\)/,
  "goal progress should measure the savings pot instead of all available practice money");
assert.match(html, /const availableBalance = Math\.max\(0, state\.balance - state\.savedWeek\)[\s\S]*?#balance"\)\.textContent = formatMoney\(availableBalance\)/,
  "the headline should show truly available practice money after savings are reserved");
assert.match(html, /const amount = Math\.min\(5, Math\.max\(0, state\.balance - state\.savedWeek\), Math\.max\(0, state\.goal - state\.savedWeek\)\)/,
  "Save should move only unreserved money and stop exactly at the selected goal");
assert.match(html, /Choice type[\s\S]*?Need[\s\S]*?Want[\s\S]*?Gift/,
  "the request planner should teach need-versus-want thinking");
assert.match(html, /familyMatchesSession\(loadedFamily, verifiedSession, verifiedOwnerId\)/,
  "the bank panel should verify the loaded cloud family against the signed-in owner");
assert.match(html, /let plaidCallbackHandled = false;[\s\S]*?if \(plaidCallbackHandled \|\| operationRevision !== bankRequestRevision\) return false;/,
  "duplicate or stale Plaid callbacks must not exchange a link token twice");
assert.match(html, /confirmAndRun\("disconnect", !bankService\.pinConfigured/,
  "a damaged connection without a valid saved PIN should require verified PIN enrollment before cleanup");
assert.match(html, /providerRevocationConfirmed === false[\s\S]*?provider could not confirm/,
  "local-only bank cleanup must not pretend provider-side revocation was confirmed");
assert.match(html, /const cost = parsePracticeRequestAmount\(itemCostInput\.value\)/,
  "spending requests should reject malformed amounts instead of silently coercing them");
assert.match(html, /if \(!appAccessReady \|\| spendRequestBusy\) return;/,
  "spending requests should remain single-submit and fail closed when access is revoked");
assert.match(html, /response\.status === 401[\s\S]*?setAppAccessReady\(false\)/,
  "an expired bank session should lock connected practice controls");
assert.match(html, /bank_request_uncertain/,
  "ambiguous network outcomes should be marked for a protected status reconciliation");
assert.match(html, /BANK_STATE_RECONCILE_CODES[\s\S]*?async function reconcileBankState\(error\)[\s\S]*?await loadBankStatus\(\)/,
  "conflicting or ambiguous bank results should refresh authoritative server state");
assert.match(html, /BANK_BALANCE_VISIBILITY_MS[\s\S]*?function scheduleBankBalanceHide\(\)[\s\S]*?clearEphemeralBankData\(\)/,
  "revealed balances should automatically return to the PIN-protected state");
assert.doesNotMatch(html, /:\s*\{ error: await response\.text\(\) \}/,
  "unexpected same-origin error pages must not be copied into user-facing bank errors");
assert.match(html, /function normalizedBankPin\(value\)[\s\S]*?replace\(\/\\s\/g, ""\)/,
  "spaces may be removed from a Bank PIN, but other invalid characters must remain visible for validation");
assert.doesNotMatch(html, /input\.value = input\.value\.replace\(\/\\D\/g, ""\)\.slice\(0, 8\)/,
  "Bank PIN entry must not silently turn invalid text into a different valid PIN");

const safeTextSource = html.match(/function safeText\(value, maxLength = 120\) \{[\s\S]*?(?=\n\s*function sanitizeInstitution)/)?.[0];
const finiteNumberSource = html.match(/function finiteNumber\(value, fallback = 0\) \{[\s\S]*?(?=\n\s*function boundedMoney)/)?.[0];
const boundedMoneySource = html.match(/function boundedMoney\(value, fallback = 0, minimum = 0\) \{[\s\S]*?(?=\n\s*function parsePracticeRequestAmount)/)?.[0];
const parsePracticeRequestAmountSource = html.match(/function parsePracticeRequestAmount\(value\) \{[\s\S]*?(?=\n\s*function safeText)/)?.[0];
const normalizedBankPinSource = html.match(/function normalizedBankPin\(value\) \{[\s\S]*?(?=\n\s*\[bankPinInput)/)?.[0];
const sanitizeInstitutionSource = html.match(/function sanitizeInstitution\(value\) \{[\s\S]*?(?=\n\s*function validCurrency)/)?.[0];
const validCurrencySource = html.match(/function validCurrency\(value\) \{[\s\S]*?(?=\n\s*function validParentStatus)/)?.[0];
const normalizeBankStatusSource = html.match(/function normalizeBankStatus\(data\) \{[\s\S]*?(?=\n\s*function normalizeAccount)/)?.[0];
const normalizeAccountSource = html.match(/function normalizeAccount\(account\) \{[\s\S]*?(?=\n\s*function clearEphemeralBankData)/)?.[0];
const practiceStateSnapshotSource = html.match(/function practiceStateSnapshot\(value\) \{[\s\S]*?(?=\n\s*function clearDemoPracticeRecord)/)?.[0];
const clearDemoPracticeRecordSource = html.match(/function clearDemoPracticeRecord\(\) \{[\s\S]*?(?=\n\s*function readDemoPracticeRecord)/)?.[0];
const readDemoPracticeRecordSource = html.match(/function readDemoPracticeRecord\(\) \{[\s\S]*?(?=\n\s*function discardDamagedPracticeRecord)/)?.[0];
const practiceStorageHelpersSource = html.match(/function discardDamagedPracticeRecord\(\) \{[\s\S]*?(?=\n\s*function loadState)/)?.[0];
const ownerScopedPracticeProfilesSource = html.match(/function ownerScopedPracticeProfiles\(value\) \{[\s\S]*?(?=\n\s*function save)/)?.[0];
const familyMatchesSessionSource = html.match(/function familyMatchesSession\(family, session, expectedOwnerId = verifiedOwnerId\) \{[\s\S]*?(?=\n\s*async function fetchVerifiedFamily)/)?.[0];
const parentConfirmationErrorSource = html.match(/function isParentConfirmationError\(error\) \{[\s\S]*?(?=\n\s*async function confirmAndRun)/)?.[0];
const normalizeDashboardRequestSource = html.match(/function normalizeDashboardRequest\(request\) \{[\s\S]*?(?=\n\s*function smartSpendingAccessAllowed)/)?.[0];
const smartSpendingAccessAllowedSource = html.match(/function smartSpendingAccessAllowed\(child\) \{[\s\S]*?(?=\n\s*function isFamilyWriteConflict)/)?.[0];
const isFamilyWriteConflictSource = html.match(/function isFamilyWriteConflict\(error\) \{[\s\S]*?(?=\n\s*function copyFamilyState)/)?.[0];
const copyFamilyStateSource = html.match(/function copyFamilyState\(value\) \{[\s\S]*?(?=\n\s*function familyMatchesSession)/)?.[0];
const fetchVerifiedFamilySource = html.match(/async function fetchVerifiedFamily\(expectedOwnerId = ""\) \{[\s\S]*?(?=\n\s*async function enqueueDashboardRequest)/)?.[0];
const enqueueDashboardRequestSource = html.match(/async function enqueueDashboardRequest\(request\) \{[\s\S]*?(?=\n\s*async function requestKiddoSproutAccess)/)?.[0];
const refreshParentStatusSource = html.match(/function refreshParentStatusFromDashboard\(\) \{[\s\S]*?(?=\n\s*async function canOpenKiddoSproutApp)/)?.[0];
const freshDemoBankStatusSource = html.match(/function freshDemoBankStatus\(\) \{[\s\S]*?(?=\n\s*let bankService)/)?.[0];
const getDemoBankOptionSource = html.match(/function getDemoBankOption\(value\) \{[\s\S]*?(?=\n\s*function closeDemoBankDialog)/)?.[0];
const connectPracticeBankSource = html.match(/function connectPracticeBank\(optionId\) \{[\s\S]*?(?=\n\s*function togglePracticeBankBalances)/)?.[0];
const togglePracticeBankBalancesSource = html.match(/function togglePracticeBankBalances\(\) \{[\s\S]*?(?=\n\s*function disconnectPracticeBank)/)?.[0];
const disconnectPracticeBankSource = html.match(/function disconnectPracticeBank\(\) \{[\s\S]*?(?=\n\s*function setAppAccessReady)/)?.[0];
const createPracticeReportSource = html.match(/function createPracticeReport\(\) \{[\s\S]*?(?=\n\s*function downloadPracticeReport)/)?.[0];
assert.ok(safeTextSource && normalizeDashboardRequestSource && smartSpendingAccessAllowedSource
  && isFamilyWriteConflictSource && copyFamilyStateSource
  && fetchVerifiedFamilySource && enqueueDashboardRequestSource && refreshParentStatusSource,
  "Smart Spending request queue and reconciliation helpers should exist");
assert.ok(finiteNumberSource && boundedMoneySource && sanitizeInstitutionSource
  && normalizeBankStatusSource && practiceStorageHelpersSource && ownerScopedPracticeProfilesSource
  && familyMatchesSessionSource && parentConfirmationErrorSource
  && parsePracticeRequestAmountSource && normalizedBankPinSource && normalizeAccountSource
  && validCurrencySource && practiceStateSnapshotSource && clearDemoPracticeRecordSource
  && readDemoPracticeRecordSource,
"Smart Spending money, bank-response, and family-ownership guards should exist");
assert.ok(freshDemoBankStatusSource && getDemoBankOptionSource && connectPracticeBankSource
  && togglePracticeBankBalancesSource && disconnectPracticeBankSource && createPracticeReportSource,
"Smart Spending should include a complete local demo-bank journey and safe report generator");
for (const demoSource of [connectPracticeBankSource, togglePracticeBankBalancesSource, disconnectPracticeBankSource]) {
  assert.doesNotMatch(demoSource, /\b(?:fetch|apiPost|localStorage|sessionStorage)\b/,
    "fictional demo-bank actions must remain network-free and must not persist financial-looking fixtures");
}
assert.doesNotMatch(createPracticeReportSource, /bankService|bankView|DEMO_BANK_OPTIONS|institution/i,
  "the downloadable practice report must not read bank state or include financial account fixtures");
assert.doesNotMatch(practiceStateSnapshotSource, /bank|institution|account|password|token/i,
  "the session-persisted demo snapshot must allowlist practice fields and exclude bank or account data");

const helperResults = vm.runInNewContext(`(() => {
  const MAX_PRACTICE_AMOUNT = 1000000;
  ${finiteNumberSource}
  ${boundedMoneySource}
  ${parsePracticeRequestAmountSource}
  ${normalizedBankPinSource}
  ${safeTextSource}
  ${sanitizeInstitutionSource}
  ${validCurrencySource}
  ${normalizeBankStatusSource}
  ${normalizeAccountSource}
  ${familyMatchesSessionSource}
  ${parentConfirmationErrorSource}
  return {
    negative: boundedMoney(-5, 18),
    blank: boundedMoney(" ", 18),
    boolean: boundedMoney(true, 18),
    enormous: boundedMoney(Number.MAX_VALUE, 18),
    rounded: boundedMoney(4.999, 18),
    exponentString: boundedMoney("1e3", 18),
    hexadecimalString: boundedMoney("0x10", 18),
    validRequestAmount: parsePracticeRequestAmount("12.35"),
    blankRequestAmount: parsePracticeRequestAmount(" "),
    textRequestAmount: parsePracticeRequestAmount("4oops"),
    exponentRequestAmount: parsePracticeRequestAmount("1e3"),
    preciseRequestAmount: parsePracticeRequestAmount("4.999"),
    hugeRequestAmount: parsePracticeRequestAmount("1000001"),
    spacedPin: normalizedBankPin("12 34"),
    invalidPin: normalizedBankPin("12a34"),
    spoofedFalse: normalizeBankStatus({ mode: "demo", configured: true, connected: "false" }),
    persistedDemo: normalizeBankStatus({
      mode: "demo", configured: false, connected: true,
      canConnect: false, canView: true, canDisconnect: true
    }),
    malformedAccount: normalizeAccount({
      name: "Example", mask: "1234", currency: "GBP",
      available: "12.34", current: false
    }),
    practiceProfiles: (() => {
      ${ownerScopedPracticeProfilesSource}
      return ownerScopedPracticeProfiles({
        "parent@example.test\\u001fchild-1": { balance: 9 },
        "550e8400-e29b-41d4-a716-446655440000\\u001fchild-1": { balance: 18 }
      });
    })(),
    ownerMatches: familyMatchesSession(
      { parentEmail: " Parent@Example.test " },
      { user: { id: "owner-1", email: "parent@example.test" } },
      "owner-1"
    ),
    ownerMismatch: familyMatchesSession(
      { parentEmail: "first@example.test" },
      { user: { id: "owner-1", email: "second@example.test" } },
      "owner-1"
    ),
    wrongOwnerId: familyMatchesSession(
      { parentEmail: "parent@example.test" },
      { user: { id: "owner-2", email: "parent@example.test" } },
      "owner-1"
    ),
    missingOwner: familyMatchesSession(
      {},
      { user: { id: "owner-1", email: "parent@example.test" } },
      "owner-1"
    ),
    retryWrongPin: isParentConfirmationError({ status: 403, code: "incorrect_pin" }),
    stopMissingPin: isParentConfirmationError({ status: 404, code: "pin_not_configured" })
  };
})()`, {});
assert.equal(helperResults.negative, 0);
assert.equal(helperResults.blank, 18);
assert.equal(helperResults.boolean, 18);
assert.equal(helperResults.enormous, 1000000);
assert.equal(helperResults.rounded, 5);
assert.equal(helperResults.exponentString, 18);
assert.equal(helperResults.hexadecimalString, 18);
assert.equal(helperResults.validRequestAmount, 12.35);
assert.equal(helperResults.blankRequestAmount, null);
assert.equal(helperResults.textRequestAmount, null);
assert.equal(helperResults.exponentRequestAmount, null);
assert.equal(helperResults.preciseRequestAmount, null);
assert.equal(helperResults.hugeRequestAmount, null);
assert.equal(helperResults.spacedPin, "1234");
assert.equal(helperResults.invalidPin, "12a34");
assert.equal(helperResults.spoofedFalse.hasConnection, false,
  "string values from malformed responses must not turn into true bank state");
assert.equal(helperResults.persistedDemo.canView, true);
assert.equal(helperResults.persistedDemo.canDisconnect, true);
assert.equal(helperResults.malformedAccount.available, null);
assert.equal(helperResults.malformedAccount.current, null,
  "malformed server values must never appear as real account balances");
assert.deepEqual(
  Object.keys(helperResults.practiceProfiles),
  ["550e8400-e29b-41d4-a716-446655440000\u001fchild-1"],
  "legacy email-keyed profiles must not survive an owner-scoped practice save"
);
assert.equal(helperResults.ownerMatches, true);
assert.equal(helperResults.ownerMismatch, false);
assert.equal(helperResults.wrongOwnerId, false);
assert.equal(helperResults.missingOwner, false);
assert.equal(helperResults.retryWrongPin, true);
assert.equal(helperResults.stopMissingPin, false,
  "a missing server-side PIN must not trap the parent in an endless retry dialog");

const demoBankFlow = vm.runInNewContext(`(() => {
  const READ_ONLY_DEMO = true;
  let appAccessReady = true;
  let demoBankChoice = "sprout";
  const DEMO_BANK_OPTIONS = {
    sprout: {
      id: "sprout",
      institution: "Sprout Community Bank",
      accounts: [{ name: "Practice spending", available: 24.5, currency: "GBP" }]
    },
    sunrise: {
      id: "sunrise",
      institution: "Sunrise Pocket Credit Union",
      accounts: [{ name: "Practice pocket money", available: 16.75, currency: "GBP" }]
    }
  };
  const bankView = { institution: "", accounts: [], revealed: false };
  let bankService;
  const notices = [];
  const safeText = (value, maxLength = 120) => String(value ?? "").trim().slice(0, maxLength);
  const normalizeAccount = (value) => ({ ...value });
  const clearEphemeralBankData = () => {
    bankView.institution = "";
    bankView.accounts = [];
    bankView.revealed = false;
  };
  const renderBank = () => undefined;
  const showToast = (message) => notices.push(message);
  ${freshDemoBankStatusSource}
  ${getDemoBankOptionSource}
  ${connectPracticeBankSource}
  ${togglePracticeBankBalancesSource}
  ${disconnectPracticeBankSource}
  bankService = freshDemoBankStatus();
  const connected = connectPracticeBank("sunrise");
  const afterConnect = {
    connected: bankService.hasConnection,
    institution: bankService.institution,
    revealed: bankView.revealed,
    canView: bankService.canView,
    canDisconnect: bankService.canDisconnect
  };
  const shown = togglePracticeBankBalances();
  const afterShow = { revealed: bankView.revealed, accounts: bankView.accounts.length };
  const hidden = togglePracticeBankBalances();
  const afterHide = { revealed: bankView.revealed, accounts: bankView.accounts.length };
  const disconnected = disconnectPracticeBank();
  const afterDisconnect = {
    connected: bankService.hasConnection,
    canConnect: bankService.canConnect,
    revealed: bankView.revealed
  };
  return { connected, afterConnect, shown, afterShow, hidden, afterHide, disconnected, afterDisconnect, notices };
})()`, {});
assert.equal(demoBankFlow.connected, true);
assert.equal(demoBankFlow.afterConnect.connected, true);
assert.equal(demoBankFlow.afterConnect.institution, "Sunrise Pocket Credit Union");
assert.equal(demoBankFlow.afterConnect.revealed, false);
assert.equal(demoBankFlow.afterConnect.canView, true);
assert.equal(demoBankFlow.afterConnect.canDisconnect, true);
assert.equal(demoBankFlow.shown, true);
assert.equal(demoBankFlow.afterShow.revealed, true);
assert.equal(demoBankFlow.afterShow.accounts, 1);
assert.equal(demoBankFlow.hidden, true);
assert.equal(demoBankFlow.afterHide.revealed, false);
assert.equal(demoBankFlow.afterHide.accounts, 0);
assert.equal(demoBankFlow.disconnected, true);
assert.equal(demoBankFlow.afterDisconnect.connected, false);
assert.equal(demoBankFlow.afterDisconnect.canConnect, true);
assert.equal(demoBankFlow.afterDisconnect.revealed, false);
assert.ok(demoBankFlow.notices.every((message) => /fictional|sample|practice|real account/i.test(message)),
  "every demo-bank result should continue to identify itself as simulated");

function exerciseDemoPracticeRecord(raw) {
  let stored = raw;
  let removals = 0;
  const result = vm.runInNewContext(`(() => {
    const DEMO_STORAGE_KEY = "kiddosprout.demo.v1.smart-spending";
    const MAX_DEMO_STORAGE_CHARACTERS = 32 * 1024;
    const DEFAULT_STATE = { balance: 18, allowance: 5, goal: 40, goalName: "New Football", savedWeek: 0, parentStatus: "Ready", currency: "GBP", history: [] };
    ${safeTextSource}
    ${practiceStateSnapshotSource}
    ${clearDemoPracticeRecordSource}
    ${readDemoPracticeRecordSource}
    return readDemoPracticeRecord();
  })()`, {
    sessionStorage: {
      getItem: () => stored,
      removeItem: () => { stored = null; removals += 1; }
    },
    JSON,
    String,
    Array,
    Object
  });
  return { result, removals, stored };
}

const demoPracticeRecord = exerciseDemoPracticeRecord(JSON.stringify({
  version: 1,
  practice: {
    balance: 23,
    allowance: 5,
    goal: 50,
    goalName: "Bike",
    savedWeek: 10,
    parentStatus: "Ready",
    currency: "GBP",
    history: [{ label: "Saved", amount: "£5.00", type: "save" }],
    bankPassword: "must-not-survive",
    institution: "must-not-survive"
  }
}));
assert.equal(demoPracticeRecord.result?.goalName, "Bike");
assert.equal(demoPracticeRecord.result?.currency, "GBP");
assert.equal("bankPassword" in demoPracticeRecord.result, false);
assert.equal("institution" in demoPracticeRecord.result, false);
assert.equal(demoPracticeRecord.removals, 0);
for (const damagedDemoRecord of ["{bad-json", "x".repeat((32 * 1024) + 1)]) {
  const recovered = exerciseDemoPracticeRecord(damagedDemoRecord);
  assert.equal(recovered.result, null);
  assert.equal(recovered.removals, 1, "an invalid or oversized demo session record should be discarded");
}

function exercisePracticeRecord(raw) {
  let stored = raw;
  let removals = 0;
  const summary = vm.runInNewContext(`(() => {
    const STORAGE_KEY = "kiddoSproutSmartSpendingV3";
    const MAX_PRACTICE_STORAGE_CHARACTERS = 256 * 1024;
    ${practiceStorageHelpersSource}
    const record = readPracticeRecord();
    return record ? { version: record.version, profileCount: Object.keys(record.profiles).length } : null;
  })()`, {
    localStorage: {
      getItem: () => stored,
      removeItem: () => { stored = null; removals += 1; }
    }
  });
  return { summary, removals, stored };
}

const validPracticeRecord = exercisePracticeRecord(JSON.stringify({
  version: 1,
  profiles: { "550e8400-e29b-41d4-a716-446655440000\u001fchild-1": { balance: 18 } }
}));
assert.equal(validPracticeRecord.summary?.version, 1);
assert.equal(validPracticeRecord.summary?.profileCount, 1);
assert.equal(validPracticeRecord.removals, 0);

for (const damagedRecord of [
  "{not-json",
  JSON.stringify({ version: 1, profiles: [] }),
  "x".repeat((256 * 1024) + 1)
]) {
  const recovered = exercisePracticeRecord(damagedRecord);
  assert.equal(recovered.summary, null);
  assert.equal(recovered.removals, 1,
    "a malformed practice record must be removed so the next save can recover");
  assert.equal(recovered.stored, null);
}

function initialFamily() {
  return {
    parentAccountCreated: true,
    parentEmail: "parent@example.test",
    activeChild: "child-1",
    children: {
      "child-1": {
        pending: 1,
        currentRequest: ["Older request", "Already waiting", "O", "appDownload"]
      }
    }
  };
}

function makeQueue(readOnlyDemo = false, options = {}) {
  let cloudFamily = structuredClone(options.family || initialFamily());
  const stats = { validates: 0, loads: 0, saves: 0, conflicts: 0 };
  const session = {
    user: {
      id: options.sessionOwnerId || "owner-1",
      email: options.sessionEmail || "parent@example.test"
    }
  };
  const windowObject = {
    KiddoSproutSession: {
      async validate() {
        stats.validates += 1;
        if (options.explodeNetwork) throw new Error("Demo touched account validation.");
        return structuredClone(session);
      }
    },
    KiddoSproutFamilyState: {
      async load(loadOptions = {}) {
        stats.loads += 1;
        if (options.explodeNetwork) throw new Error("Demo touched family storage.");
        if (loadOptions.expectedOwnerId && loadOptions.expectedOwnerId !== session.user.id) {
          throw new Error("Wrong expected owner.");
        }
        return structuredClone(cloudFamily);
      },
      async save(value, saveOptions = {}) {
        stats.saves += 1;
        if (options.explodeNetwork) throw new Error("Demo touched family storage.");
        if (saveOptions.expectedOwnerId && saveOptions.expectedOwnerId !== session.user.id) {
          throw new Error("Wrong expected owner.");
        }
        if (options.conflictOnce && stats.conflicts === 0) {
          stats.conflicts += 1;
          const conflict = new Error("Family settings changed in another tab.");
          conflict.kind = "conflict";
          throw conflict;
        }
        if (options.failSave) throw new Error("Cloud save failed.");
        cloudFamily = structuredClone(value);
        return structuredClone(cloudFamily);
      }
    }
  };
  const queue = vm.runInNewContext(`(() => {
    const READ_ONLY_DEMO = ${readOnlyDemo};
    let verifiedSession = ${JSON.stringify(session)};
    let verifiedOwnerId = "owner-1";
    let loadedFamily = ${JSON.stringify(cloudFamily)};
    let familyWriteTail = Promise.resolve();
    ${safeTextSource}
    ${normalizeDashboardRequestSource}
    ${smartSpendingAccessAllowedSource}
    ${isFamilyWriteConflictSource}
    ${copyFamilyStateSource}
    ${familyMatchesSessionSource}
    ${fetchVerifiedFamilySource}
    ${enqueueDashboardRequestSource}
    return { enqueueDashboardRequest, loaded: () => loadedFamily };
  })()`, { window: windowObject, JSON, Promise, Error, String, Array, Number, Object });
  return {
    queue,
    stats,
    read: () => structuredClone(cloudFamily),
    write: (value) => { cloudFamily = structuredClone(value); }
  };
}

const live = makeQueue();
const newRequest = ["Football", "Spend request for £4", "$", "spendRequest", "4"];
assert.equal(await live.queue.enqueueDashboardRequest(newRequest), "sent");
let family = live.read();
let child = family.children[family.activeChild];
assert.equal(child.pending, 2);
assert.equal(child.requests.length, 2);
assert.equal(child.currentRequest[0], "Older request", "legacy requests should remain first in the FIFO");
assert.equal(child.requests[1][0], "Football");
assert.equal(await live.queue.enqueueDashboardRequest(newRequest), "duplicate");
assert.equal(live.read().children[family.activeChild].requests.length, 2);
assert.ok(live.stats.validates >= 2 && live.stats.loads >= 2 && live.stats.saves === 1,
  "each live write must revalidate and load the owner row, while duplicates must not save");

child.requests = Array.from({ length: 100 }, (_, index) => [
  `Request ${index}`,
  "Waiting",
  "R",
  "spendRequest",
  String(index)
]);
child.pending = child.requests.length;
child.currentRequest = [...child.requests[0]];
live.write(family);
assert.equal(await live.queue.enqueueDashboardRequest(newRequest), "full");
assert.equal(live.read().children[family.activeChild].requests.length, 100);

const failedSave = makeQueue(false, { failSave: true });
const failedBefore = JSON.stringify(failedSave.read());
assert.equal(await failedSave.queue.enqueueDashboardRequest(newRequest), "unavailable");
assert.equal(JSON.stringify(failedSave.read()), failedBefore,
  "a failed cloud save must not pretend that the dashboard queue changed");
assert.equal(failedSave.stats.saves, 1);

const conflictedSave = makeQueue(false, { conflictOnce: true });
assert.equal(await conflictedSave.queue.enqueueDashboardRequest(newRequest), "sent");
assert.equal(conflictedSave.stats.saves, 2);
assert.equal(conflictedSave.stats.loads, 2);
assert.equal(conflictedSave.read().children["child-1"].requests.at(-1)[0], "Football",
  "a single compare-and-swap conflict should reload, merge, and save the request once");

const changedOwner = makeQueue(false, { sessionOwnerId: "owner-2" });
assert.equal(await changedOwner.queue.enqueueDashboardRequest(newRequest), "unavailable");
assert.equal(changedOwner.stats.loads, 0);
assert.equal(changedOwner.stats.saves, 0,
  "a changed login must fail before any family row is loaded or saved");

const changedChild = makeQueue();
changedChild.write({
  ...initialFamily(),
  activeChild: "child-2",
  children: { "child-2": { pending: 0, requests: [] } }
});
assert.equal(await changedChild.queue.enqueueDashboardRequest(newRequest), "access-changed");
assert.equal(changedChild.stats.saves, 0,
  "a request from a stale child screen must not be delivered to a newly active child");

for (const rule of ["request", "blocked"]) {
  const baseFamily = initialFamily();
  baseFamily.children["child-1"].appRules = { spending: rule };
  const changedRule = makeQueue(false, { family: baseFamily });
  assert.equal(await changedRule.queue.enqueueDashboardRequest(newRequest), "access-changed");
  assert.equal(changedRule.stats.saves, 0,
    `a latest ${rule} parent rule must stop a stale spending request before save`);
}

function statusReader(nextFamily) {
  return vm.runInNewContext(`(() => {
    const READ_ONLY_DEMO = false;
    const state = { parentStatus: "Ready" };
    const loadedFamily = ${JSON.stringify(nextFamily)};
    ${safeTextSource}
    ${normalizeDashboardRequestSource}
    ${refreshParentStatusSource}
    refreshParentStatusFromDashboard();
    return state.parentStatus;
  })()`, { JSON });
}

assert.equal(statusReader(family), "Waiting");
child.requests = [["Review", "Please review", "$", "spendReview"]];
child.pending = 1;
child.currentRequest = [...child.requests[0]];
assert.equal(statusReader(family), "Asked");
child.requests = [];
child.pending = 0;
child.currentRequest = ["No request", "No pending request", "-"];
assert.equal(statusReader(family), "Ready", "resolved requests should stop showing a stale waiting status");

const preview = makeQueue(true, { explodeNetwork: true });
const previewBefore = JSON.stringify(preview.read());
assert.equal(await preview.queue.enqueueDashboardRequest(newRequest), "preview");
assert.equal(JSON.stringify(preview.read()), previewBefore, "public preview requests must remain tab-only practice");
assert.deepEqual(preview.stats, { validates: 0, loads: 0, saves: 0, conflicts: 0 },
  "the public demo must not touch auth or family APIs");

console.log("Smart Spending UI tests passed: GBP practice planning, session-safe demo progress, local bank simulation, report downloads, owner-scoped live access, and fail-closed security.");
