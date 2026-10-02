import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../_______/wisp/frontend/", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, ROOT), "utf8");
}

test("Wisp uses a dynamic mobile viewport, safe areas, and non-zooming form controls", async () => {
  const [base, auth, chat, onboarding] = await Promise.all([
    read("styles/base.css"),
    read("styles/auth.css"),
    read("styles/chat.css"),
    read("styles/onboarding.css"),
  ]);

  assert.match(base, /height:\s*100dvh/);
  assert.match(base, /font-size:\s*1rem/);
  assert.match(base, /env\(safe-area-inset-bottom/);
  assert.match(auth, /overflow-y:\s*auto/);
  assert.match(chat, /\.chat-body[\s\S]*?min-height:\s*0/);
  assert.match(chat, /\.composer-input-wrap:focus-within/);
  assert.match(onboarding, /max-height:\s*560px[\s\S]*?orientation:\s*landscape/);
});

test("Wisp preserves visible focus, reduced motion, contrast, and touch targets", async () => {
  const [base, screens, tokens, chat, onboarding] = await Promise.all([
    read("styles/base.css"),
    read("styles/screens.css"),
    read("styles/tokens.css"),
    read("styles/chat.css"),
    read("styles/onboarding.css"),
  ]);

  assert.match(base, /\.icon-btn\s*\{[\s\S]*?width:\s*44px;\s*height:\s*44px/);
  assert.match(base, /\.tab-item:focus-visible/);
  assert.match(screens, /\.call-type-btn\s*\{[\s\S]*?width:\s*44px;\s*height:\s*44px/);
  assert.match(screens, /\.switch\s*\{[^}]*height:\s*44px/);
  assert.match(tokens, /prefers-reduced-motion:\s*reduce/);
  assert.match(tokens, /prefers-contrast:\s*more/);
  assert.match(tokens, /--color-muted:\s*#686B78/);
  assert.match(tokens, /--color-coral:\s*#B9382B/);
  assert.match(tokens, /--color-primary-text:\s*#8B8FFF/);
  assert.match(tokens, /--color-primary-text:\s*#4347C5/);
  assert.match(screens, /\.avatar\s*\{[\s\S]{0,220}?#4347C5[\s\S]{0,100}?color:\s*#fff/i,
    "Small avatar initials need a gradient dark enough for white text.");
  assert.doesNotMatch(screens, /\.avatar\s*\{[\s\S]*?#8B8FFF/,
    "The former pale avatar endpoint did not meet small-text contrast.");
  assert.match(onboarding, /\.brand-mark\s*\{[\s\S]{0,240}?#4347C5/i);
  assert.match(chat, /\.bubble-row\.is-mine\s+\.bubble-meta\s*\{[^}]*color:\s*#fff/i,
    "Small message metadata must use fully opaque high-contrast text.");
});

test("Wisp pages expose landmarks, status changes, labels, and mobile keyboard hints", async () => {
  const pages = Object.fromEntries(await Promise.all(
    ["calls", "chat", "contacts", "home", "login", "profile", "signup"]
      .map(async (name) => [name, await read(`pages/${name}.html`)]),
  ));

  for (const name of ["calls", "contacts", "home", "profile"]) {
    assert.match(pages[name], /<header class="top-bar">/, `${name} needs a semantic page header`);
  }
  for (const name of ["calls", "chat", "contacts", "home"]) {
    assert.match(pages[name], /id="load-banner"[^>]*role="alert"[^>]*aria-live="assertive"/,
      `${name} errors need an assertive live region`);
  }

  assert.match(pages.chat, /role="log"[^>]*aria-live="polite"/);
  assert.match(pages.chat, /<textarea[^>]*name="message"[^>]*enterkeyhint="send"/);
  assert.match(pages.contacts, /<input type="search"[^>]*enterkeyhint="search"[^>]*spellcheck="false"/);
  assert.match(pages.home, /<input type="search"[^>]*enterkeyhint="search"[^>]*spellcheck="false"/);
  assert.equal((pages.profile.match(/type="checkbox"[^>]*aria-label=/g) || []).length, 2);
  assert.match(pages.login, /role="group" aria-labelledby="safety-check-label"/);
  assert.match(pages.signup, /role="group" aria-labelledby="safety-check-label"/);
});

test("Every Wisp page keeps mobile viewport metadata and valid local label references", async () => {
  const names = [
    "calls", "chat", "complete-profile", "contacts", "home",
    "index", "login", "profile", "reset-password", "signup",
  ];

  for (const name of names) {
    const html = await read(`pages/${name}.html`);
    assert.match(html, /<html lang="en">/, `${name} needs a document language`);
    assert.match(html, /name="viewport" content="width=device-width, initial-scale=1\.0, viewport-fit=cover"/,
      `${name} needs notch-safe viewport metadata`);
    const skipTarget = html.match(/class="skip-link" href="#([^"]+)"/)?.[1];
    assert.ok(skipTarget, `${name} needs a keyboard skip link`);
    assert.match(html, /<main\b[^>]*\bid="main"|<main\b[^>]*\bid="chat-body"/,
      `${name} needs a main landmark`);

    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${name} must not contain duplicate IDs`);
    assert.ok(ids.includes(skipTarget), `${name} skip link points to missing #${skipTarget}`);
    for (const match of html.matchAll(/<label\b[^>]*\bfor="([^"]+)"/g)) {
      assert.ok(ids.includes(match[1]), `${name} label points to missing #${match[1]}`);
    }
    for (const match of html.matchAll(/\baria-describedby="([^"]+)"/g)) {
      for (const id of match[1].split(/\s+/)) {
        assert.ok(ids.includes(id), `${name} aria-describedby points to missing #${id}`);
      }
    }
  }
});
