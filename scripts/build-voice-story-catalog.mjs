import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultProjectRoot = resolve(scriptDirectory, "..");

export function normalizedStoryHeading(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function cleanStoryDraftNotes(value, {
  book = {},
  page = {},
  pageIndex = 0,
  seenSentences: rememberedSentences = null
} = {}) {
  const lines = String(value || "")
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      const isBlankDraftMarker = /^here(?:['’]?s|\s+is)\s*(?:[:\-–—]\s*)?_{3,}/i.test(trimmed);
      const isExpansionInstruction = /\b(?:scene|chapter)\b/i.test(trimmed)
        && /\b(?:expand|expanded|continue|full-length|long-form|novel-style|written as|one scene at a time)\b/i.test(trimmed)
        && /^(?:excellent|perfect|alright|great|here(?:['’]?s)|let(?:['’]?s)|now)\b/i.test(trimmed);
      return !isBlankDraftMarker && !isExpansionInstruction;
    });

  const normalizedBookTitle = normalizedStoryHeading(book.title);
  const normalizedSeriesTitle = normalizedStoryHeading(book.series);
  const normalizedChapterTitle = normalizedStoryHeading(page.chapter);
  const normalizedSectionTitle = normalizedStoryHeading(page.section);
  const normalizedBookSubtitle = normalizedBookTitle.startsWith(`${normalizedSeriesTitle} `)
    ? normalizedBookTitle.slice(normalizedSeriesTitle.length).trim()
    : "";
  const displayedHeadings = new Set([
    normalizedBookTitle,
    normalizedSeriesTitle,
    normalizedBookSubtitle,
    normalizedChapterTitle,
    normalizedSectionTitle
  ].filter(Boolean));
  const positiveNumber = (value) => {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : null;
  };
  const expectedPageNumbers = new Set([pageIndex + 1]);
  const expectedChapterNumbers = new Set([
    pageIndex + 1,
    positiveNumber(page.chapterNumber)
  ].filter(Boolean));
  const expectedSceneNumbers = new Set([
    pageIndex + 1,
    positiveNumber(page.sceneNumber)
  ].filter(Boolean));

  const isRepeatedHeading = (line) => {
    const unwrapped = line.trim()
      .replace(/^#{1,6}\s*/, "")
      .replace(/^(\*\*|__)([\s\S]*)\1$/, "$2")
      .trim();
    const withoutDraftIntroduction = unwrapped
      .replace(/^here(?:['’]?s|\s+is)\s*(?:[:\-–—]\s*)?/i, "")
      .trim();
    const normalizedLine = normalizedStoryHeading(withoutDraftIntroduction);
    if (displayedHeadings.has(normalizedLine)) return true;

    const labelledHeading = withoutDraftIntroduction.match(/^(chapter|scene|page)\s+(\d+)\s*(?:(?:[.:\-–—])\s*(.*))?[.!?]?$/i);
    if (labelledHeading) {
      const label = labelledHeading[1].toLowerCase();
      const expectedNumbers = label === "chapter"
        ? expectedChapterNumbers
        : label === "scene"
          ? expectedSceneNumbers
          : expectedPageNumbers;
      if (!expectedNumbers.has(Number(labelledHeading[2]))) return false;
      const suffix = normalizedStoryHeading(labelledHeading[3]);
      return !suffix || displayedHeadings.has(suffix);
    }

    const numberedHeading = withoutDraftIntroduction.match(/^(\d+)\s*[.):\-–—]\s*(.+)$/);
    return Boolean(
      numberedHeading
      && [expectedPageNumbers, expectedChapterNumbers, expectedSceneNumbers]
        .some((numbers) => numbers.has(Number(numberedHeading[1])))
      && displayedHeadings.has(normalizedStoryHeading(numberedHeading[2]))
    );
  };

  const withoutRepeatedHeadings = lines
    .filter((line) => !isRepeatedHeading(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const seenSentences = rememberedSentences instanceof Set ? rememberedSentences : new Set();
  return withoutRepeatedHeadings
    .split(/\n\s*\n/)
    .map((paragraph) => {
      const sentences = paragraph.match(/[^.!?]+(?:[.!?]+[”"']?|$)/g) || [paragraph];
      return sentences
        .filter((sentence) => {
          const normalizedSentence = normalizedStoryHeading(sentence);
          if (normalizedSentence.split(" ").filter(Boolean).length < 7) return true;
          if (seenSentences.has(normalizedSentence)) return false;
          seenSentences.add(normalizedSentence);
          return true;
        })
        .map((sentence) => sentence.trim())
        .filter(Boolean)
        .join(" ");
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function wordCount(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

export function splitChapterIntoReadingPages(text, wordsPerPage = 230) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return [""];

  const units = [];
  cleanText.split(/\n\s*\n/).forEach((paragraph, paragraphIndex) => {
    const cleanParagraph = paragraph.trim();
    if (!cleanParagraph) return;
    const sentences = cleanParagraph.match(/[^.!?]+(?:[.!?]+[”"']?|$)/g) || [cleanParagraph];
    sentences.forEach((sentence) => {
      const cleanSentence = sentence.trim();
      if (!cleanSentence) return;
      const words = cleanSentence.split(/\s+/);
      if (words.length <= 300) {
        units.push({ text: cleanSentence, paragraphIndex, words: words.length });
        return;
      }
      for (let start = 0; start < words.length; start += wordsPerPage) {
        const section = words.slice(start, start + wordsPerPage).join(" ");
        units.push({ text: section, paragraphIndex, words: wordCount(section) });
      }
    });
  });

  if (!units.length) return [cleanText];
  const totalWords = units.reduce((sum, unit) => sum + unit.words, 0);
  let pageTotal = Math.max(2, Math.ceil(totalWords / wordsPerPage));

  while (units.length < pageTotal) {
    let longestIndex = 0;
    for (let index = 1; index < units.length; index += 1) {
      if (units[index].words > units[longestIndex].words) longestIndex = index;
    }
    const longest = units[longestIndex];
    if (!longest || longest.words < 2) break;
    const words = longest.text.split(/\s+/);
    const midpoint = Math.ceil(words.length / 2);
    const first = words.slice(0, midpoint).join(" ");
    const second = words.slice(midpoint).join(" ");
    units.splice(longestIndex, 1,
      { text: first, paragraphIndex: longest.paragraphIndex, words: wordCount(first) },
      { text: second, paragraphIndex: longest.paragraphIndex, words: wordCount(second) }
    );
  }

  pageTotal = Math.min(pageTotal, units.length);
  const pages = [];
  let unitIndex = 0;
  let wordsRemaining = totalWords;

  for (let pageIndex = 0; pageIndex < pageTotal; pageIndex += 1) {
    const pagesRemaining = pageTotal - pageIndex;
    const targetWords = Math.ceil(wordsRemaining / pagesRemaining);
    const selected = [];
    let selectedWords = 0;

    while (unitIndex < units.length) {
      const unit = units[unitIndex];
      const unitsAfter = units.length - unitIndex - 1;
      const pagesAfter = pagesRemaining - 1;
      if (selected.length && unitsAfter < pagesAfter) break;
      if (selected.length && selectedWords >= targetWords * 0.78 && selectedWords + unit.words > targetWords * 1.18) break;
      selected.push(unit);
      selectedWords += unit.words;
      unitIndex += 1;
      if (selectedWords >= targetWords && units.length - unitIndex >= pagesAfter) break;
    }

    const pageText = selected.map((unit, index) => {
      if (!index) return unit.text;
      return `${selected[index - 1].paragraphIndex === unit.paragraphIndex ? " " : "\n\n"}${unit.text}`;
    }).join("");
    pages.push(pageText);
    wordsRemaining -= selectedWords;
  }

  return pages.filter((page) => page.trim());
}

export async function loadStoryBooks(projectRoot) {
  const theaterSource = await readFile(resolve(projectRoot, "story-theater.html"), "utf8");
  const startMarker = "    const livingInkBookOnePages = [";
  const endMarker = "\n\n    const livingInkBookOne = {";
  const start = theaterSource.indexOf(startMarker);
  const end = theaterSource.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error("Could not find The Living Ink page catalog in story-theater.html.");
  const pageDeclaration = theaterSource.slice(start, end);
  const livingInkPages = vm.runInNewContext(`(() => { ${pageDeclaration}; return livingInkBookOnePages; })()`, Object.create(null), {
    filename: "story-theater.html#livingInkBookOnePages",
    timeout: 1000
  });

  const context = vm.createContext({ window: {} });
  for (const fileName of ["story-library-data.js", "story-ethan-leo-data.js"]) {
    const source = await readFile(resolve(projectRoot, fileName), "utf8");
    vm.runInContext(source, context, { filename: fileName, timeout: 2000 });
  }

  return [{
    id: "living-ink-1",
    series: "The Living Ink",
    title: "The Living Ink",
    pages: livingInkPages
  }, ...context.window.KiddoSproutStoryAdditions];
}

export async function buildVoiceStoryCatalog(projectRoot = defaultProjectRoot) {
  const books = await loadStoryBooks(projectRoot);
  const entries = {};
  const bookSummaries = [];

  for (const book of books) {
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(String(book?.id || "")) || !Array.isArray(book?.pages)) {
      throw new Error("Every narrated book needs a safe ID and a pages array.");
    }
    let readingPageCount = 0;
    const seenBookSentences = new Set();
    book.pages.forEach((chapter, chapterIndex) => {
      const cleanText = cleanStoryDraftNotes(chapter?.text, {
        book,
        page: chapter,
        pageIndex: chapterIndex,
        seenSentences: seenBookSentences
      });
      const readingPages = book.pageLabel === "Page" ? [cleanText] : splitChapterIntoReadingPages(cleanText);
      readingPages.forEach((text, pageIndex) => {
        const location = `${book.id}:${chapterIndex}:${pageIndex}`;
        const narration = pageIndex === 0 ? `${chapter.chapter}. ${text}` : text;
        if (!narration.trim()) throw new Error(`Narration is empty at ${location}.`);
        if (Object.hasOwn(entries, location)) throw new Error(`Duplicate narration location: ${location}.`);
        entries[location] = narration;
        readingPageCount += 1;
      });
    });
    bookSummaries.push({ id: book.id, readingPages: readingPageCount });
  }

  return {
    version: 1,
    books: bookSummaries,
    entries
  };
}

function parseArguments(argv) {
  const options = {
    root: defaultProjectRoot,
    output: resolve(defaultProjectRoot, "server/trusted-story-catalog.json"),
    check: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--root") options.root = resolve(argv[++index]);
    else if (argv[index] === "--output") options.output = resolve(argv[++index]);
    else if (argv[index] === "--check") options.check = true;
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return options;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseArguments(process.argv.slice(2));
  const catalog = await buildVoiceStoryCatalog(options.root);
  const output = `${JSON.stringify(catalog, null, 2)}\n`;
  if (options.check) {
    const existing = await readFile(options.output, "utf8").catch(() => "");
    if (existing !== output) {
      console.error("The trusted voice story catalog is stale. Run npm run build:voice-catalog.");
      process.exitCode = 1;
    } else {
      console.log(`Trusted voice story catalog is current (${Object.keys(catalog.entries).length} reading pages).`);
    }
  } else {
    await writeFile(options.output, output, { mode: 0o644 });
    console.log(`Wrote ${Object.keys(catalog.entries).length} trusted reading pages to ${options.output}.`);
  }
}
