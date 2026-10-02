import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const chatDataPath = new URL("../_______/wisp/frontend/scripts/chatData.js", import.meta.url);
const contactsPath = new URL("../_______/wisp/frontend/scripts/contacts.js", import.meta.url);
const contactsPagePath = new URL("../_______/wisp/frontend/pages/contacts.html", import.meta.url);
const [chatData, contacts, contactsPage] = await Promise.all([
  readFile(chatDataPath, "utf8"),
  readFile(contactsPath, "utf8"),
  readFile(contactsPagePath, "utf8"),
]);

test("saved contacts use the existing owner-scoped Wisp table", () => {
  for (const name of ["listContacts", "addContact", "removeContact"]) {
    assert.match(chatData, new RegExp(`export\\s+async\\s+function\\s+${name}\\b`));
  }
  assert.match(chatData, /\.from\(WISP_TABLES\.contacts\)/);
  assert.match(chatData, /\.eq\(["']owner_id["']\s*,\s*user\.id\)/,
    "Contact reads/deletes must remain scoped to the authenticated owner.");
  assert.match(chatData, /\.insert\(\{\s*owner_id:\s*user\.id\s*,\s*contact_id:\s*contactId\s*\}\)/,
    "Contact inserts must derive owner_id from the verified session.");
  assert.doesNotMatch(chatData, /\.from\(WISP_TABLES\.contacts\)[\s\S]{0,180}?\.update\(/,
    "The contacts UI must not assume UPDATE privileges it does not have.");
});

test("the Contacts tab loads saved contacts and exposes explicit actions", () => {
  assert.match(contacts, /contacts\s*=\s*await\s+listContacts\(\)[\s\S]*?savedContacts\s*=\s*contacts/,
    "Normal Contacts mode must load the address book before rendering.");
  assert.match(contacts, /await\s+addContact\(contact\.id\)/);
  assert.match(contacts, /await\s+removeContact\(contact\.id\)/);
  assert.match(contacts, /await\s+getOrCreateOneToOneChat\(contact\.id\)/,
    "Pick mode and normal mode must both be able to open a conversation.");
  assert.match(contacts, /saveButton\.type\s*=\s*["']button["']/);
  assert.match(contacts, /messageButton\.type\s*=\s*["']button["']/);
  assert.match(contacts, /saveButton\.dataset\.action\s*=\s*["']save["']/);
  assert.match(contacts, /messageButton\.dataset\.action\s*=\s*["']message["']/);
  assert.match(contacts, /saveButton\.setAttribute\(["']aria-label["']/);
  assert.match(contacts, /messageButton\.setAttribute\(["']aria-label["']/);
  assert.match(contacts, /\.textContent\s*=/,
    "Contact and action labels must use safe text rendering.");
  assert.doesNotMatch(contacts, /\.innerHTML\s*=|insertAdjacentHTML\s*\(|document\.write\s*\(/,
    "Untrusted profile data must never be interpreted as HTML.");
});

test("stale username-search results cannot replace a newer query", () => {
  assert.match(contacts, /const\s+requestId\s*=\s*\+\+searchRequestId/);
  assert.match(contacts, /requestId\s*!==\s*searchRequestId/);
});

test("restoring Contacts reruns a retained search instead of showing cached results", () => {
  assert.match(contacts, /async\s+function\s+runSearch\(version\s*=\s*pageVersion\)/,
    "Search responses must belong to the current page lifecycle.");
  assert.match(
    contacts,
    /savedContacts\s*=\s*contacts;[\s\S]{0,220}?if\s*\(isSearching\(\)\)\s*await\s+runSearch\(version\)/,
    "A BFCache-restored query must be fetched again after saved contacts reload."
  );
  assert.match(contacts, /isCurrentPage\(version\)\s*\|\|\s*requestId\s*!==\s*searchRequestId/,
    "Old-page search responses must not replace the restored view.");
});

test("contact mutations and navigation cannot update a stale cached page", () => {
  assert.match(contacts, /const\s+actionVersion\s*=\s*pageVersion/);
  assert.match(contacts, /await\s+removeContact\(contact\.id\);[\s\S]{0,100}?isCurrentPage\(actionVersion\)/);
  assert.match(contacts, /await\s+addContact\(contact\.id\);[\s\S]{0,100}?isCurrentPage\(actionVersion\)/);
  assert.match(contacts, /await\s+getOrCreateOneToOneChat\(contact\.id\);[\s\S]{0,100}?isCurrentPage\(actionVersion\)/);
  assert.match(contacts, /await\s+waitForContactMutations\(\)/,
    "A restored address book must wait for an in-flight saved-contact mutation.");
  assert.match(contacts, /mutationVersion\s*===\s*contactsMutationVersion/,
    "A contact snapshot that raced a mutation must be fetched again.");
});

test("contact search announces the number of results", () => {
  assert.match(contactsPage, /id=["']contact-search-status["'][^>]+role=["']status["']/);
  assert.match(contacts, /results\.length[\s\S]{0,120}?matching[\s\S]{0,100}?contact/);
  assert.match(contacts, /Contact search results are unavailable\./);
});
