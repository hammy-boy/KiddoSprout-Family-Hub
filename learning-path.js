(function () {
  "use strict";

  const APP_ID = "homeschool";
  const APP_TITLE = "Homeschool Hub";
  const DRAFT_KEY = "kiddosprout.learning-draft.v1";
  const MAX_COMPLETED = 100;
  const MAX_PROGRESS = 100;
  const MAX_ATTEMPTS = 10_000;
  const VALID_VIEWS = new Set(["today", "subjects", "progress"]);
  const CHILD_ID_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,159})$/;
  const OWNER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const page = document.querySelector("[data-hub-page]");
  const lock = document.querySelector("[data-hub-lock]");
  const lockTitle = document.querySelector("[data-lock-title]");
  const lockMessage = document.querySelector("[data-lock-message]");
  const statusNode = document.getElementById("learning-status");
  const hero = document.querySelector(".learning-hero");
  const stageCard = document.querySelector(".stage-card");
  const stageOptions = document.getElementById("stage-options");
  const tabs = document.querySelector(".learning-tabs");
  const views = document.getElementById("learning-views");
  const workspace = document.getElementById("lesson-workspace");
  const lessonContent = document.getElementById("lesson-content");
  const lessonClose = document.getElementById("lesson-close");
  const practiceLibrary = document.querySelector(".practice-library");
  const learnerChip = document.getElementById("learner-chip");
  const curriculum = window.KiddoSproutCurriculum;

  let family = null;
  let child = null;
  let childId = "";
  let learning = null;
  let activeView = "today";
  let previousView = "today";
  let activeLessonId = "";
  let saveQueue = Promise.resolve();
  let saveRevision = 0;
  let initialized = false;

  const stages = Array.isArray(curriculum?.stages) ? curriculum.stages : [];
  const subjects = Array.isArray(curriculum?.subjects) ? curriculum.subjects : [];
  const lessons = Array.isArray(curriculum?.lessons) ? curriculum.lessons : [];
  const stageById = new Map(stages.map((stage) => [stage.id, stage]));
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function boundedInteger(value, fallback, minimum, maximum) {
    const number = Number(value);
    return Number.isFinite(number)
      ? Math.max(minimum, Math.min(maximum, Math.floor(number)))
      : fallback;
  }

  function safeIsoDate(value) {
    if (typeof value !== "string" || value.length > 40) return "";
    const time = Date.parse(value);
    return Number.isFinite(time) ? new Date(time).toISOString() : "";
  }

  function latestIsoDate(first, second) {
    const firstTime = Date.parse(first || "") || 0;
    const secondTime = Date.parse(second || "") || 0;
    if (!firstTime && !secondTime) return "";
    return new Date(Math.max(firstTime, secondTime)).toISOString();
  }

  function setStatus(message, state = "notice") {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.dataset.state = state;
  }

  function showUnavailable(heading, message) {
    page?.classList.add("hidden");
    lock?.classList.remove("hidden");
    if (lockTitle) lockTitle.textContent = heading;
    if (lockMessage) lockMessage.textContent = message;
    lock?.focus?.({ preventScroll: true });
  }

  function readObject(storage, key) {
    try {
      const value = JSON.parse(storage.getItem(key) || "null");
      return isPlainObject(value) ? value : null;
    } catch (error) {
      return null;
    }
  }

  function applyTheme() {
    let source = null;
    let demoActive = false;
    try {
      demoActive = window.sessionStorage.getItem("kiddosprout.demo.v1.active") === "1";
      source = demoActive
        ? readObject(window.sessionStorage, "kiddosprout.demo.v1.family")
        : readObject(window.localStorage, "kiddosproutPreferences");
    } catch (error) {
      source = null;
    }
    const selected = ["auto", "day", "night"].includes(source?.themeMode) ? source.themeMode : "auto";
    const hour = new Date().getHours();
    const resolved = selected === "auto" ? (hour >= 19 || hour < 7 ? "night" : "day") : selected;
    document.documentElement.classList.toggle("theme-night", resolved === "night");
    document.documentElement.classList.toggle("theme-day", resolved === "day");
    document.documentElement.dataset.themeMode = selected;
  }

  function curriculumIsValid() {
    if (!curriculum || curriculum.version !== 1 || stages.length !== 3 || subjects.length < 3 || lessons.length < 9) return false;
    if (lessonById.size !== lessons.length) return false;
    return lessons.every((lesson) => (
      typeof lesson.id === "string"
      && stageById.has(lesson.stage)
      && subjectById.has(lesson.subjectId)
      && isPlainObject(lesson.activity)
      && ["quiz", "fill", "order", "match"].includes(lesson.activity.type)
    ));
  }

  function activeChildContext(state) {
    if (!isPlainObject(state) || !isPlainObject(state.children)) return null;
    const id = typeof state.activeChild === "string" ? state.activeChild.trim() : "";
    if (!CHILD_ID_PATTERN.test(id) || !Object.prototype.hasOwnProperty.call(state.children, id)) return null;
    const selectedChild = state.children[id];
    return isPlainObject(selectedChild) ? { id, child: selectedChild } : null;
  }

  function defaultStageFor(selectedChild) {
    const age = Number(selectedChild?.age);
    if (Number.isFinite(age)) {
      if (age <= 7) return "sprouts";
      if (age <= 9) return "growers";
      return "explorers";
    }
    return "growers";
  }

  function normalizeProgressEntry(value, completedFromList) {
    const source = isPlainObject(value) ? value : {};
    const total = boundedInteger(source.total, 0, 0, 100);
    const bestCorrect = boundedInteger(source.bestCorrect, 0, 0, total || 100);
    return {
      attempts: boundedInteger(source.attempts, 0, 0, MAX_ATTEMPTS),
      completed: source.completed === true || completedFromList,
      bestCorrect,
      total,
      lastCompletedAt: safeIsoDate(source.lastCompletedAt),
      contentVersion: boundedInteger(source.contentVersion, curriculum?.version || 1, 1, 100)
    };
  }

  function normalizeLearning(value, fallbackStage) {
    const source = isPlainObject(value) ? value : {};
    const stageCandidate = source.stageId || source.stage;
    const stageId = stageById.has(stageCandidate) ? stageCandidate : fallbackStage;
    const assignedLessonId = lessonById.has(source.assignedLessonId) ? source.assignedLessonId : "";
    const completedLessonIds = Array.isArray(source.completedLessonIds)
      ? [...new Set(source.completedLessonIds.filter((id) => lessonById.has(id)))].slice(0, MAX_COMPLETED)
      : [];
    const completedSet = new Set(completedLessonIds);
    const progressSource = isPlainObject(source.progress) ? source.progress : {};
    const progress = {};

    Object.entries(progressSource).slice(0, MAX_PROGRESS * 2).forEach(([id, entry]) => {
      if (!lessonById.has(id) || Object.keys(progress).length >= MAX_PROGRESS) return;
      progress[id] = normalizeProgressEntry(entry, completedSet.has(id));
      if (progress[id].completed) completedSet.add(id);
    });

    for (const id of completedSet) {
      if (!progress[id] && Object.keys(progress).length < MAX_PROGRESS) {
        progress[id] = normalizeProgressEntry({}, true);
      }
    }

    return {
      version: 1,
      stageId,
      assignedLessonId,
      completedLessonIds: [...completedSet].slice(0, MAX_COMPLETED),
      progress,
      updatedAt: safeIsoDate(source.updatedAt)
    };
  }

  function mergeProgress(cloudProgress, draftProgress) {
    const merged = {};
    const ids = [...new Set([...Object.keys(cloudProgress || {}), ...Object.keys(draftProgress || {})])];
    for (const id of ids.slice(0, MAX_PROGRESS)) {
      const cloudEntry = normalizeProgressEntry(cloudProgress?.[id], false);
      const draftEntry = normalizeProgressEntry(draftProgress?.[id], false);
      const total = Math.max(cloudEntry.total, draftEntry.total);
      merged[id] = {
        attempts: Math.max(cloudEntry.attempts, draftEntry.attempts),
        completed: cloudEntry.completed || draftEntry.completed,
        bestCorrect: Math.min(total || 100, Math.max(cloudEntry.bestCorrect, draftEntry.bestCorrect)),
        total,
        lastCompletedAt: latestIsoDate(cloudEntry.lastCompletedAt, draftEntry.lastCompletedAt),
        contentVersion: Math.max(cloudEntry.contentVersion, draftEntry.contentVersion)
      };
    }
    return merged;
  }

  function mergePendingDraft(cloudLearning, draftLearning, cloudPresent) {
    if (!draftLearning) return cloudLearning;
    const progress = mergeProgress(cloudLearning.progress, draftLearning.progress);
    const cloudUpdated = Date.parse(cloudLearning.updatedAt || "") || 0;
    const draftUpdated = Date.parse(draftLearning.updatedAt || "") || 0;
    const draftHasNewerSettings = !cloudPresent || draftUpdated > cloudUpdated;
    const completedLessonIds = [...new Set([
      ...cloudLearning.completedLessonIds,
      ...draftLearning.completedLessonIds,
      ...Object.entries(progress).filter(([, entry]) => entry.completed).map(([id]) => id)
    ])].slice(0, MAX_COMPLETED);
    return normalizeLearning({
      version: 1,
      stageId: draftHasNewerSettings ? draftLearning.stageId : cloudLearning.stageId,
      assignedLessonId: cloudPresent ? cloudLearning.assignedLessonId : draftLearning.assignedLessonId,
      completedLessonIds,
      progress,
      updatedAt: latestIsoDate(cloudLearning.updatedAt, draftLearning.updatedAt)
    }, cloudLearning.stageId);
  }

  function draftProfileKey() {
    if (!childId) return "";
    if (window.KiddoHubGate?.demoActive?.()) return `demo:${childId}`;
    const ownerId = String(family?.parentAuthUserId || "").trim().toLowerCase();
    return OWNER_ID_PATTERN.test(ownerId) ? `${ownerId}:${childId}` : "";
  }

  function readDraft() {
    try {
      const profileKey = draftProfileKey();
      if (!profileKey) return null;
      const root = readObject(window.sessionStorage, DRAFT_KEY);
      const entry = root?.profiles?.[profileKey];
      if (!isPlainObject(entry) || entry.pending !== true) return null;
      return normalizeLearning(entry.learning, defaultStageFor(child));
    } catch (error) {
      return null;
    }
  }

  function writeDraft(payload) {
    try {
      const profileKey = draftProfileKey();
      if (!profileKey) return false;
      const existing = readObject(window.sessionStorage, DRAFT_KEY);
      const profiles = isPlainObject(existing?.profiles) ? existing.profiles : {};
      const boundedProfiles = Object.fromEntries(Object.entries(profiles).slice(-7));
      boundedProfiles[profileKey] = { pending: true, learning: payload };
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, profiles: boundedProfiles }));
      return true;
    } catch (error) {
      return false;
    }
  }

  function clearDraft() {
    try {
      const profileKey = draftProfileKey();
      if (!profileKey) return;
      const existing = readObject(window.sessionStorage, DRAFT_KEY);
      if (!isPlainObject(existing?.profiles) || !Object.prototype.hasOwnProperty.call(existing.profiles, profileKey)) return;
      const profiles = { ...existing.profiles };
      delete profiles[profileKey];
      if (Object.keys(profiles).length) {
        window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, profiles }));
      } else {
        window.sessionStorage.removeItem(DRAFT_KEY);
      }
    } catch (error) {
      // A successful family-state write is still valid when tab storage is unavailable.
    }
  }

  function storedLearning() {
    const progress = {};
    Object.entries(learning.progress).slice(0, MAX_PROGRESS).forEach(([id, entry]) => {
      progress[id] = {
        attempts: boundedInteger(entry.attempts, 0, 0, MAX_ATTEMPTS),
        completed: entry.completed === true,
        bestCorrect: boundedInteger(entry.bestCorrect, 0, 0, 100),
        total: boundedInteger(entry.total, 0, 0, 100),
        lastCompletedAt: safeIsoDate(entry.lastCompletedAt),
        contentVersion: curriculum.version
      };
    });
    return {
      version: 1,
      stageId: learning.stageId,
      assignedLessonId: learning.assignedLessonId,
      completedLessonIds: learning.completedLessonIds.filter((id) => lessonById.has(id)).slice(0, MAX_COMPLETED),
      progress,
      updatedAt: new Date().toISOString()
    };
  }

  function saveLearning(message) {
    const payload = storedLearning();
    learning.updatedAt = payload.updatedAt;
    const revision = ++saveRevision;
    const draftSaved = writeDraft(payload);
    page?.setAttribute("aria-busy", "true");
    setStatus("Saving your progress…");

    saveQueue = saveQueue.catch(() => false).then(async () => {
      const latestFamily = window.KiddoHubGate?.readState?.();
      const context = activeChildContext(latestFamily);
      if (!context || context.id !== childId) throw new Error("The active child changed.");
      context.child.learning = payload;
      const saved = await Promise.resolve(window.KiddoHubGate.writeState(latestFamily));
      if (saved !== true) throw new Error("Learning progress could not be saved.");
      family = window.KiddoHubGate.readState() || latestFamily;
      child = activeChildContext(family)?.child || child;
      if (revision === saveRevision) {
        clearDraft();
        setStatus(
          window.KiddoHubGate.demoActive?.()
            ? `${message} Saved only in this practice demo tab.`
            : `${message} Progress saved for this child.`,
          "success"
        );
      }
      return true;
    }).catch(() => {
      if (revision === saveRevision) {
        setStatus(
          draftSaved
            ? `${message} A draft is safe in this tab, but it has not synced yet.`
            : `${message} Progress could not be saved. Keep this page open and ask an adult for help.`,
          "error"
        );
      }
      return false;
    }).finally(() => {
      if (revision === saveRevision) page?.removeAttribute("aria-busy");
    });

    return saveQueue;
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function subjectIcon(subjectId, className = "learning-icon") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", className);
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", `#icon-${subjectId}`);
    svg.appendChild(use);
    return svg;
  }

  function subjectPill(lesson) {
    return createElement("span", `subject-pill subject-${lesson.subjectId}`, lesson.subjectName);
  }

  function isCompleted(lessonId) {
    return learning.completedLessonIds.includes(lessonId) || learning.progress[lessonId]?.completed === true;
  }

  function stageLessons(stageId = learning.stageId) {
    return lessons.filter((lesson) => lesson.stage === stageId);
  }

  function activityTotal(lesson) {
    return lesson.activity.type === "match" && Array.isArray(lesson.activity.pairs)
      ? lesson.activity.pairs.length
      : 1;
  }

  function progressFor(lessonId) {
    if (!learning.progress[lessonId]) {
      learning.progress[lessonId] = normalizeProgressEntry({}, isCompleted(lessonId));
    }
    return learning.progress[lessonId];
  }

  function renderStages() {
    stageOptions.replaceChildren();
    stages.forEach((stage) => {
      const button = createElement("button", "stage-option");
      button.type = "button";
      button.dataset.stageId = stage.id;
      button.setAttribute("aria-pressed", String(stage.id === learning.stageId));
      const name = createElement("strong", "", `${stage.name} · ages ${stage.ages}`);
      const blurb = createElement("span", "", stage.blurb);
      button.append(name, blurb);
      button.addEventListener("click", () => selectStage(stage.id));
      stageOptions.appendChild(button);
    });
  }

  function selectStage(stageId) {
    if (!stageById.has(stageId) || learning.stageId === stageId) return;
    learning.stageId = stageId;
    renderStages();
    renderAllViews();
    const stage = stageById.get(stageId);
    saveLearning(`${stage.name} is now the selected learning stage.`);
  }

  function openLessonButton(lesson, label) {
    const button = createElement("button", "start-button", label || (isCompleted(lesson.id) ? "Practise again" : "Start lesson"));
    button.type = "button";
    button.addEventListener("click", () => openLesson(lesson.id));
    return button;
  }

  function lessonState(lessonId) {
    return createElement("span", `lesson-state${isCompleted(lessonId) ? " is-complete" : ""}`, isCompleted(lessonId) ? "Completed" : "Ready");
  }

  function renderToday() {
    const focusHost = document.getElementById("today-focus");
    const lessonGrid = document.getElementById("today-lessons");
    const summary = document.getElementById("today-summary");
    const currentStageLessons = stageLessons();
    const completedCount = currentStageLessons.filter((lesson) => isCompleted(lesson.id)).length;
    const assigned = lessonById.get(learning.assignedLessonId);
    const focusLesson = assigned || currentStageLessons.find((lesson) => !isCompleted(lesson.id)) || currentStageLessons[0];

    summary.textContent = `${completedCount} of ${currentStageLessons.length} starter lessons completed in ${stageById.get(learning.stageId)?.name || "this stage"}.`;
    focusHost.replaceChildren();
    lessonGrid.replaceChildren();

    if (!focusLesson) {
      focusHost.appendChild(createElement("p", "empty-card", "No lesson is available for this stage yet."));
      return;
    }

    const focusCard = createElement("article", "today-focus-card");
    const iconWrap = createElement("div", "focus-icon");
    iconWrap.appendChild(subjectIcon(focusLesson.subjectId));
    const copy = createElement("div", "focus-copy");
    const meta = createElement("div", "lesson-meta");
    meta.appendChild(subjectPill(focusLesson));
    if (assigned?.id === focusLesson.id) meta.appendChild(createElement("span", "assignment-pill", "Parent pick"));
    meta.appendChild(lessonState(focusLesson.id));
    const heading = createElement("h3", "", focusLesson.title);
    const objective = createElement("p", "", focusLesson.objective);
    const detail = createElement("div", "lesson-meta");
    detail.append(
      createElement("span", "", `${focusLesson.minutes} minutes`),
      createElement("span", "", focusLesson.unitTitle)
    );
    copy.append(meta, heading, objective, detail);
    focusCard.append(iconWrap, copy, openLessonButton(focusLesson));
    focusHost.appendChild(focusCard);

    const suggestions = [];
    for (const subject of subjects) {
      const suggestion = currentStageLessons.find((lesson) => (
        lesson.subjectId === subject.id && lesson.id !== focusLesson.id && !isCompleted(lesson.id)
      )) || currentStageLessons.find((lesson) => lesson.subjectId === subject.id && lesson.id !== focusLesson.id);
      if (suggestion && !suggestions.some((lesson) => lesson.id === suggestion.id)) suggestions.push(suggestion);
    }
    currentStageLessons.forEach((lesson) => {
      if (suggestions.length < 3 && lesson.id !== focusLesson.id && !suggestions.some((item) => item.id === lesson.id)) suggestions.push(lesson);
    });

    suggestions.slice(0, 3).forEach((lesson) => lessonGrid.appendChild(renderLessonCard(lesson)));
  }

  function renderLessonCard(lesson) {
    const card = createElement("article", "lesson-card");
    const top = createElement("div", "lesson-card-top");
    top.append(subjectPill(lesson), lessonState(lesson.id));
    const heading = createElement("h3", "", lesson.title);
    const objective = createElement("p", "", lesson.objective);
    card.append(top, heading, objective, openLessonButton(lesson));
    return card;
  }

  function renderSubjects() {
    const subjectList = document.getElementById("subject-list");
    subjectList.replaceChildren();
    subjects.forEach((subject) => {
      const available = stageLessons().filter((lesson) => lesson.subjectId === subject.id);
      const completed = available.filter((lesson) => isCompleted(lesson.id)).length;
      const block = createElement("section", `subject-block subject-${subject.id}`);
      const header = createElement("div", "subject-block-head");
      const iconWrap = createElement("div", "subject-icon-wrap");
      iconWrap.appendChild(subjectIcon(subject.id, "subject-icon"));
      const copy = createElement("div");
      const heading = createElement("h3", "", subject.name);
      const unit = subject.units.find((item) => item.stage === learning.stageId);
      const summary = createElement("p", "", unit?.summary || subject.blurb);
      copy.append(heading, summary);
      const count = createElement("span", "subject-count", `${completed} of ${available.length} completed`);
      header.append(iconWrap, copy, count);
      const lessonList = createElement("div", "subject-lessons");
      available.forEach((lesson) => {
        const button = createElement("button", "subject-lesson-button");
        button.type = "button";
        const title = createElement("strong", "", lesson.title);
        const state = lessonState(lesson.id);
        const objective = createElement("span", "", lesson.objective);
        button.append(title, state, objective);
        button.addEventListener("click", () => openLesson(lesson.id));
        lessonList.appendChild(button);
      });
      block.append(header, lessonList);
      subjectList.appendChild(block);
    });
  }

  function formatCompletionDate(value) {
    const time = Date.parse(value || "");
    if (!Number.isFinite(time)) return "Completed";
    try {
      return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(time));
    } catch (error) {
      return "Completed";
    }
  }

  function setProgressStyle(element, percentage) {
    element.style.setProperty("--progress", `${Math.max(0, Math.min(100, percentage))}%`);
  }

  function renderProgress() {
    const overview = document.getElementById("progress-overview");
    const subjectHost = document.getElementById("progress-subjects");
    const recentHost = document.getElementById("recent-lessons");
    const currentStageLessons = stageLessons();
    const completed = currentStageLessons.filter((lesson) => isCompleted(lesson.id));
    const percentage = currentStageLessons.length ? Math.round((completed.length / currentStageLessons.length) * 100) : 0;
    const attempts = currentStageLessons.reduce((sum, lesson) => sum + (learning.progress[lesson.id]?.attempts || 0), 0);

    overview.replaceChildren();
    const hero = createElement("section", "progress-hero");
    const ring = createElement("div", "progress-ring");
    ring.setAttribute("role", "img");
    ring.setAttribute("aria-label", `${percentage}% of this starter stage completed`);
    setProgressStyle(ring, percentage);
    ring.appendChild(createElement("strong", "", `${percentage}%`));
    const copy = createElement("div", "progress-copy");
    copy.append(
      createElement("h3", "", `${completed.length} of ${currentStageLessons.length} lessons completed`),
      createElement("p", "", `${attempts} practice ${attempts === 1 ? "check" : "checks"} recorded. Progress shows participation and practice, not a grade or qualification.`)
    );
    hero.append(ring, copy);
    overview.appendChild(hero);

    subjectHost.replaceChildren();
    subjects.forEach((subject) => {
      const subjectLessons = currentStageLessons.filter((lesson) => lesson.subjectId === subject.id);
      const subjectCompleted = subjectLessons.filter((lesson) => isCompleted(lesson.id)).length;
      const subjectPercentage = subjectLessons.length ? Math.round((subjectCompleted / subjectLessons.length) * 100) : 0;
      const card = createElement("article", "progress-subject-card");
      card.append(
        createElement("h3", "", subject.name),
        createElement("p", "", `${subjectCompleted} of ${subjectLessons.length} starter ${subjectLessons.length === 1 ? "lesson" : "lessons"}`)
      );
      const track = createElement("div", "progress-track");
      track.setAttribute("role", "progressbar");
      track.setAttribute("aria-label", `${subject.name} progress`);
      track.setAttribute("aria-valuemin", "0");
      track.setAttribute("aria-valuemax", String(subjectLessons.length));
      track.setAttribute("aria-valuenow", String(subjectCompleted));
      const fill = createElement("span");
      setProgressStyle(fill, subjectPercentage);
      track.appendChild(fill);
      card.appendChild(track);
      subjectHost.appendChild(card);
    });

    recentHost.replaceChildren();
    const recent = lessons
      .filter((lesson) => isCompleted(lesson.id))
      .sort((first, second) => (
        (Date.parse(learning.progress[second.id]?.lastCompletedAt || "") || 0)
        - (Date.parse(learning.progress[first.id]?.lastCompletedAt || "") || 0)
      ))
      .slice(0, 5);
    if (!recent.length) {
      recentHost.appendChild(createElement("p", "empty-card", "Completed lessons will appear here. Start with one useful step when you are ready."));
      return;
    }
    const list = createElement("ul", "recent-list");
    recent.forEach((lesson) => {
      const item = createElement("li");
      const title = createElement("span", "", `${lesson.subjectName}: ${lesson.title}`);
      const date = createElement("time", "", formatCompletionDate(learning.progress[lesson.id]?.lastCompletedAt));
      const iso = safeIsoDate(learning.progress[lesson.id]?.lastCompletedAt);
      if (iso) date.dateTime = iso;
      item.append(title, date);
      list.appendChild(item);
    });
    recentHost.appendChild(list);
  }

  function renderAllViews() {
    renderToday();
    renderSubjects();
    renderProgress();
  }

  function setView(view, focusTab = false) {
    if (!VALID_VIEWS.has(view)) return;
    activeView = view;
    document.querySelectorAll("[data-view-tab]").forEach((tab) => {
      const selected = tab.dataset.viewTab === view;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focusTab) tab.focus();
    });
    document.querySelectorAll("[data-view]").forEach((panel) => {
      panel.hidden = panel.dataset.view !== view;
    });
  }

  function showPathChrome(show) {
    hero.hidden = !show;
    stageCard.hidden = !show;
    tabs.hidden = !show;
    views.hidden = !show;
    practiceLibrary.hidden = !show;
  }

  function openLesson(lessonId) {
    const lesson = lessonById.get(lessonId);
    if (!lesson) return;
    previousView = activeView;
    activeLessonId = lessonId;
    showPathChrome(false);
    workspace.hidden = false;
    renderLesson(lesson);
    document.title = `${lesson.title} | Homeschool Hub`;
    workspace.scrollIntoView?.({ behavior: "smooth", block: "start" });
    window.setTimeout(() => document.getElementById("lesson-title")?.focus(), 0);
  }

  function closeLesson() {
    activeLessonId = "";
    workspace.hidden = true;
    lessonContent.replaceChildren();
    showPathChrome(true);
    renderAllViews();
    setView(previousView);
    document.title = "Homeschool Hub | KiddoSprout";
    document.querySelector(`[data-view-tab="${previousView}"]`)?.focus();
  }

  function renderLesson(lesson) {
    lessonContent.replaceChildren();
    const banner = createElement("header", `lesson-banner subject-${lesson.subjectId}`);
    const meta = createElement("div", "lesson-meta-row");
    meta.append(
      subjectPill(lesson),
      createElement("span", "", lesson.unitTitle),
      createElement("span", "", `${lesson.minutes} minutes`),
      lessonState(lesson.id)
    );
    const heading = createElement("h2", "", lesson.title);
    heading.id = "lesson-title";
    heading.tabIndex = -1;
    const objective = createElement("p", "lesson-objective", `Learning goal: ${lesson.objective}`);
    banner.append(meta, heading, objective);

    const bodyGrid = createElement("div", "lesson-body-grid");
    const teaching = createElement("section", "teach-card");
    teaching.appendChild(createElement("h3", "", "Learn together"));
    const teachList = createElement("ol", "teach-list");
    lesson.teach.forEach((item) => teachList.appendChild(createElement("li", "", item)));
    teaching.appendChild(teachList);
    const vocabulary = createElement("aside", "vocab-card");
    vocabulary.appendChild(createElement("h3", "", "Useful words"));
    const vocabList = createElement("dl", "vocab-list");
    lesson.vocab.forEach(([term, meaning]) => {
      const group = createElement("div");
      group.append(createElement("dt", "", term), createElement("dd", "", meaning));
      vocabList.appendChild(group);
    });
    vocabulary.appendChild(vocabList);
    bodyGrid.append(teaching, vocabulary);

    const activity = createElement("section", "activity-card");
    const activityHeading = createElement("h3", "", "Try it");
    activityHeading.id = "activity-heading";
    activity.append(activityHeading, createElement("p", "activity-intro", lesson.activity.prompt));
    const finishControls = {};
    activity.appendChild(renderActivity(lesson, finishControls));

    const offline = createElement("section", "offline-card");
    const offlineCopy = createElement("div");
    offlineCopy.append(createElement("h3", "", "Away from the screen"), createElement("p", "", lesson.task));
    offline.append(offlineCopy, createElement("span", "offline-label", "No upload needed"));

    const actions = createElement("div", "lesson-actions");
    const helper = createElement("p", "", "Completing a lesson means you finished the practice. It is not a grade or a claim of mastery.");
    const finish = createElement("button", `finish-button${isCompleted(lesson.id) ? " is-complete" : ""}`, isCompleted(lesson.id) ? "Lesson completed" : "Finish lesson");
    finish.type = "button";
    finish.disabled = !isCompleted(lesson.id) && (learning.progress[lesson.id]?.attempts || 0) < 1;
    finish.addEventListener("click", () => completeLesson(lesson, finish));
    finishControls.enableFinish = () => { finish.disabled = false; };
    actions.append(helper, finish);

    lessonContent.append(banner, bodyGrid, activity, offline, actions);
  }

  function renderActivity(lesson, finishControls) {
    const form = createElement("form", "activity-form");
    form.noValidate = true;
    const activity = lesson.activity;
    const feedback = createElement("p", "activity-feedback");
    feedback.id = `feedback-${activity.id}`;
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");
    feedback.setAttribute("aria-atomic", "true");
    const previous = learning.progress[lesson.id];
    feedback.textContent = previous?.attempts
      ? `You have tried this ${previous.attempts} ${previous.attempts === 1 ? "time" : "times"}. Your best practice result is ${previous.bestCorrect} of ${previous.total || activityTotal(lesson)}.`
      : "Have a go. You can try again if you need to.";

    let readAnswer;
    if (activity.type === "quiz") readAnswer = renderQuizActivity(form, lesson);
    if (activity.type === "fill") readAnswer = renderFillActivity(form, lesson);
    if (activity.type === "order") readAnswer = renderOrderActivity(form, lesson);
    if (activity.type === "match") readAnswer = renderMatchActivity(form, lesson);

    const actions = createElement("div", "activity-actions");
    const check = createElement("button", "check-button", "Check my answer");
    check.type = "submit";
    actions.appendChild(check);
    form.append(actions, feedback);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const result = readAnswer?.();
      if (!result?.ready) {
        feedback.textContent = result?.message || "Finish the activity before checking.";
        feedback.dataset.state = "try";
        result?.focus?.();
        return;
      }
      recordAttempt(lesson, result.correct, result.total);
      finishControls.enableFinish?.();
      if (result.correct === result.total) {
        feedback.textContent = `That works. ${activity.explain || "Well done for checking your thinking."}`;
        feedback.dataset.state = "success";
      } else {
        feedback.textContent = `${result.correct} of ${result.total} correct so far. Review the lesson, adjust your answer, and try again.`;
        feedback.dataset.state = "try";
      }
    });
    return form;
  }

  function renderQuizActivity(form, lesson) {
    const fieldset = createElement("fieldset", "quiz-options");
    fieldset.appendChild(createElement("legend", "", lesson.activity.prompt));
    lesson.activity.options.forEach((option, index) => {
      const label = createElement("label", "quiz-option");
      const input = createElement("input");
      input.type = "radio";
      input.name = `answer-${lesson.activity.id}`;
      input.value = String(index);
      const text = createElement("span", "", option);
      label.append(input, text);
      fieldset.appendChild(label);
    });
    form.appendChild(fieldset);
    return () => {
      const selected = fieldset.querySelector("input:checked");
      return selected
        ? { ready: true, correct: Number(selected.value) === lesson.activity.answer ? 1 : 0, total: 1 }
        : { ready: false, message: "Choose one answer before checking.", focus: () => fieldset.querySelector("input")?.focus() };
    };
  }

  function normalizeAnswer(value) {
    return String(value || "").trim().toLocaleLowerCase("en-GB").replace(/\s+/g, " ");
  }

  function renderFillActivity(form, lesson) {
    const label = createElement("label", "fill-label");
    const labelText = createElement("span", "", "Your answer");
    const input = createElement("input");
    input.type = "text";
    input.maxLength = 80;
    input.autocomplete = "off";
    input.spellcheck = false;
    input.setAttribute("aria-describedby", `feedback-${lesson.activity.id}`);
    label.append(labelText, input);
    form.appendChild(label);
    if (lesson.activity.hint) {
      const hint = createElement("details", "hint-box");
      hint.append(createElement("summary", "", "Show a hint"), createElement("p", "", lesson.activity.hint));
      form.appendChild(hint);
    }
    return () => {
      const answer = normalizeAnswer(input.value);
      const accepted = lesson.activity.accept.map(normalizeAnswer);
      return answer
        ? { ready: true, correct: accepted.includes(answer) ? 1 : 0, total: 1 }
        : { ready: false, message: "Write an answer before checking.", focus: () => input.focus() };
    };
  }

  function renderOrderActivity(form, lesson) {
    const list = createElement("div", "order-list");
    const initialItems = [...lesson.activity.items].reverse();
    initialItems.forEach((item) => {
      const row = createElement("div", "order-row");
      row.dataset.orderValue = item;
      const number = createElement("span", "order-number");
      const value = createElement("span", "order-value", item);
      const controls = createElement("div", "order-controls");
      const up = createElement("button", "order-button", "↑");
      up.type = "button";
      const down = createElement("button", "order-button", "↓");
      down.type = "button";
      up.addEventListener("click", () => moveOrderRow(row, -1));
      down.addEventListener("click", () => moveOrderRow(row, 1));
      controls.append(up, down);
      row.append(number, value, controls);
      list.appendChild(row);
    });
    form.appendChild(list);
    refreshOrderRows(list);
    return () => {
      const current = [...list.querySelectorAll(".order-row")].map((row) => row.dataset.orderValue);
      const correct = current.filter((item, index) => item === lesson.activity.items[index]).length;
      return { ready: true, correct: correct === current.length ? 1 : 0, total: 1 };
    };
  }

  function moveOrderRow(row, direction) {
    const list = row.parentElement;
    const sibling = direction < 0 ? row.previousElementSibling : row.nextElementSibling;
    if (!list || !sibling) return;
    if (direction < 0) list.insertBefore(row, sibling);
    else list.insertBefore(sibling, row);
    refreshOrderRows(list);
    row.querySelector(".order-button")?.focus();
  }

  function refreshOrderRows(list) {
    const rows = [...list.querySelectorAll(".order-row")];
    rows.forEach((row, index) => {
      row.querySelector(".order-number").textContent = String(index + 1);
      const buttons = row.querySelectorAll(".order-button");
      buttons[0].disabled = index === 0;
      buttons[1].disabled = index === rows.length - 1;
      buttons[0].setAttribute("aria-label", `Move ${row.dataset.orderValue} up`);
      buttons[1].setAttribute("aria-label", `Move ${row.dataset.orderValue} down`);
    });
  }

  function renderMatchActivity(form, lesson) {
    const list = createElement("div", "match-list");
    const answers = lesson.activity.pairs.map((pair) => pair[1]);
    const options = answers.length > 1 ? [...answers.slice(1), answers[0]] : answers;
    lesson.activity.pairs.forEach(([term], index) => {
      const row = createElement("div", "match-row");
      row.appendChild(createElement("span", "match-term", term));
      const label = createElement("label");
      const labelText = createElement("span", "", `Match for ${term}`);
      const select = createElement("select");
      select.dataset.matchIndex = String(index);
      const placeholder = createElement("option", "", "Choose a match");
      placeholder.value = "";
      select.appendChild(placeholder);
      options.forEach((answer) => {
        const option = createElement("option", "", answer);
        option.value = answer;
        select.appendChild(option);
      });
      label.append(labelText, select);
      row.appendChild(label);
      list.appendChild(row);
    });
    form.appendChild(list);
    return () => {
      const selects = [...list.querySelectorAll("select")];
      const missing = selects.find((select) => !select.value);
      if (missing) return { ready: false, message: "Choose a match on every row before checking.", focus: () => missing.focus() };
      const correct = selects.filter((select, index) => select.value === lesson.activity.pairs[index][1]).length;
      return { ready: true, correct, total: selects.length };
    };
  }

  function recordAttempt(lesson, correct, total) {
    const progress = progressFor(lesson.id);
    progress.attempts = Math.min(MAX_ATTEMPTS, progress.attempts + 1);
    progress.total = total;
    progress.bestCorrect = Math.max(progress.bestCorrect, correct);
    progress.contentVersion = curriculum.version;
    saveLearning("Practice checked.");
  }

  function completeLesson(lesson, button) {
    const progress = progressFor(lesson.id);
    if (progress.attempts < 1 && !progress.completed) {
      setStatus("Try the practice activity before finishing this lesson.", "error");
      return;
    }
    if (!progress.completed) {
      progress.completed = true;
      progress.lastCompletedAt = new Date().toISOString();
      progress.contentVersion = curriculum.version;
      if (!learning.completedLessonIds.includes(lesson.id)) learning.completedLessonIds.push(lesson.id);
      learning.completedLessonIds = learning.completedLessonIds.slice(0, MAX_COMPLETED);
      button.textContent = "Lesson completed";
      button.classList.add("is-complete");
      button.disabled = false;
      const state = lessonContent.querySelector(".lesson-banner .lesson-state");
      if (state) {
        state.textContent = "Completed";
        state.classList.add("is-complete");
      }
      saveLearning("Lesson completed.");
    } else {
      setStatus("This lesson is already marked completed. You can keep practising whenever you like.", "success");
    }
  }

  function bindStaticEvents() {
    document.querySelectorAll("[data-view-tab]").forEach((tab) => {
      tab.addEventListener("click", () => setView(tab.dataset.viewTab));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        const tabList = [...document.querySelectorAll("[data-view-tab]")];
        const index = tabList.indexOf(tab);
        let nextIndex = index;
        if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabList.length) % tabList.length;
        if (event.key === "ArrowRight") nextIndex = (index + 1) % tabList.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = tabList.length - 1;
        event.preventDefault();
        setView(tabList[nextIndex].dataset.viewTab, true);
      });
    });
    lessonClose.addEventListener("click", closeLesson);
    document.getElementById("print-progress").addEventListener("click", () => window.print());
    window.addEventListener("pageshow", applyTheme);
    window.addEventListener("storage", (event) => {
      if (event.key === "kiddosproutPreferences") applyTheme();
    });
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    if (!curriculumIsValid()) {
      showUnavailable("Learning path unavailable", "The starter lessons could not be loaded safely. Return to the Child Site and try again.");
      return;
    }

    family = window.KiddoHubGate.readState();
    const context = activeChildContext(family);
    if (!context) {
      showUnavailable(
        "Child profile needed",
        window.KiddoHubGate.demoActive?.()
          ? "Open the KiddoSprout demo and choose its fictional child profile first."
          : "Ask a parent to open KiddoSprout and choose a child profile first."
      );
      return;
    }

    childId = context.id;
    child = context.child;
    const fallbackStage = defaultStageFor(child);
    const cloudPresent = isPlainObject(child.learning);
    const cloudLearning = normalizeLearning(child.learning, fallbackStage);
    const pendingDraft = readDraft();
    learning = mergePendingDraft(cloudLearning, pendingDraft, cloudPresent);
    const displayName = String(child.name || "Learner").trim().slice(0, 80) || "Learner";
    learnerChip.textContent = `Path for ${displayName}`;
    learnerChip.hidden = false;

    bindStaticEvents();
    renderStages();
    renderAllViews();
    setView("today");
    setStatus(
      pendingDraft
        ? "A draft from this tab is ready. Your next change will try to sync it."
        : window.KiddoHubGate.demoActive?.()
          ? "Practice demo: progress stays only in this tab."
          : "Your learning path is ready.",
      pendingDraft ? "notice" : "success"
    );
  }

  applyTheme();

  if (!window.KiddoHubGate || typeof window.KiddoHubGate.protect !== "function") {
    showUnavailable("Family access unavailable", "KiddoSprout cannot safely check parent settings on this page. Return to the Child Site and try again.");
    return;
  }

  Promise.resolve(window.KiddoHubGate.protect(APP_ID, APP_TITLE))
    .then((allowed) => {
      if (allowed === true) initialize();
    })
    .catch(() => {
      showUnavailable("Family access unavailable", "KiddoSprout could not securely check this learning path. Return to the Child Site and try again.");
    });
}());
