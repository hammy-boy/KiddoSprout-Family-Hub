(function attachRecipeCloud(global) {
  "use strict";

  const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
  const MAX_RECIPE_ROWS = 500;
  const MODERN_PUBLISHABLE_KEY = /^sb_publishable_[A-Za-z0-9_-]{12,}$/;
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const MEANINGFUL_TEXT_PATTERN = /[\p{L}\p{N}\p{Extended_Pictographic}]/u;
  const FORBIDDEN_CONTROL_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
  const RECIPE_COLUMNS = "id,user_id,title,category,ingredients,steps,created_at";

  class RecipeCloudError extends Error {
    constructor(kind, message, options = {}) {
      super(message);
      this.name = "RecipeCloudError";
      this.kind = kind;
      this.code = String(options.code || "");
      this.status = Number(options.status || 0);
    }
  }

  function legacyKeyRole(value) {
    const parts = String(value || "").split(".");
    if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return "";
    if (typeof global.atob !== "function") return "";
    try {
      const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
        .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
      return String(JSON.parse(global.atob(payload))?.role || "").toLowerCase();
    } catch (error) {
      return "";
    }
  }

  function isBrowserSafePublishableKey(value) {
    const key = String(value || "").trim();
    return MODERN_PUBLISHABLE_KEY.test(key) || legacyKeyRole(key) === "anon";
  }

  function requireString(value, label, maximum) {
    if (typeof value !== "string") {
      throw new RecipeCloudError("validation", `${label} must be text.`);
    }
    const cleaned = value.trim();
    if (!cleaned) throw new RecipeCloudError("validation", `${label} is required.`);
    if (FORBIDDEN_CONTROL_PATTERN.test(cleaned) || !MEANINGFUL_TEXT_PATTERN.test(cleaned)) {
      throw new RecipeCloudError("validation", `${label} must contain readable text.`);
    }
    if (cleaned.length > maximum) {
      throw new RecipeCloudError("validation", `${label} must be ${maximum} characters or fewer.`);
    }
    return cleaned;
  }

  function requireUuid(value, label) {
    const cleaned = requireString(value, label, 64);
    if (!UUID_PATTERN.test(cleaned)) {
      throw new RecipeCloudError("validation", `${label} is not valid.`);
    }
    return cleaned.toLowerCase();
  }

  function requireItems(value, label, maximumLength, maximumBytes) {
    if (!Array.isArray(value)) {
      throw new RecipeCloudError("validation", `${label} must be a list.`);
    }
    if (value.some((item) => typeof item !== "string")) {
      throw new RecipeCloudError("validation", `${label} must contain text only.`);
    }
    const cleaned = value.map((item) => item.trim()).filter(Boolean);
    if (cleaned.length < 1 || cleaned.length > 100) {
      throw new RecipeCloudError("validation", `${label} must contain between 1 and 100 items.`);
    }
    if (cleaned.some((item) => item.length > maximumLength)) {
      throw new RecipeCloudError("validation", `${label} contains an item that is too long.`);
    }
    if (cleaned.some((item) => FORBIDDEN_CONTROL_PATTERN.test(item) || !MEANINGFUL_TEXT_PATTERN.test(item))) {
      throw new RecipeCloudError("validation", `${label} must contain readable text.`);
    }
    if (new TextEncoder().encode(cleaned.join("\n")).byteLength > maximumBytes) {
      throw new RecipeCloudError("validation", `${label} contains too much text.`);
    }
    return cleaned;
  }

  function normalizeRecipeInput(input) {
    const source = input && typeof input === "object" ? input : {};
    const category = source.category == null || (typeof source.category === "string" && !source.category.trim())
      ? "Other"
      : source.category;
    return {
      title: requireString(source.title, "Recipe name", 160),
      category: requireString(category, "Category", 80),
      ingredients: requireItems(source.ingredients, "Ingredients", 1000, 100000),
      steps: requireItems(source.steps, "Steps", 4000, 400000)
    };
  }

  function classifyHttpError(status, payload) {
    const code = String(payload && payload.code || "");
    const message = String(payload && (payload.message || payload.msg || payload.error) || "");
    const lower = message.toLowerCase();

    if (code === "PGRST205" || lower.includes("could not find the table") || lower.includes("schema cache")) {
      return new RecipeCloudError(
        "schema_missing",
        "Family recipe storage has not been installed yet.",
        { code, status }
      );
    }
    if (status === 401 || code === "PGRST301" || lower.includes("jwt expired")) {
      return new RecipeCloudError("auth", "Your recipe session is no longer valid.", { code, status });
    }
    if (status === 403 || code === "42501" || lower.includes("permission denied")) {
      return new RecipeCloudError("permission", "Family recipe storage permissions need attention.", { code, status });
    }
    if (status === 408 || status === 429 || status >= 500) {
      return new RecipeCloudError("unavailable", "Family recipe storage is temporarily unavailable.", { code, status });
    }
    return new RecipeCloudError("request", "The family recipe request could not be completed.", { code, status });
  }

  async function readBoundedText(response) {
    const reader = response.body && typeof response.body.getReader === "function"
      ? response.body.getReader()
      : null;
    if (!reader) {
      throw new RecipeCloudError("invalid_response", "This browser cannot read family recipe data safely.");
    }

    const chunks = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = value instanceof Uint8Array ? value : new Uint8Array(value || []);
        total += chunk.byteLength;
        if (total > MAX_RESPONSE_BYTES) {
          await reader.cancel("response-too-large").catch(() => {});
          throw new RecipeCloudError("invalid_response", "The family recipe response was too large.");
        }
        chunks.push(chunk);
      }
    } finally {
      try { reader.releaseLock(); } catch (error) {}
    }

    const combined = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(combined);
    } catch (error) {
      throw new RecipeCloudError("invalid_response", "Family recipe storage returned unreadable text.");
    }
  }

  async function readJsonResponse(response, allowEmpty = false) {
    const declaredLength = Number(response.headers && response.headers.get("content-length") || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
      if (response.body && typeof response.body.cancel === "function") {
        await response.body.cancel("response-too-large").catch(() => {});
      }
      throw new RecipeCloudError("invalid_response", "The family recipe response was too large.");
    }
    if (allowEmpty && response.status === 204) return null;
    const contentType = String(response.headers && response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("json")) {
      throw new RecipeCloudError("invalid_response", "Family recipe storage returned an unexpected response.");
    }
    const text = await readBoundedText(response);
    if (!text) {
      if (allowEmpty) return null;
      throw new RecipeCloudError("invalid_response", "Family recipe storage returned an empty response.");
    }
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new RecipeCloudError("invalid_response", "Family recipe storage returned unreadable data.");
    }
  }

  function normalizeRecipeRow(row, expectedUserId) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new RecipeCloudError("invalid_response", "Family recipe storage returned an invalid recipe.");
    }
    let userId;
    try {
      userId = requireUuid(row.user_id, "Recipe owner");
    } catch (error) {
      throw new RecipeCloudError("invalid_response", "Family recipe storage returned an invalid recipe owner.");
    }
    if (userId !== expectedUserId) {
      throw new RecipeCloudError("unsafe_response", "Family recipe storage returned another family's recipe.");
    }
    let recipe;
    let id;
    let createdAt;
    try {
      recipe = normalizeRecipeInput(row);
      id = requireUuid(row.id, "Recipe ID");
      createdAt = requireString(row.created_at, "Recipe date", 80);
    } catch (error) {
      throw new RecipeCloudError("invalid_response", "Family recipe storage returned malformed recipe data.");
    }
    return {
      id,
      user_id: userId,
      ...recipe,
      created_at: createdAt
    };
  }

  function createClient(options = {}) {
    const baseUrl = String(options.baseUrl || "").trim().replace(/\/+$/, "");
    const publishableKey = String(options.publishableKey || "").trim();
    const fetchImpl = options.fetchImpl || global.fetch;
    const configuredTimeoutMs = Number(options.timeoutMs);
    const timeoutMs = Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
      ? Math.min(configuredTimeoutMs, 60000)
      : 12000;
    const managedUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(baseUrl);
    const localUrl = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(baseUrl);

    if (!managedUrl && !localUrl) {
      throw new RecipeCloudError("configuration", "Family recipe storage URL is not configured safely.");
    }
    if (!publishableKey) {
      throw new RecipeCloudError("configuration", "Family recipe storage key is missing.");
    }
    if (!isBrowserSafePublishableKey(publishableKey)) {
      throw new RecipeCloudError(
        "configuration",
        "Family recipe storage requires a browser-safe publishable or legacy anon key."
      );
    }
    if (typeof fetchImpl !== "function") {
      throw new RecipeCloudError("configuration", "This browser cannot reach family recipe storage.");
    }

    async function request(path, options = {}) {
      const token = requireString(options.accessToken, "Recipe session", 20000);
      const headers = {
        apikey: publishableKey,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...options.headers
      };
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      const timeout = controller
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null;
      try {
        const response = await fetchImpl(`${baseUrl}/rest/v1/recipes${path}`, {
          method: options.method || "GET",
          headers,
          body: options.body,
          cache: "no-store",
          credentials: "omit",
          referrerPolicy: "no-referrer",
          signal: controller ? controller.signal : undefined
        });
        let payload;
        try {
          payload = await readJsonResponse(response, response.status === 204);
        } catch (error) {
          if (!response.ok && [401, 403, 408, 429].includes(response.status)) {
            throw classifyHttpError(response.status, {});
          }
          if (!response.ok && response.status >= 500) {
            throw classifyHttpError(response.status, {});
          }
          throw error;
        }
        if (!response.ok) throw classifyHttpError(response.status, payload);
        return payload;
      } catch (error) {
        if (error instanceof RecipeCloudError) throw error;
        const timedOut = error && error.name === "AbortError";
        throw new RecipeCloudError(
          timedOut ? "timeout" : "network",
          timedOut ? "Family recipe storage took too long to respond." : "Family recipe storage could not be reached."
        );
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    }

    async function list(accessToken, userId) {
      const ownerId = requireUuid(userId, "Recipe owner");
      const query = `?user_id=eq.${encodeURIComponent(ownerId)}&select=${encodeURIComponent(RECIPE_COLUMNS)}&order=title.asc&limit=${MAX_RECIPE_ROWS + 1}`;
      const payload = await request(query, { accessToken });
      if (!Array.isArray(payload) || payload.length > MAX_RECIPE_ROWS) {
        throw new RecipeCloudError("invalid_response", "Family recipe storage returned an invalid recipe list.");
      }
      const recipes = payload.map((row) => normalizeRecipeRow(row, ownerId));
      if (new Set(recipes.map((recipe) => recipe.id)).size !== recipes.length) {
        throw new RecipeCloudError("invalid_response", "Family recipe storage returned duplicate recipes.");
      }
      return recipes;
    }

    async function create(accessToken, userId, input) {
      const ownerId = requireUuid(userId, "Recipe owner");
      const recipe = normalizeRecipeInput(input);
      const payload = await request(`?select=${encodeURIComponent(RECIPE_COLUMNS)}`, {
        method: "POST",
        accessToken,
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify({ ...recipe, user_id: ownerId })
      });
      if (!Array.isArray(payload) || payload.length !== 1) {
        throw new RecipeCloudError("invalid_response", "Family recipe storage did not return the saved recipe.");
      }
      return normalizeRecipeRow(payload[0], ownerId);
    }

    async function update(accessToken, userId, recipeId, input) {
      const ownerId = requireUuid(userId, "Recipe owner");
      const id = requireUuid(recipeId, "Recipe ID");
      const recipe = normalizeRecipeInput(input);
      const query = `?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(ownerId)}&select=${encodeURIComponent(RECIPE_COLUMNS)}`;
      const payload = await request(query, {
        method: "PATCH",
        accessToken,
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation"
        },
        body: JSON.stringify(recipe)
      });
      if (!Array.isArray(payload) || payload.length === 0) {
        throw new RecipeCloudError("not_found", "That family recipe was not found or cannot be changed.");
      }
      if (payload.length !== 1) {
        throw new RecipeCloudError("invalid_response", "Family recipe storage changed an unexpected number of recipes.");
      }
      const updated = normalizeRecipeRow(payload[0], ownerId);
      if (updated.id !== id) {
        throw new RecipeCloudError("unsafe_response", "Family recipe storage returned the wrong changed recipe.");
      }
      return updated;
    }

    async function remove(accessToken, userId, recipeId) {
      const ownerId = requireUuid(userId, "Recipe owner");
      const id = requireUuid(recipeId, "Recipe ID");
      const query = `?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(ownerId)}&select=id,user_id,title,category,ingredients,steps,created_at`;
      const payload = await request(query, {
        method: "DELETE",
        accessToken,
        headers: { Prefer: "return=representation" }
      });
      if (!Array.isArray(payload) || payload.length === 0) {
        throw new RecipeCloudError("not_found", "That family recipe was not found or cannot be removed.");
      }
      if (payload.length !== 1) {
        throw new RecipeCloudError("invalid_response", "Family recipe storage removed an unexpected number of recipes.");
      }
      const removed = normalizeRecipeRow(payload[0], ownerId);
      if (removed.id !== id) {
        throw new RecipeCloudError("unsafe_response", "Family recipe storage returned the wrong removed recipe.");
      }
      return removed;
    }

    return Object.freeze({ list, create, update, remove });
  }

  global.KiddoSproutRecipeCloud = Object.freeze({
    RecipeCloudError,
    createClient,
    isBrowserSafePublishableKey,
    normalizeRecipeInput,
    constants: Object.freeze({ MAX_RECIPE_ROWS, MAX_RESPONSE_BYTES })
  });
})(typeof window === "object" ? window : globalThis);
