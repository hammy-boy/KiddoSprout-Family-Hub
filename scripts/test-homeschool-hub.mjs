import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const ROOT = new URL("../", import.meta.url);
const [markup, styles, curriculumSource, controllerSource] = await Promise.all([
  readFile(new URL("learning-path.html", ROOT), "utf8"),
  readFile(new URL("learning-path.css", ROOT), "utf8"),
  readFile(new URL("learning-curriculum.js", ROOT), "utf8"),
  readFile(new URL("learning-path.js", ROOT), "utf8")
]);

new vm.Script(curriculumSource, { filename: "learning-curriculum.js" });
new vm.Script(controllerSource, { filename: "learning-path.js" });

const curriculumWindow = {};
vm.runInNewContext(curriculumSource, { window: curriculumWindow }, {
  filename: "learning-curriculum.js"
});
const curriculum = curriculumWindow.KiddoSproutCurriculum;

assert.ok(curriculum, "The Homeschool Hub curriculum did not initialise.");
assert.equal(curriculum.version, 1);
assert.deepEqual(Array.from(curriculum.stages, (stage) => stage.id), ["sprouts", "growers", "explorers"]);
assert.deepEqual(Array.from(curriculum.subjects, (subject) => subject.id), ["maths", "english", "science"]);
assert.equal(curriculum.lessons.length, 15,
  "The reviewed starter curriculum should keep its 15 stable lessons.");

function assertDeepFrozen(value, path = "curriculum") {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true, `${path} must be immutable at runtime.`);
  for (const [key, child] of Object.entries(value)) assertDeepFrozen(child, `${path}.${key}`);
}
assertDeepFrozen(curriculum);

const stages = new Set(curriculum.stages.map((stage) => stage.id));
const subjects = new Set(curriculum.subjects.map((subject) => subject.id));
const unitIds = new Set();
const lessonIds = new Set();
const activityIds = new Set();
const derivedLessons = new Map();
const coverage = new Set();
const activityTypes = new Set();

for (const stage of curriculum.stages) {
  assert.match(stage.id, /^[a-z0-9-]+$/);
  assert.match(stage.ages, /^\d{1,2}-\d{1,2}$/);
  assert.ok(stage.name.trim() && stage.blurb.trim(), `${stage.id} needs a name and family-facing summary.`);
}

for (const subject of curriculum.subjects) {
  assert.match(subject.id, /^[a-z0-9-]+$/);
  assert.ok(subject.name.trim() && subject.blurb.trim(), `${subject.id} needs a name and summary.`);
  assert.ok(Array.isArray(subject.units) && subject.units.length >= 3,
    `${subject.name} must cover every starter stage.`);

  for (const unit of subject.units) {
    assert.equal(stages.has(unit.stage), true, `${unit.id} uses an unknown learning stage.`);
    assert.equal(unitIds.has(unit.id), false, `Duplicate curriculum unit ID: ${unit.id}`);
    unitIds.add(unit.id);
    coverage.add(`${subject.id}:${unit.stage}`);
    assert.ok(unit.title.trim() && unit.summary.trim(), `${unit.id} needs a title and summary.`);
    assert.ok(Array.isArray(unit.lessons) && unit.lessons.length > 0, `${unit.id} has no lessons.`);

    for (const lesson of unit.lessons) {
      assert.match(lesson.id, /^[a-z0-9-]+$/);
      assert.equal(lessonIds.has(lesson.id), false, `Duplicate curriculum lesson ID: ${lesson.id}`);
      lessonIds.add(lesson.id);
      assert.ok(lesson.title.trim() && lesson.objective.trim(), `${lesson.id} needs a title and objective.`);
      assert.ok(Number.isInteger(lesson.minutes) && lesson.minutes >= 5 && lesson.minutes <= 60,
        `${lesson.id} has an unreasonable lesson duration.`);
      assert.ok(Array.isArray(lesson.teach) && lesson.teach.length >= 3,
        `${lesson.id} needs enough guided teaching steps.`);
      assert.ok(Array.isArray(lesson.vocab) && lesson.vocab.length > 0,
        `${lesson.id} needs accessible vocabulary support.`);
      assert.equal(lesson.vocab.every((entry) => (
        Array.isArray(entry) && entry.length === 2 && entry.every((part) => typeof part === "string" && part.trim())
      )), true, `${lesson.id} has malformed vocabulary.`);
      assert.ok(typeof lesson.task === "string" && lesson.task.trim(),
        `${lesson.id} needs an away-from-screen activity.`);

      const activity = lesson.activity;
      assert.ok(activity && typeof activity === "object", `${lesson.id} needs a practice activity.`);
      assert.equal(activityIds.has(activity.id), false, `Duplicate practice activity ID: ${activity.id}`);
      activityIds.add(activity.id);
      assert.equal(activity.id, `${lesson.id}-practice`, `${lesson.id} has an unstable activity ID.`);
      assert.ok(typeof activity.prompt === "string" && activity.prompt.trim(),
        `${activity.id} needs an accessible prompt.`);
      assert.ok(["quiz", "fill", "order", "match"].includes(activity.type),
        `${activity.id} uses an unsupported activity type.`);
      activityTypes.add(activity.type);

      if (activity.type === "quiz") {
        assert.ok(Array.isArray(activity.options) && activity.options.length >= 2);
        assert.ok(Number.isInteger(activity.answer) && activity.answer >= 0 && activity.answer < activity.options.length);
      } else if (activity.type === "fill") {
        assert.ok(Array.isArray(activity.accept) && activity.accept.length > 0);
        assert.equal(activity.accept.every((answer) => typeof answer === "string" && answer.trim()), true);
      } else if (activity.type === "order") {
        assert.ok(Array.isArray(activity.items) && activity.items.length >= 3);
        assert.equal(new Set(activity.items).size, activity.items.length,
          `${activity.id} contains duplicate ordering choices.`);
      } else if (activity.type === "match") {
        assert.ok(Array.isArray(activity.pairs) && activity.pairs.length >= 2);
        assert.equal(activity.pairs.every((pair) => (
          Array.isArray(pair) && pair.length === 2 && pair.every((part) => typeof part === "string" && part.trim())
        )), true, `${activity.id} has malformed matching choices.`);
      }

      derivedLessons.set(lesson.id, {
        subjectId: subject.id,
        subjectName: subject.name,
        unitId: unit.id,
        unitTitle: unit.title,
        stage: unit.stage
      });
    }
  }
}

for (const subjectId of subjects) {
  for (const stageId of stages) {
    assert.equal(coverage.has(`${subjectId}:${stageId}`), true,
      `${subjectId} has no starter unit for ${stageId}.`);
  }
}
assert.deepEqual([...activityTypes].sort(), ["fill", "match", "order", "quiz"],
  "The starter path must exercise every supported activity type.");
assert.equal(curriculum.lessons.length, lessonIds.size,
  "The flattened lesson index does not match the nested curriculum.");
for (const lesson of curriculum.lessons) {
  const expected = derivedLessons.get(lesson.id);
  assert.ok(expected, `Flattened lesson ${lesson.id} is not present in a subject unit.`);
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(lesson[key], value, `Flattened lesson ${lesson.id} has the wrong ${key}.`);
  }
}

assert.match(markup, /<html\s+lang=["']en-GB["']/i);
assert.match(markup, /<main\b[^>]*\bid=["']main-content["'][^>]*\btabindex=["']-1["'][^>]*\bdata-hub-page/i,
  "The learning path needs a keyboard-focusable gated main landmark.");
assert.match(markup, /<section\b[^>]*\bdata-hub-lock[^>]*\brole=["']main["'][^>]*\btabindex=["']-1["']/i,
  "The denied state needs its own focusable main landmark.");
assert.match(markup, /family-guided learning support, not an accredited school, qualification, or formal assessment/i,
  "The starter path must not present itself as accredited education.");
assert.equal((markup.match(/\brole=["']tab["']/gi) || []).length, 3,
  "Today, Subjects, and Progress must remain keyboard tabs.");
assert.match(markup, /id=["']learning-status["'][^>]*\brole=["']status["'][^>]*\baria-live=["']polite["']/i);
assert.doesNotMatch(markup, /<[^>]+\son[a-z]+\s*=/i,
  "The Homeschool Hub must not use inline event handlers blocked by the public CSP.");

const gateScriptIndex = markup.indexOf('src="kid-hub-gate.js?v=10"');
const curriculumScriptIndex = markup.indexOf('src="learning-curriculum.js?v=1"');
const controllerScriptIndex = markup.indexOf('src="learning-path.js?v=1"');
assert.ok(gateScriptIndex >= 0 && curriculumScriptIndex > gateScriptIndex && controllerScriptIndex > curriculumScriptIndex,
  "The access gate and curriculum must load before the Homeschool Hub controller.");

assert.match(styles, /@media\s*\(max-width:\s*680px\)/i,
  "The learning path needs a compact phone layout.");
assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/i,
  "The learning path must honour reduced-motion preferences.");
assert.match(styles, /@media\s+print[\s\S]*?#view-progress/i,
  "Progress needs a useful print view.");
assert.match(styles, /\.learning-tabs button\s*\{[\s\S]*?min-height:\s*48px/i,
  "Learning tabs need comfortable touch targets.");
assert.match(styles, /\[hidden\]\s*\{[\s\S]*?display:\s*none\s*!important/i,
  "Hidden gated content must stay hidden before JavaScript finishes.");

assert.match(controllerSource, /const APP_ID = "homeschool";[\s\S]*?const APP_TITLE = "Homeschool Hub";/);
assert.match(controllerSource, /Promise\.resolve\(window\.KiddoHubGate\.protect\(APP_ID, APP_TITLE\)\)[\s\S]*?if \(allowed === true\) initialize\(\)/,
  "The learning path must await an explicit allow result before initialising.");
assert.match(controllerSource, /const CHILD_ID_PATTERN = [^;]+;[\s\S]*?Object\.prototype\.hasOwnProperty\.call\(state\.children, id\)/,
  "Progress must be scoped to a validated active child profile.");
assert.match(controllerSource, /const MAX_COMPLETED = 100;[\s\S]*?const MAX_PROGRESS = 100;[\s\S]*?const MAX_ATTEMPTS = 10_000;/,
  "Stored learning data needs explicit growth limits.");
assert.match(controllerSource, /saveQueue = saveQueue\.catch\(\(\) => false\)\.then\(async \(\) =>/,
  "Progress writes must stay ordered when a child clicks quickly.");
assert.match(controllerSource, /window\.KiddoHubGate\.writeState\(latestFamily\)/,
  "Progress must use the shared family-state writer.");
assert.match(controllerSource, /progress\.attempts < 1 && !progress\.completed/,
  "A lesson must not be completed without trying its practice activity.");
assert.match(controllerSource, /heading\.id = "lesson-title";[\s\S]*?heading\.tabIndex = -1;/,
  "The dynamic lesson workspace must create its accessible heading before it opens.");
assert.match(controllerSource, /\["ArrowLeft", "ArrowRight", "Home", "End"\]/,
  "The tab list needs standard keyboard navigation.");
assert.doesNotMatch(controllerSource, /\b(?:eval|Function)\s*\(|\.innerHTML\s*=|insertAdjacentHTML|document\.write\s*\(/,
  "Learning content must be rendered without string-to-code or string-to-HTML sinks.");
assert.doesNotMatch(controllerSource, /\b(?:fetch|XMLHttpRequest|WebSocket)\b/,
  "The starter curriculum should work without an extra network service.");

function fakeClassList(initial = []) {
  const values = new Set(initial);
  return {
    add(...names) { names.forEach((name) => values.add(name)); },
    remove(...names) { names.forEach((name) => values.delete(name)); },
    toggle(name, force) {
      if (force === true) values.add(name);
      else if (force === false) values.delete(name);
      else if (values.has(name)) values.delete(name);
      else values.add(name);
      return values.has(name);
    },
    contains(name) { return values.has(name); }
  };
}

function fakeNode(initialClasses = []) {
  return {
    classList: fakeClassList(initialClasses),
    dataset: {},
    textContent: "",
    focusCount: 0,
    focus() { this.focusCount += 1; },
    addEventListener() {},
    setAttribute() {},
    removeAttribute() {}
  };
}

async function runGateScenario(gate) {
  const page = fakeNode(["hidden"]);
  const lock = fakeNode(["hidden"]);
  const lockTitle = fakeNode();
  const lockMessage = fakeNode();
  const generic = fakeNode();
  const selectors = new Map([
    ["[data-hub-page]", page],
    ["[data-hub-lock]", lock],
    ["[data-lock-title]", lockTitle],
    ["[data-lock-message]", lockMessage]
  ]);
  const document = {
    documentElement: fakeNode(),
    querySelector(selector) { return selectors.get(selector) || generic; },
    getElementById() { return generic; },
    querySelectorAll() { return []; }
  };
  const emptyStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  const window = {
    KiddoSproutCurriculum: curriculum,
    KiddoHubGate: gate,
    localStorage: emptyStorage,
    sessionStorage: emptyStorage,
    addEventListener() {},
    print() {}
  };
  vm.runInNewContext(controllerSource, { document, window, URL, console }, {
    filename: "learning-path.js"
  });
  await Promise.resolve();
  await Promise.resolve();
  return { page, lock, lockTitle, lockMessage };
}

const gateCalls = [];
await runGateScenario({
  protect(appId, title) {
    gateCalls.push([appId, title]);
    return false;
  }
});
assert.deepEqual(gateCalls, [["homeschool", "Homeschool Hub"]],
  "The controller asked the gate to protect the wrong app.");

const rejected = await runGateScenario({
  protect() { return Promise.reject(new Error("gate unavailable")); }
});
await Promise.resolve();
assert.equal(rejected.page.classList.contains("hidden"), true);
assert.equal(rejected.lock.classList.contains("hidden"), false,
  "A failed parent-access check must reveal a safe unavailable state.");
assert.match(rejected.lockTitle.textContent, /Family access unavailable/);
assert.ok(rejected.lock.focusCount > 0, "The failed gate state should receive keyboard focus.");

const missing = await runGateScenario(null);
assert.equal(missing.page.classList.contains("hidden"), true);
assert.equal(missing.lock.classList.contains("hidden"), false,
  "A missing gate must fail closed.");

console.log("Homeschool Hub checks passed: curriculum integrity, gated access, safe progress persistence, and responsive accessibility are covered.");
