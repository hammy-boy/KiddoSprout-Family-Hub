import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const THEME_URL = new URL("../_______/wisp/frontend/scripts/theme.js", import.meta.url);

async function loadThemeModule(label) {
  const source = await readFile(THEME_URL, "utf8");
  const encoded = Buffer.from(source).toString("base64");
  return import(`data:text/javascript;base64,${encoded}#${label}`);
}

test("Wisp theme remains usable when browser storage is unavailable", async () => {
  const attributes = new Map();
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  try {
    globalThis.document = {
      documentElement: {
        getAttribute: (name) => attributes.get(name) || null,
        setAttribute: (name, value) => attributes.set(name, value),
      },
    };
    globalThis.window = {
      matchMedia: () => ({ matches: true }),
      get localStorage() {
        throw new Error("Storage access denied");
      },
    };

    const readBlocked = await loadThemeModule("read-blocked");
    assert.doesNotThrow(() => readBlocked.initTheme());
    assert.equal(attributes.get("data-theme"), "light");

    globalThis.window = {
      matchMedia: () => ({ matches: false }),
      localStorage: {
        getItem: () => "dark",
        setItem: () => { throw new Error("Storage write denied"); },
      },
    };
    const writeBlocked = await loadThemeModule("write-blocked");
    writeBlocked.initTheme();
    assert.equal(attributes.get("data-theme"), "dark");
    assert.doesNotThrow(() => writeBlocked.toggleTheme());
    assert.equal(attributes.get("data-theme"), "light");
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
