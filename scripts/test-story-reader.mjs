import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import {
  buildVoiceStoryCatalog,
  cleanStoryDraftNotes,
  loadStoryBooks,
  normalizedStoryHeading
} from "./build-voice-story-catalog.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const [theaterSource, hubStyles, storyStorageSource] = await Promise.all([
  readFile(resolve(projectRoot, "story-theater.html"), "utf8"),
  readFile(resolve(projectRoot, "kid-hubs.css"), "utf8"),
  readFile(resolve(projectRoot, "story-storage.js"), "utf8")
]);
for (const [index, match] of [...theaterSource.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].entries()) {
  if (/\bsrc\s*=/.test(match[1])) continue;
  assert.doesNotThrow(() => new Function(match[2]), `Inline Story Theater script ${index + 1} must compile.`);
}
const books = await loadStoryBooks(projectRoot);
const catalog = await buildVoiceStoryCatalog(projectRoot);

assert.equal(books.length, 5, "The Story Theater should expose every current book.");
assert.deepEqual(
  [...new Set(books.map((book) => book.series))].sort(),
  ["Adventures of Ethan and Leo", "Rainbow Shoes", "The Living Ink"],
  "The series shelf should expose every current series."
);

const linkedBookIds = [...theaterSource.matchAll(/data-open-story="([a-z0-9-]+)"/g)].map((match) => match[1]);
assert.deepEqual(
  [...linkedBookIds].sort(),
  books.map((book) => book.id).sort(),
  "Each story book needs exactly one working shelf link."
);
assert.equal(new Set(linkedBookIds).size, linkedBookIds.length, "Story shelf links must not be duplicated.");
assert.equal(new Set(books.map((book) => book.id)).size, books.length, "Story IDs must be unique.");
assert.match(theaterSource, /data-choose-series[^>]+aria-expanded="false"[^>]+aria-controls="[^"]+"/);
assert.equal((theaterSource.match(/id="book-title"/g) || []).length, 1, "The reader must render the scene title in one place only.");
assert.match(theaterSource, /<nav class="chapter-list" id="chapter-list" aria-label="Story pages"><\/nav>/,
  "The story page chooser should be exposed as named navigation.");
assert.match(theaterSource, /<figure class="story-scene" id="story-scene" tabindex="-1" role="group" aria-labelledby="book-title" aria-describedby="story-scene-caption">/,
  "Page navigation should move accessible focus to the illustration it reveals.");
assert.match(theaterSource, /id="story-scene-fallback" role="status" hidden/,
  "A missing scene illustration should have a visible, announced reader fallback.");
assert.equal(
  [...theaterSource.matchAll(/<img class="series-book-thumbnail"[^>]+alt="([^"]*)"/g)].every((match) => match[1] === ""),
  true,
  "Book-cover thumbnails beside the same visible title must not repeat that title to screen readers."
);
const seriesShelfSource = theaterSource.slice(
  theaterSource.indexOf('<section class="series-library"'),
  theaterSource.indexOf('<section class="book-layout"')
);
const seriesArtwork = [...seriesShelfSource.matchAll(/<img\b[^>]*>/g)]
  .map((match) => match[0]);
assert.equal(seriesArtwork.length, 6, "The series shelf should keep its six expected cover images.");
assert.equal(
  seriesArtwork.every((image) => /\bloading="lazy"/.test(image) && /\bdecoding="async"/.test(image)),
  true,
  "Series artwork, including covers hidden inside closed book lists, should not block the first Story Theater render."
);
assert.match(theaterSource, /chapter-list"\)\.setAttribute\("aria-label", `\$\{activeBook\.title\}/,
  "The story page navigation label should name the active book.");
assert.match(theaterSource, /id="choose-story-sound" href="story-voices\.html"/,
  "The Sound Studio link should have a safe direct-navigation fallback.");
assert.match(theaterSource, /storyStorage\.readerHash\(activeBookId, currentPage, currentChapterPage\)/,
  "The Sound Studio return target must include the exact live reader location.");
assert.match(theaterSource, /choose-story-sound"\)\.href = `story-voices\.html\?return=\$\{encodeURIComponent\(readerHash\)\}`/,
  "Opening Sound Studio should carry the validated exact reader hash.");
assert.match(theaterSource, /requestedLocation\?\.exact[\s\S]*?currentPage = clampedReaderIndex\(requestedLocation\.chapterIndex, storyPages\.length\)[\s\S]*?currentChapterPage = clampedReaderIndex\(requestedLocation\.pageIndex, requestedReadingPages\.length\)/,
  "A returned reader location should override the bookmark and clamp safely to the current book.");
assert.match(theaterSource, /const storyAdditions = Array\.isArray\(window\.KiddoSproutStoryAdditions\)[\s\S]*?\.filter\(isSafeStoryBook\)/,
  "A stale or malformed optional story-data script must not crash the whole reader.");
assert.match(theaterSource, /if \(!storyBooks\.has\(book\.id\)\) storyBooks\.set\(book\.id, book\)/,
  "Optional story data must not replace an existing trusted book ID.");
assert.match(theaterSource, /const location = storyStorage\.parseReaderHash\(hash\);[\s\S]*?storyBooks\.has\(location\.bookId\)/,
  "Unknown books must not be accepted as reader return routes.");
assert.match(theaterSource, /const readerWasVisible = !storyReader\.hidden;[\s\S]*?window\.history\[readerWasVisible \? "pushState" : "replaceState"\]/,
  "The series chooser should add history only when it replaces a visible reader.");
assert.match(theaterSource, /if \(window\.location\.hash === readerHash\) return;[\s\S]*?window\.history\[push \? "pushState" : "replaceState"\]/,
  "Opening the same exact reader location twice must not create duplicate browser-history entries.");
assert.match(theaterSource, /window\.matchMedia\?\.\("\(prefers-reduced-motion: reduce\)"\)\?\.matches === true/,
  "Reader navigation must still work in browsers that do not expose matchMedia.");
const focusReadingPageSource = theaterSource.slice(
  theaterSource.indexOf("function focusReadingPage"),
  theaterSource.indexOf("function markChapterRead")
);
let readerFocuses = 0;
let readerScrollBehavior = "";
const readerTarget = {
  focus: () => { readerFocuses += 1; },
  scrollIntoView: ({ behavior }) => { readerScrollBehavior = behavior; }
};
const focusReadingPageWithoutMatchMedia = new Function("document", "window", `
  ${focusReadingPageSource}
  return focusReadingPage;
`)(
  { getElementById: () => readerTarget },
  { requestAnimationFrame: (callback) => callback() }
);
assert.doesNotThrow(() => focusReadingPageWithoutMatchMedia(),
  "Reader navigation should not crash when matchMedia is unavailable.");
assert.equal(readerFocuses, 1);
assert.equal(readerScrollBehavior, "smooth");
assert.ok((theaterSource.match(/window\.history\.replaceState\(null, "", "#series-library"\)/g) || []).length >= 2,
  "Unknown initial and changed Story Theater routes must recover to the series shelf.");

const routeWindow = {};
vm.runInNewContext(storyStorageSource, { window: routeWindow, Object, String, Number }, {
  filename: "story-storage-reader-route.js"
});
const readerRoutes = routeWindow.KiddoSproutStoryStorage;
const exactReaderHash = readerRoutes.readerHash("living-ink-1", 2, 4);
assert.equal(exactReaderHash, "#story-living-ink-1?chapter=3&page=5");
const exactReaderLocation = readerRoutes.parseReaderHash(exactReaderHash);
assert.equal(exactReaderLocation.bookId, "living-ink-1");
assert.equal(exactReaderLocation.chapterIndex, 2);
assert.equal(exactReaderLocation.pageIndex, 4);
assert.equal(exactReaderLocation.exact, true);
const legacyReaderLocation = readerRoutes.parseReaderHash("#story-rainbow-shoes");
assert.equal(legacyReaderLocation.bookId, "rainbow-shoes", "Safe legacy book links should remain usable.");
assert.equal(legacyReaderLocation.exact, false);

class StoryStorageMock {
  constructor(values = {}) {
    this.values = new Map(Object.entries(values));
  }

  getItem(key) {
    return this.values.has(String(key)) ? this.values.get(String(key)) : null;
  }

  setItem(key, value) {
    this.values.set(String(key), String(value));
  }

  removeItem(key) {
    this.values.delete(String(key));
  }
}

const sharedStoryStorage = new StoryStorageMock({ legacyProgress: "somebody-else" });
function scopedStoryWindow(ownerId, activeChild) {
  return {
    localStorage: sharedStoryStorage,
    sessionStorage: new StoryStorageMock(),
    KiddoSproutSession: {
      getSession: () => ({ user: { id: ownerId } })
    },
    KiddoHubGate: {
      readState: () => ({ activeChild, children: { [activeChild]: {} } })
    }
  };
}

const firstFamilyWindow = scopedStoryWindow("11111111-1111-4111-8111-111111111111", "Alex Smith");
vm.runInNewContext(storyStorageSource, { window: firstFamilyWindow, Object, String, Number, encodeURIComponent }, {
  filename: "story-storage-first-family.js"
});
const firstFamilyStorage = firstFamilyWindow.KiddoSproutStoryStorage;
assert.match(
  firstFamilyStorage.storageKey("legacyProgress"),
  /^kiddosprout\.story\.v4:user:11111111-1111-4111-8111-111111111111:Alex%20Smith:legacyProgress$/
);
assert.equal(firstFamilyStorage.getItem("legacyProgress"), null,
  "Unscoped reading progress from an older release must not be assigned to the next family.");
assert.equal(sharedStoryStorage.getItem("legacyProgress"), null,
  "Old unscoped reading progress should be removed when its safe scoped replacement is used.");
assert.equal(firstFamilyStorage.setItem("progress", "first-family"), true);
assert.equal(firstFamilyStorage.setItem("oversized", "x".repeat(64 * 1024 + 1)), false,
  "Unexpectedly large cached story state must be rejected.");
const oversizedKey = firstFamilyStorage.storageKey("oversized");
sharedStoryStorage.setItem(oversizedKey, "x".repeat(64 * 1024 + 1));
assert.equal(firstFamilyStorage.getItem("oversized"), null,
  "Unexpectedly large cached story state must be ignored.");
assert.equal(sharedStoryStorage.getItem(oversizedKey), null,
  "Unexpectedly large cached story state should be cleared so it cannot break every visit.");
assert.equal(firstFamilyStorage.setItem("temporary", "value"), true);
assert.equal(firstFamilyStorage.removeItem("temporary"), true);
assert.equal(firstFamilyStorage.getItem("temporary"), null);

const secondFamilyWindow = scopedStoryWindow("22222222-2222-4222-8222-222222222222", "Alex Smith");
vm.runInNewContext(storyStorageSource, { window: secondFamilyWindow, Object, String, Number, encodeURIComponent }, {
  filename: "story-storage-second-family.js"
});
const secondFamilyStorage = secondFamilyWindow.KiddoSproutStoryStorage;
assert.equal(secondFamilyStorage.getItem("progress"), null,
  "A second parent account must not inherit the first family's reading progress.");
assert.equal(secondFamilyStorage.setItem("progress", "second-family"), true);
assert.equal(firstFamilyStorage.getItem("progress"), "first-family");
assert.equal(secondFamilyStorage.getItem("progress"), "second-family");

const signedOutStoryWindow = {
  localStorage: sharedStoryStorage,
  sessionStorage: new StoryStorageMock()
};
vm.runInNewContext(storyStorageSource, { window: signedOutStoryWindow, Object, String, Number, encodeURIComponent }, {
  filename: "story-storage-signed-out.js"
});
assert.equal(signedOutStoryWindow.KiddoSproutStoryStorage.getItem("progress"), null);
assert.equal(signedOutStoryWindow.KiddoSproutStoryStorage.setItem("progress", "unsafe"), false,
  "Real-mode story storage must fail closed before a verified family and child are available.");

for (const invalidTarget of [
  "https://evil.example/story-theater.html#story-living-ink-1",
  "//evil.example/#story-living-ink-1",
  "#story-living-ink-1?chapter=0&page=1",
  "#story-living-ink-1?chapter=-1&page=1",
  "#story-living-ink-1?chapter=1.5&page=1",
  "#story-living-ink-1?chapter=1&page=10000",
  "#story-living-ink-1?page=2&chapter=1",
  "#story-living-ink-1?chapter=1&page=2&next=https://evil.example",
  "#story-%2F%2Fevil.example?chapter=1&page=1"
]) {
  assert.equal(readerRoutes.parseReaderHash(invalidTarget), null, `Unsafe reader return target was accepted: ${invalidTarget}`);
}
assert.equal(readerRoutes.readerHash("living-ink-1/../../evil", 0, 0), "");
assert.equal(readerRoutes.readerHash("living-ink-1", -1, 0), "");
assert.equal(readerRoutes.readerHash("living-ink-1", "0", 0), "");
assert.equal(readerRoutes.readerHash("living-ink-1", 0, 9_999), "");

const syncReaderSource = theaterSource.slice(
  theaterSource.indexOf("function syncReaderLocation"),
  theaterSource.indexOf("function updateReaderForActiveBook")
);
assert.doesNotMatch(syncReaderSource, /storyStorage\.setItem/,
  "Transient Sound Studio return locations must not overwrite an explicit saved bookmark.");

const storedStateFunctions = theaterSource.slice(
  theaterSource.indexOf("function storedReaderIndex"),
  theaterSource.indexOf("function isPictureBook")
);
const { storedReaderIndex, storedReadIndexes, clampedReaderIndex } = new Function(
  `${storedStateFunctions}; return { storedReaderIndex, storedReadIndexes, clampedReaderIndex };`
)();
assert.equal(storedReaderIndex("1", 3), 1, "Whole-number bookmarks from older releases should remain readable.");
for (const invalidBookmark of [1.5, "1.5", -1, 3, Number.POSITIVE_INFINITY, "not-a-page", true, [1], { value: 1 }]) {
  assert.equal(storedReaderIndex(invalidBookmark, 3), 0,
    `Invalid stored reader index should recover to page one: ${invalidBookmark}`);
}
assert.deepEqual(
  storedReadIndexes([2, "1", null, true, 2, 1.5, -1, 3, 0], 3),
  [2, 0],
  "Only unique, in-range integer progress entries should be restored from browser storage."
);
assert.equal(clampedReaderIndex(999, 3), 2, "Oversized safe URL locations should clamp to the final page.");
for (const invalidLocation of [-1, 1.5, "1", Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.equal(clampedReaderIndex(invalidLocation, 3), 0,
    `Malformed internal reader locations should recover to page one: ${invalidLocation}`);
}

function readProgressRecord(serialized) {
  let removals = 0;
  const storyStorage = {
    getItem: () => serialized,
    removeItem: () => { removals += 1; }
  };
  const readStored = new Function("storyStorage", "storyPages", "readChaptersKey", `
    ${storedStateFunctions}
    return readStoredReadChapters;
  `)(storyStorage, [{}, {}, {}], "read-progress");
  return { value: readStored(), removals };
}
assert.deepEqual(readProgressRecord("[2,0,2]").value, [2, 0]);
for (const malformedProgress of ["{not-json", '{"chapter":1}']) {
  const recovered = readProgressRecord(malformedProgress);
  assert.deepEqual(recovered.value, []);
  assert.equal(recovered.removals, 1,
    "malformed reading progress should be cleared instead of surviving every visit");
}

function fiveWordStoryShingles(value) {
  const words = normalizedStoryHeading(value).split(" ").filter(Boolean);
  const shingles = new Set();
  for (let index = 0; index <= words.length - 5; index += 1) {
    shingles.add(words.slice(index, index + 5).join(" "));
  }
  return shingles;
}

function storySceneSimilarity(first, second) {
  const firstShingles = fiveWordStoryShingles(first);
  const secondShingles = fiveWordStoryShingles(second);
  const union = new Set([...firstShingles, ...secondShingles]);
  if (!union.size) return 0;
  let overlap = 0;
  for (const shingle of firstShingles) {
    if (secondShingles.has(shingle)) overlap += 1;
  }
  return overlap / union.size;
}

for (const book of books) {
  assert.ok(book.id && book.series && book.title, "Every book needs an ID, series, and title.");
  assert.ok(Array.isArray(book.pages) && book.pages.length > 0, `${book.id} needs at least one page.`);
  const seenPageTitles = new Set();
  const seenRawScenes = new Map();
  const seenRawParagraphs = new Map();
  for (const [pageIndex, page] of book.pages.entries()) {
    assert.ok(page.chapter && page.text && page.image && page.imageAlt && page.caption, `${book.id} page ${pageIndex + 1} is incomplete.`);
    assert.match(page.image, /^assets\/story-[a-z0-9-]+\.jpg$/, `${book.id} page ${pageIndex + 1} has an unsafe image path.`);
    await access(resolve(projectRoot, page.image));

    const normalizedPageTitle = normalizedStoryHeading(page.chapter);
    assert.equal(
      seenPageTitles.has(normalizedPageTitle),
      false,
      `${book.id} page ${pageIndex + 1} repeats the page title “${page.chapter}”.`
    );
    seenPageTitles.add(normalizedPageTitle);

    assert.doesNotMatch(
      page.text,
      /^\s*here(?:['’]?s|\s+is)\s*(?:[:\-–—]\s*)?_{3,}/im,
      `${book.id} page ${pageIndex + 1} still contains an imported “here's ___” marker.`
    );
    const normalizedScene = normalizedStoryHeading(page.text);
    assert.equal(
      seenRawScenes.has(normalizedScene),
      false,
      `${book.id} page ${pageIndex + 1} duplicates page ${Number(seenRawScenes.get(normalizedScene)) + 1}.`
    );
    seenRawScenes.set(normalizedScene, pageIndex);

    const forbiddenHeadings = new Set(
      [book.title, book.series, page.chapter, page.section]
        .map(normalizedStoryHeading)
        .filter(Boolean)
    );
    for (const paragraph of page.text.split(/\r?\n\s*\r?\n/).map((part) => part.trim()).filter(Boolean)) {
      const normalizedParagraph = normalizedStoryHeading(paragraph);
      const headingWithoutScaffold = normalizedParagraph
        .replace(/^here s\s+/, "")
        .replace(/^here is\s+/, "");
      assert.equal(
        forbiddenHeadings.has(normalizedParagraph) || forbiddenHeadings.has(headingWithoutScaffold),
        false,
        `${book.id} page ${pageIndex + 1} repeats a book, series, chapter, or section heading in its scene text.`
      );
      if (normalizedParagraph.split(" ").filter(Boolean).length < 7) continue;
      assert.equal(
        seenRawParagraphs.has(normalizedParagraph),
        false,
        `${book.id} page ${pageIndex + 1} repeats a full paragraph from page ${Number(seenRawParagraphs.get(normalizedParagraph)) + 1}.`
      );
      seenRawParagraphs.set(normalizedParagraph, pageIndex);
    }

    const cleaned = cleanStoryDraftNotes(page.text, { book, page, pageIndex });
    assert.ok(cleaned, `${book.id} page ${pageIndex + 1} became empty after draft cleanup.`);
    assert.doesNotMatch(cleaned, /^here(?:['’]?s|\s+is)\s*(?:[:\-–—]\s*)?_{3,}/im);
    const firstLine = cleaned.split(/\r?\n/, 1)[0];
    assert.notEqual(normalizedStoryHeading(firstLine), normalizedStoryHeading(book.title));
    assert.notEqual(normalizedStoryHeading(firstLine), normalizedStoryHeading(page.chapter));
  }

  for (let firstIndex = 0; firstIndex < book.pages.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < book.pages.length; secondIndex += 1) {
      assert.ok(
        storySceneSimilarity(book.pages[firstIndex].text, book.pages[secondIndex].text) < 0.3,
        `${book.id} pages ${firstIndex + 1} and ${secondIndex + 1} are substantially duplicated scenes.`
      );
    }
  }
}

const keepersReturn = books.find((book) => book.id === "living-ink-keepers");
assert.ok(keepersReturn, "The expanded Keeper's Return story should stay in the library.");
const keeperSentences = keepersReturn.pages.flatMap((page, pageIndex) => {
  const cleaned = cleanStoryDraftNotes(page.text, { book: keepersReturn, page, pageIndex });
  return (cleaned.replace(/\n+/g, " ").match(/[^.!?]+(?:[.!?]+[”"']?|$)/g) || [])
    .map(normalizedStoryHeading)
    .filter((sentence) => sentence.split(" ").filter(Boolean).length >= 7);
});
assert.equal(
  new Set(keeperSentences).size,
  keeperSentences.length,
  "The expanded Keeper's Return chapters should not repeat the same full sentence."
);

const catalogSummary = new Map(catalog.books.map((book) => [book.id, book.readingPages]));
for (const book of books) {
  const readingPageCount = catalogSummary.get(book.id);
  if (book.pageLabel === "Page") {
    assert.equal(
      readingPageCount,
      book.pages.length,
      `${book.id} must keep one illustrated scene on each reader page.`
    );
  } else {
    assert.ok(
      readingPageCount > book.pages.length,
      `${book.id} chapters should be divided across multiple comfortable reading pages.`
    );
  }
}
assert.equal(catalogSummary.get("ethan-leo-lost-map"), 58, "The Lost Map should expose all 58 illustrated scenes.");

const importedDraft = `Here's __________ remove this marker

Adventures of Ethan and Leo: The Lost Map
Chapter 5: The Descent
Here's Chapter 5: The Descent
Scene 1 — The Descent
Here is The Descent
The Descent

The two brothers stepped carefully into the passage.

The two brothers stepped carefully into the passage.

The Descent

Chapter 4: The Wrong Door
They kept reading the map.`;
const cleanedDraft = cleanStoryDraftNotes(importedDraft, {
  book: { title: "Adventures of Ethan and Leo: The Lost Map", series: "Adventures of Ethan and Leo" },
  page: { chapter: "The Descent", section: "Chapter 5: The Descent", chapterNumber: 5, sceneNumber: 1 },
  pageIndex: 35
});
assert.equal(
  cleanedDraft,
  "The two brothers stepped carefully into the passage.\n\nChapter 4: The Wrong Door\nThey kept reading the map.",
  "Imported placeholders and repeated book/chapter/scene headings should be removed without deleting story text."
);

const sharedStorySentences = new Set();
const repeatedLine = "The lantern flickered while the children waited beside the quiet attic door.";
assert.equal(
  cleanStoryDraftNotes(repeatedLine, { seenSentences: sharedStorySentences }),
  repeatedLine
);
assert.equal(
  cleanStoryDraftNotes(`${repeatedLine}\n\nA new clue appeared beneath the dust on the wooden floor.`, {
    seenSentences: sharedStorySentences
  }),
  "A new clue appeared beneath the dust on the wooden floor.",
  "Book-wide cleanup should keep the first occurrence and remove a repeated full sentence on a later page."
);

for (const book of books) {
  const seenBookSentences = new Set();
  for (const [pageIndex, page] of book.pages.entries()) {
    const cleaned = cleanStoryDraftNotes(page.text, {
      book,
      page,
      pageIndex,
      seenSentences: seenBookSentences
    });
    assert.ok(cleaned, `${book.id} page ${pageIndex + 1} became empty after book-wide repetition cleanup.`);
    const normalizedSentences = (cleaned.replace(/\n+/g, " ").match(/[^.!?]+(?:[.!?]+[”"']?|$)/g) || [])
      .map(normalizedStoryHeading)
      .filter((sentence) => sentence.split(" ").filter(Boolean).length >= 7);
    assert.equal(
      new Set(normalizedSentences).size,
      normalizedSentences.length,
      `${book.id} page ${pageIndex + 1} must not repeat the same full sentence.`
    );
  }
}

assert.match(theaterSource, /const seenBookSentences = new Set\(\);[\s\S]*?seenSentences: seenBookSentences/,
  "The visible reader must remove repeated full sentences across the entire book, not only within one page.");
assert.match(theaterSource, /const storyAccessPromise = Promise\.resolve\([\s\S]*?KiddoHubGate\.protect\("story", "Story Theater"\)/,
  "Story Theater should retain the asynchronous access result instead of initializing behind the gate.");
assert.match(theaterSource, /storyAccessPromise\.then\(\(allowed\) => \{[\s\S]*?if \(!allowed\) return;[\s\S]*?storyAccessReady = true;[\s\S]*?loadBookState\(livingInkBookOne\.id\)/,
  "Story bookmarks and progress must not be loaded until family access succeeds.");
assert.match(theaterSource, /window\.addEventListener\("hashchange", \(\) => \{\s*if \(!storyAccessReady\) return;/,
  "Hash navigation must not bypass the asynchronous Story Theater access gate.");

function sourceBetween(startMarker, endMarker) {
  const start = theaterSource.indexOf(startMarker);
  const end = theaterSource.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `Missing ${startMarker}`);
  assert.notEqual(end, -1, `Missing ${endMarker}`);
  return theaterSource.slice(start, end);
}

const chapterClickHandler = sourceBetween(
  "function renderChapterList",
  "function renderStoryPage"
);
assert.match(chapterClickHandler, /currentChapterPage = 0;[\s\S]*renderStoryPage\(\);[\s\S]*focusReadingPage\(\{ showImage: true \}\);/);
assert.match(chapterClickHandler, /document\.createElement\("button"\)/);
assert.match(chapterClickHandler, /title\.textContent = String\(item\.chapter/);
assert.doesNotMatch(chapterClickHandler, /innerHTML/, "Story titles must be rendered as text, never executable HTML.");
assert.match(chapterClickHandler, /keepActiveChapterVisible\(chapterList, activeButton\)/);

const previousHandler = sourceBetween(
  'document.getElementById("prev-page").addEventListener',
  'document.getElementById("next-page").addEventListener'
);
assert.match(previousHandler, /renderStoryPage\(\);\s*focusReadingPage\(\{ showImage: true \}\);/);

const nextHandler = sourceBetween(
  'document.getElementById("next-page").addEventListener',
  'document.getElementById("save-bookmark").addEventListener'
);
assert.ok(
  (nextHandler.match(/focusReadingPage\(\{ showImage: true \}\)/g) || []).length >= 4,
  "Every Next/finish/restart branch should return the reader to the illustration."
);
assert.doesNotMatch(nextHandler, /focusReadingPage\(\);/);
assert.match(theaterSource, /const scrollTarget = showImage[\s\S]*document\.getElementById\("story-scene"\)/);
assert.match(theaterSource, /if \(focusText\) scrollTarget\.focus\(\{ preventScroll: true \}\);/,
  "The focused element must be the same illustration or text target that page navigation reveals.");
assert.match(theaterSource, /focusReadingPage\(\{ showImage: true, focusText: focus \}\)/,
  "Opening a book should reveal its illustration, including on narrow screens.");
assert.match(hubStyles, /\.story-scene:focus\s*\{[\s\S]*?outline:/,
  "The programmatically focused story illustration must remain visibly focused.");

const searchFunctions = sourceBetween("function normalizedStoryHeading", "function cleanStoryDraftNotes");
const { normalizedSeriesSearch: normalizeSearch } = new Function(
  `${searchFunctions}; return { normalizedSeriesSearch };`
)();
assert.equal(normalizeSearch("  Ethan   &  Léo  "), "ethan leo");
assert.match(theaterSource, /queryWords\.every\(\(word\) => searchText\.includes\(word\)\)/,
  "Series search should accept extra spaces and match each search word.");
assert.match(theaterSource, /const hasSearchInput = input\.value\.length > 0;[\s\S]*?clearButton\.hidden = !hasSearchInput;/,
  "A punctuation-only search must keep its explicit Clear search control available.");
assert.match(theaterSource, /seriesSearchInput\.addEventListener\("search", filterSeriesLibrary\)/,
  "The native clear control in search inputs must refresh the visible series list.");
assert.match(theaterSource, /seriesSearchInput\.addEventListener\("keydown", \(event\) => \{[\s\S]*?event\.key !== "Escape"[\s\S]*?seriesSearchInput\.value = "";[\s\S]*?filterSeriesLibrary\(\)/,
  "Keyboard users should be able to clear series search with Escape.");
assert.match(hubStyles, /\.series-search input\s*\{[\s\S]*?font-size:\s*16px;/,
  "Series search text must remain at least 16px on tablet-sized touch screens.");

const pageRenderer = sourceBetween("function renderStoryPage", 'document.getElementById("prev-page")');
assert.match(pageRenderer, /locationParts\.push\(`\$\{pageLabel\} \$\{currentPage \+ 1\} of \$\{storyPages\.length\}`\)/);
assert.match(pageRenderer, /if \(nestedPages\) locationParts\.push\(`Page \$\{currentChapterPage \+ 1\} of \$\{readingPages\.length\}`\)/,
  "Every split story page should keep its chapter and within-chapter location visible.");
assert.match(pageRenderer, /restoreStorySceneImage\(chapter\);/,
  "Each reader page should restore its illustration before showing the next scene.");
const sceneFallbackSource = sourceBetween("function restoreStorySceneImage", "function setSeriesSelected");
assert.match(sceneFallbackSource, /nextImage\.alt = chapter\.imageAlt;[\s\S]*?nextImage\.src = nextSource;/,
  "The new illustration description should be in place before its image starts loading.");
assert.match(sceneFallbackSource, /const nextImage = storySceneImage\.cloneNode\(false\);[\s\S]*?storySceneImage\.replaceWith\(nextImage\);[\s\S]*?storySceneImage = nextImage;/,
  "Each different illustration request should use a new image node so a late result cannot affect the current scene.");
assert.match(sceneFallbackSource, /nextImage\.addEventListener\("error", \(\) => showStorySceneFallback\(nextImage, nextSource\)/,
  "A missing illustration should switch from the exact failed image to the story fallback.");
assert.match(sceneFallbackSource, /if \(storySceneImage !== failedImage \|\| renderedStorySceneSource !== failedSource\) return;/,
  "A late failure from a detached illustration must not hide the current scene.");
assert.match(sceneFallbackSource, /if \(nextSource === renderedStorySceneSource\) \{[\s\S]*?return;/,
  "Split reading pages should preserve a known illustration fallback instead of retrying the same failed image on every page.");
assert.match(sceneFallbackSource, /failedImage\.hidden = true;[\s\S]*?storySceneFallback\.hidden = false;/,
  "The fallback should replace, rather than sit behind, a broken illustration.");
assert.match(sceneFallbackSource, /dataset\.storyImageSource === nextSource[\s\S]*?illustration is ready/,
  "A recovered illustration should replace the temporary loading status.");
assert.match(sceneFallbackSource, /recoveringFromFailure[\s\S]*?Loading this page's illustration/,
  "Moving away from a failed illustration should clear its stale error status once the next image loads.");
assert.match(hubStyles, /\.story-scene-fallback\s*\{[\s\S]*?min-height:/,
  "The missing-illustration fallback should remain visibly usable in the reader.");

const premiumNarrationSource = sourceBetween("async function playPremiumNarration", "function selectVoiceMood");
assert.match(theaterSource, /function stopReadingAloud[\s\S]*?narrationGeneration \+= 1;/,
  "Stopping narration must invalidate work that is still waiting for an account token.");
assert.match(premiumNarrationSource, /generation !== narrationGeneration/g,
  "Every asynchronous premium narration stage should reject an obsolete Start action.");
assert.match(premiumNarrationSource, /if \(generation !== narrationGeneration \|\| activeStoryAudio !== audio\) return true;/,
  "A late play rejection from old audio must not switch off a newer narration.");
assert.match(theaterSource, /const generation = \+\+narrationGeneration;[\s\S]*?playPremiumNarration\(page, mood, locationKey, generation\)[\s\S]*?generation !== narrationGeneration/,
  "Read to Me should let only its latest Start action proceed to device narration.");

const bookmarkHandler = sourceBetween(
  'document.getElementById("save-bookmark").addEventListener',
  'document.getElementById("mark-read").addEventListener'
);
assert.match(bookmarkHandler, /bookmarkLocationKey/);
assert.match(bookmarkHandler, /if \(!saved\)/);
assert.match(bookmarkHandler, /could not save the bookmark/);
assert.match(theaterSource, /if \(!storyStorage\.setItem\(readChaptersKey/,
  "Reading progress must only change in memory after browser storage accepts it.");
assert.match(theaterSource, /function markChapterRead[\s\S]*?const latestReadChapters = readStoredReadChapters\(\)[\s\S]*?\[\.\.\.latestReadChapters, chapterIndex\]/,
  "finishing a chapter should merge progress written by another open Story Theater tab");
const markReadHandler = sourceBetween(
  'document.getElementById("mark-read").addEventListener',
  'document.querySelectorAll("[data-voice-mood]")'
);
assert.match(markReadHandler, /if \(!markedAsRead && markButton\.disabled\)[\s\S]*?focusReadingPage\(\{ showImage: true \}\);/,
  "Unmarking an early reading page must recover focus when its action becomes disabled.");
assert.match(theaterSource, /window\.addEventListener\("storage"[\s\S]*?progressStorageKey[\s\S]*?readStoredReadChapters\(\)[\s\S]*?renderReadingProgress\(\)[\s\S]*?renderChapterList/,
  "reading progress changed in another tab should update the visible reader and page list");
assert.match(theaterSource, /story-status-error/);
assert.match(hubStyles, /#bookmark-note\.story-status-error/);
assert.match(hubStyles, /@media \(max-width: 560px\)[\s\S]*?\.book-page-meta,[\s\S]*?\.reader-actions[\s\S]*?flex-direction: column;/,
  "Reader metadata and page controls should stack on small screens.");

console.log("Story series, safe rendering, resilient storage, search, content cleanup, images, and reader navigation checks passed.");
