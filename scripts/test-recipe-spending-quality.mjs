import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [recipe, spending] = await Promise.all([
  readFile(new URL("recipe.html", root), "utf8"),
  readFile(new URL("app_7.html", root), "utf8")
]);

for (const [name, html] of [["recipe.html", recipe], ["app_7.html", spending]]) {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .filter((source) => source.trim());
  scripts.forEach((source, index) => {
    assert.doesNotThrow(() => new Function(source), `${name} inline script ${index + 1} should parse`);
  });
  assert.match(html, /<html lang="en-GB">/, `${name} should identify its written language`);
  assert.match(html, /themeMode[\s\S]*?theme-night[\s\S]*?theme-day/,
    `${name} should follow KiddoSprout's saved day/night setting`);
  assert.match(html, /@media \(prefers-reduced-motion: reduce\)/,
    `${name} should respect reduced-motion preferences`);
}

assert.match(spending, /<nav class="topbar" aria-label="Smart Spending navigation">/);
assert.match(spending, /id="goalProgress"[^>]*aria-valuetext="£0\.00 of £40\.00 saved"/);
assert.match(spending, /#goalProgress"\)\.setAttribute\([\s\S]*?"aria-valuetext"/);
assert.match(spending, /id="history" role="list"/);
assert.match(spending, /row\.setAttribute\("role", "listitem"\)/);
assert.match(spending, /theme: document\.documentElement\.classList\.contains\("theme-night"\) \? "dark" : "light"/);
assert.match(spending, /@media \(max-width: 520px\)[\s\S]*?\.topbar[\s\S]*?flex-direction: column/);
assert.match(spending, /@media \(max-width: 520px\)[\s\S]*?input\s*\{\s*font-size: 16px;/,
  "small-screen Smart Spending inputs should not trigger iOS focus zoom");

assert.match(recipe, /<nav class="global-tools" aria-label="FlavorNest navigation">/);
assert.match(recipe, /panel\.hidden = !open/);
assert.match(recipe, /id="youtube-music-panel"[^>]*\$\{youtubeMusicOpen \? "" : "hidden"\}/);
assert.match(recipe, /class="recipe-status"[^>]*aria-label="Recipe availability"/);
assert.match(recipe, /class="recipe-status-copy" role="status" aria-live="polite" aria-atomic="true"/);
assert.match(recipe, /id="cooking-safety-title">Cook safely with an adult<[\s\S]*?Check allergies first[\s\S]*?keep raw meat, fish, eggs,[\s\S]*?Recipe times are a guide/,
  "every recipe detail should carry concise child-focused allergy and cross-contamination guidance");
assert.match(recipe, /function recipePhotoSourcesHtml\(\)[\s\S]*?External food photos are off in this public demo[\s\S]*?TheMealDB[\s\S]*?Wikimedia Commons/,
  "photo providers and the demo's network-free initials behavior should be disclosed truthfully");
assert.match(recipe, /html\.theme-night \.cooking-safety-note[\s\S]*?html\.theme-night \.recipe-photo-sources/,
  "new safety and attribution copy should remain readable in night mode");
assert.match(recipe, /<section id="recipe-list" aria-label="Recipes">/);
assert.match(recipe, /class="error-banner" role="alert"/);
assert.match(recipe, /osc\.addEventListener\("ended"[\s\S]*?gain\.disconnect/,
  "finished music notes should release their audio nodes");
assert.doesNotMatch(recipe, /recipe-cat-tag" style="[^"]*color:/,
  "category accent colours should not override readable tag text");
assert.match(recipe, /if \(!matchesCategory \|\| !q\) return matchesCategory;/,
  "an empty recipe search should not build search text for the full catalogue");
assert.match(recipe, /const RECIPE_CATEGORY_INITIAL_LIMIT = 24;/);
assert.match(recipe, /id="show-all-recipe-categories"/,
  "the large category collection should render incrementally");
assert.match(recipe, /#app\s*\{[\s\S]*?max-width:\s*1120px;/,
  "FlavorNest should use the available desktop width");
assert.match(recipe, /@media \(min-width:\s*860px\)[\s\S]*?#recipe-list\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/,
  "desktop recipe browsing should use a responsive two-column list");
assert.match(recipe, /class="category-scroll" id="recipe-category-options" role="radiogroup" aria-orientation="horizontal"[^>]*aria-describedby="recipe-category-filter-help"/,
  "recipe categories should expose radio-group keyboard semantics and instructions");
assert.match(recipe, /id="show-all-recipe-categories"[^>]*aria-controls="recipe-category-options"/,
  "the category expansion action should name the rail it changes");
assert.match(recipe, /data-category-index="\$\{index\}" role="radio" aria-checked="\$\{category === state\.selectedCategory\}"[\s\S]*?tabindex="\$\{category === state\.selectedCategory \? "0" : "-1"\}"/,
  "only the selected recipe category should be in the Tab order");
assert.match(recipe, /\.category-scroll::-webkit-scrollbar\s*\{\s*height:\s*10px;/,
  "the horizontal category rail should have a visible mouse scrollbar");
assert.doesNotMatch(recipe, /\.category-scroll::-webkit-scrollbar\s*\{[^}]*display:\s*none/,
  "the category scrollbar must not be hidden");
assert.match(recipe, /ArrowRight:\s*1,[\s\S]*?ArrowLeft:\s*-1,[\s\S]*?event\.key === "Home"[\s\S]*?event\.key === "End"/,
  "the category radio group should support arrow, Home, and End navigation");
assert.match(recipe, /(?:^|\n)\s*\.search-bar input\s*\{[^}]*\bfont-size:\s*16px\s*;/,
  "the recipe search field should remain readable and avoid browser focus zoom at every viewport width");
for (const selector of ["input, select, textarea", ".btn-primary", ".btn-secondary", ".btn-ghost", ".search-clear", ".category-chip", ".recipe-title", ".add-row-btn", ".global-home-link"]) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(recipe, new RegExp(`${escapedSelector}\\s*\\{[^}]*font-size:\\s*16px`),
    `${selector} should keep its primary interactive text at least 16px`);
}
assert.match(recipe, /@media \(max-width: 620px\)[\s\S]*?input, select, textarea, \.search-bar input \{ font-size: 16px; \}/,
  "small-screen recipe fields, including the more-specific search field, should not trigger iOS focus zoom");
assert.doesNotMatch(recipe, /font-size:\s*(?:10|11(?:\.5)?)px/,
  "visible FlavorNest helper and metadata text should never fall below 12px");
assert.doesNotMatch(recipe, /Math\.max\((?:10|11),\s*Math\.round\(sizePx\*0\.24\)\)/,
  "recipe placeholder initials should never fall below 12px");
assert.match(recipe, /const intrinsicSize = Math\.max\(1, Math\.round\(Number\(sizePx\) \|\| 1\)\);[\s\S]*?<img[^>]*width="\$\{intrinsicSize\}" height="\$\{intrinsicSize\}"/,
  "lazy recipe photos should reserve their circular layout space before loading");
assert.match(recipe, /async function canOpenKiddoSproutApp\(appId, appTitle, expectedOwnerId = ""\)[\s\S]*?validatedRecipeAccess\(expectedOwnerId\)/,
  "FlavorNest revalidation must stay bound to the owner who opened the page");
assert.match(recipe, /async function refreshRecipesWhenPageReturns\(\)[\s\S]*?revalidateConnectedRecipeAccess\(\)[\s\S]*?visibilitychange[\s\S]*?refreshRecipesWhenPageReturns\(\)[\s\S]*?pageshow[\s\S]*?refreshRecipesWhenPageReturns\(\)/,
  "FlavorNest should re-check the active child's app rule when a backgrounded or cached tab returns");
assert.match(recipe, /window\.addEventListener\("storage", handleRecipeSyncStorage\)/,
  "other tabs should be able to request an owner-scoped cloud refresh");
assert.match(recipe, /loadRecipes\(\{ silent: true, preserveFocus: true, keepExistingOnFailure: true \}\)/,
  "cross-tab refreshes should preserve focus and keep last-known recipes read-only on an outage");
assert.match(recipe, /function captureRecipeFocus\(\)[\s\S]*?selectionStart[\s\S]*?setSelectionRange/,
  "background recipe refreshes should restore the search caret as well as keyboard focus");
assert.match(recipe, /window\.sessionStorage\.setItem\(RECIPE_BROWSE_STATE_KEY[\s\S]*?searchQuery[\s\S]*?selectedCategory[\s\S]*?visibleRecipeLimit/,
  "search, category, and paging state should survive same-tab reloads without entering persistent local storage");
assert.match(recipe, /action: "recipe_auth"[\s\S]*?theme: document\.documentElement\.classList\.contains\("theme-night"\) \? "dark" : "light"/,
  "the FlavorNest safety check should remain readable in both day and night themes");
assert.match(recipe, /revalidateConnectedRecipeAccess[\s\S]*?recipeAccessChecking = true;[\s\S]*?closeRecipeDeleteDialog\(\);[\s\S]*?render\(\);[\s\S]*?canOpenKiddoSproutApp/,
  "a returning FlavorNest tab should hide interactive family content while its current rule is checked");
assert.match(recipe, /recipeLoadRevision \+= 1;[\s\S]*?recipeMutationRevision \+= 1;[\s\S]*?state\.cloudRecipes = \[\];[\s\S]*?state\.recipes = \[\];/,
  "revoked FlavorNest access must invalidate pending work and discard family-only recipes");
assert.match(recipe, /recipeDeleteReturnFocus\?\.isConnected[\s\S]*?getElementById\(recipeDeleteReturnFocusId\)[\s\S]*?querySelector\("\.detail-title"\)/,
  "closing the delete dialog should restore focus even after an error re-renders its original button");

console.log("Recipe and Smart Spending quality checks passed.");
