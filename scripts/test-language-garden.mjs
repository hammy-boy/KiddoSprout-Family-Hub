import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = new URL("../", import.meta.url);
const SOURCE_DIRECTORY = new URL("games/language-garden/", ROOT);
const PUBLISHED_DIRECTORY = new URL("public-site/games/language-garden/", ROOT);
const LANGUAGE_FILES = Object.freeze([
  "index.html",
  "style.css",
  "catalogue.js",
  "courses.js",
  "game.js"
]);

const sourceCourses = require(fileURLToPath(new URL("courses.js", SOURCE_DIRECTORY))).courses;
const publishedCourses = require(fileURLToPath(new URL("courses.js", PUBLISHED_DIRECTORY))).courses;
const sourceIds = Object.keys(sourceCourses);
const publishedIds = Object.keys(publishedCourses);
const totalCards = (courses) => Object.values(courses)
  .reduce((total, course) => total + course.cards.length, 0);
const sourceCardCounts = new Set(Object.values(sourceCourses)
  .map((course) => course.cards.length));

assert.ok(sourceIds.length >= 40,
  "Language Garden must keep at least the reviewed forty starter courses.");
assert.equal(sourceCardCounts.size, 1,
  "Every reviewed starter course must contain the same number of word cards.");
const cardsPerCourse = [...sourceCardCounts][0];
assert.ok(cardsPerCourse >= 24,
  "Every reviewed starter course must keep at least twenty-four word cards.");
assert.equal(totalCards(sourceCourses), sourceIds.length * cardsPerCourse,
  "Language Garden's word-card total must match its starter-course inventory.");
assert.deepEqual(publishedIds, sourceIds,
  "The GitHub Pages bundle must publish every source Language Garden course.");
assert.deepEqual(publishedCourses, sourceCourses,
  "The GitHub Pages bundle must not serve stale Language Garden cards.");

for (const file of LANGUAGE_FILES) {
  const [source, published] = await Promise.all([
    readFile(new URL(file, SOURCE_DIRECTORY)),
    readFile(new URL(file, PUBLISHED_DIRECTORY))
  ]);
  assert.deepEqual(published, source,
    `The GitHub Pages Language Garden copy is stale: ${file}.`);
}

const [sourceChooser, publishedChooser, responsiveStyles] = await Promise.all([
  readFile(new URL("games/index.html", ROOT), "utf8"),
  readFile(new URL("public-site/games/index.html", ROOT), "utf8"),
  readFile(new URL("style.css", SOURCE_DIRECTORY), "utf8")
]);
for (const [name, chooser] of [["source", sourceChooser], ["published", publishedChooser]]) {
  assert.match(chooser,
    /id=["']learning-games["'][\s\S]*?href=["']language-garden\/index\.html["'][\s\S]*?<h3>Language Garden<\/h3>/,
    `The ${name} Learning Games chooser must link to Language Garden.`);
}
assert.match(responsiveStyles,
  /@media\(max-width:800px\)\{\.numbers\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/,
  "The four Language Garden totals must collapse to two columns on smaller screens.");

console.log(`Language Garden checks passed: ${sourceIds.length} courses, ${totalCards(sourceCourses)} cards, and a current GitHub Pages bundle.`);
