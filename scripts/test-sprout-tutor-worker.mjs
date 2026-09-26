import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";

const ROOT = new URL("../", import.meta.url);
const WORKER_URL = new URL("src/sprout-tutor-worker.mjs", ROOT);
const SESSION_ID = "8f14e45f-ea7a-4d21-9f65-8a9f1c2b3d4e";
const SECOND_SESSION_ID = "64e7b494-10ee-4c64-a891-5b4df03555a2";
const OWNER_ID = "4ba0b28b-1f12-4c2a-932b-7d9eca9229a4";
const OTHER_OWNER_ID = "b36a73b2-d53e-4783-9b3a-98f7bc797d32";
const CHILD_ID = "learner-one";
const CHILD_KEY = createHash("sha256").update(`${OWNER_ID}\0${CHILD_ID}`).digest("hex");
const OTHER_CHILD_KEY = "b".repeat(64);
const ENDPOINT = `https://tutor.example/agents/sprout-tutor-agent/${SESSION_ID}`;
const SECOND_ENDPOINT = `https://tutor.example/agents/sprout-tutor-agent/${SECOND_SESSION_ID}`;
const HEALTH_ENDPOINT = "https://tutor.example/api/sprout-tutor/health";
const GITHUB_ORIGIN = "https://hammy-boy.github.io";
const ACCOUNT_ORIGIN = "https://families.kiddosprout.example";
const BROWSER_CONFIG_ENDPOINT = `${ACCOUNT_ORIGIN}/supabase-config.js?v=7`;
const SUPABASE_URL = "https://kiddosprouttest.supabase.co";
const SUPABASE_KEY = "sb_publishable_12345678901234567890";
const TURNSTILE_SITE_KEY = "0x4AAAAAAAKiddoSproutProductionKey";
const AUTH_TOKEN = "parent-access-token";
const TUTOR_MODEL = "@cf/zai-org/glm-4.7-flash";
const SAFETY_MODEL = "@cf/meta/llama-guard-3-8b";
const RETENTION_SECONDS = 24 * 60 * 60;

const [source, wranglerText, packageText, lockText, agentsPackageText] = await Promise.all([
  readFile(WORKER_URL, "utf8"),
  readFile(new URL("wrangler.jsonc", ROOT), "utf8"),
  readFile(new URL("package.json", ROOT), "utf8"),
  readFile(new URL("package-lock.json", ROOT), "utf8"),
  readFile(new URL("node_modules/agents/package.json", ROOT), "utf8")
]);

const bundled = await build({
  entryPoints: [WORKER_URL.pathname],
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  write: false,
  logLevel: "silent",
  plugins: [{
    name: "mock-cloudflare-agents",
    setup(builder) {
      builder.onResolve({ filter: /^agents$/ }, () => ({ path: "agents", namespace: "sprout-test" }));
      builder.onLoad({ filter: /.*/, namespace: "sprout-test" }, () => ({
        loader: "js",
        contents: `
          export class Agent {
            constructor(ctx, env) {
              this.ctx = ctx;
              this.env = env;
              this.state = undefined;
              this.__scheduled = [];
              this.__cancelledSchedules = [];
              this.__destroyed = false;
              this.__nextScheduleId = 1;
            }
            setState(nextState) {
              if (typeof this.validateStateChange === "function") {
                this.validateStateChange(nextState, "server");
              }
              this.state = structuredClone(nextState);
            }
            async schedule(delay, callback, payload, options) {
              const scheduled = {
                id: "schedule-" + this.__nextScheduleId++,
                delay,
                callback,
                payload: structuredClone(payload),
                options: options === undefined ? undefined : structuredClone(options)
              };
              this.__scheduled.push(scheduled);
              return scheduled;
            }
            async cancelSchedule(id) {
              this.__cancelledSchedules.push(id);
              return true;
            }
            async destroy() {
              this.__destroyed = true;
              this.state = undefined;
              this.__scheduled = [];
            }
          }
          export async function routeAgentRequest(request, env) {
            return typeof env.__routeAgentRequest === "function"
              ? env.__routeAgentRequest(request)
              : null;
          }
        `
      }));
    }
  }]
});

const workerModule = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`
);
const { SproutTutorAgent } = workerModule;
const worker = workerModule.default;

function tutorRequest(body, options = {}) {
  const headers = new Headers(options.headers);
  if (!headers.has("Origin") && options.origin !== null) {
    headers.set("Origin", options.origin ?? GITHUB_ORIGIN);
  }
  if (!headers.has("Content-Type") && options.contentType !== null) {
    headers.set("Content-Type", options.contentType ?? "application/json");
  }
  if (options.verified !== false) {
    if (!headers.has("X-KiddoSprout-Verified-Owner")) {
      headers.set("X-KiddoSprout-Verified-Owner", options.ownerId ?? OWNER_ID);
    }
    if (!headers.has("X-KiddoSprout-Verified-Child")) {
      headers.set("X-KiddoSprout-Verified-Child", options.childKey ?? CHILD_KEY);
    }
  }
  return new Request(options.url ?? ENDPOINT, {
    method: options.method ?? "POST",
    headers,
    body: body === undefined ? undefined : (typeof body === "string" ? body : JSON.stringify(body))
  });
}

function makeAiRun(options = {}) {
  const safetyVerdicts = options.safetyVerdicts ?? ["safe", "safe"];
  const tutorReply = options.tutorReply ?? "Good thinking. What is 2 + 3?";
  let safetyIndex = 0;
  const calls = [];
  const run = async (model, input) => {
    calls.push({ model, input });
    if (model === SAFETY_MODEL) {
      const verdict = safetyVerdicts[Math.min(safetyIndex, safetyVerdicts.length - 1)] ?? "unsafe";
      safetyIndex += 1;
      if (typeof options.onSafety === "function") return options.onSafety(input, verdict, safetyIndex);
      return { response: verdict };
    }
    if (model === TUTOR_MODEL) {
      if (typeof options.onTutor === "function") return options.onTutor(input);
      return { choices: [{ message: { content: tutorReply } }] };
    }
    throw new Error(`Unexpected model: ${model}`);
  };
  run.calls = calls;
  return run;
}

function makeAgent(run = makeAiRun()) {
  const agent = new SproutTutorAgent({}, { AI: { run } });
  agent.state = structuredClone(agent.initialState);
  return agent;
}

function jsonUpstream(payload, status = 200, headers = undefined) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

function approvedFamilyState(rule = "allowed", childId = CHILD_ID) {
  return {
    parentAccountCreated: true,
    activeChild: childId,
    children: {
      [childId]: {
        appRules: { sproutTutor: rule }
      }
    }
  };
}

function makeSupabaseFetch(options = {}) {
  const ownerId = options.ownerId ?? OWNER_ID;
  const familyState = options.familyState ?? approvedFamilyState();
  const calls = [];
  const mock = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    calls.push({ url, init, headers: new Headers(init.headers) });
    if (url.pathname === "/auth/v1/user") {
      return jsonUpstream(options.authPayload ?? {
        id: ownerId,
        email: "parent@example.test",
        is_anonymous: false
      }, options.authStatus ?? 200);
    }
    if (url.pathname === "/rest/v1/family_state") {
      return jsonUpstream(options.familyPayload ?? [{
        owner_id: ownerId,
        state: familyState
      }], options.familyStatus ?? 200);
    }
    throw new Error(`Unexpected Supabase request: ${url.href}`);
  };
  mock.calls = calls;
  return mock;
}

function makeWorkerEnv(overrides = {}) {
  return {
    KIDDOSPROUT_ACCOUNT_MODE: "true",
    KIDDOSPROUT_ACCOUNT_ORIGIN: ACCOUNT_ORIGIN,
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: SUPABASE_KEY,
    TURNSTILE_SITE_KEY,
    AUTH_EMAIL_DELIVERY_READY: "true",
    GOOGLE_AUTH_READY: "false",
    AI: { run: makeAiRun() },
    SproutTutorAgent: {},
    TUTOR_RATE_LIMITER: { limit: async () => ({ success: true }) },
    ASSETS: { fetch: async () => new Response("asset") },
    __routeAgentRequest: async () => jsonUpstream({ routed: true }),
    ...overrides
  };
}

async function withMockedFetch(mock, callback) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function bodyOf(response) {
  return response.json();
}

async function browserConfigOf(response) {
  const context = { window: {}, Object };
  runInNewContext(await response.text(), context);
  return JSON.parse(JSON.stringify(context.window.KIDDO_SPROUT_SUPABASE));
}

test("Worker bundles and runs both safety boundaries around the current tutor model", async () => {
  const run = makeAiRun({
    tutorReply: "Nice start. What is two plus three? Can you also name an even number?"
  });
  const agent = makeAgent(run);
  const response = await agent.onRequest(tutorRequest({
    message: "Please help me add two and three.",
    subject: "maths",
    stage: "sprouts"
  }));

  assert.equal(response.status, 200);
  const payload = await bodyOf(response);
  assert.equal((payload.reply.match(/\?/g) || []).length, 1,
    "A tutor response must contain at most one question mark.");
  assert.deepEqual(run.calls.map(({ model }) => model), [SAFETY_MODEL, TUTOR_MODEL, SAFETY_MODEL]);

  const tutorCall = run.calls[1];
  assert.equal(tutorCall.input.store, false);
  assert.equal(tutorCall.input.chat_template_kwargs.enable_thinking, false);
  assert.equal(tutorCall.input.max_completion_tokens, 256);
  assert.deepEqual(tutorCall.input.messages.at(-1), {
    role: "user",
    content: "Please help me add two and three."
  });
  const systemPrompt = tutorCall.input.messages[0].content;
  assert.match(systemPrompt, /Teach only Maths at the Sprouts \(ages 5–7\)/);
  assert.match(systemPrompt, /at most ONE short learning question/);
  assert.match(systemPrompt, /Never ask for, repeat, infer, or store a child's real name/);
  assert.match(systemPrompt, /self-harm, abuse, danger/);

  assert.equal(agent.state.ownerId, OWNER_ID);
  assert.equal(agent.state.childKey, CHILD_KEY);
  assert.equal(agent.state.turns.length, 2);
  assert.equal(agent.state.activeRequestId, null);
  assert.equal(agent.__scheduled.length, 1);
  assert.equal(agent.__scheduled[0].delay, RETENTION_SECONDS);
  assert.equal(agent.__scheduled[0].callback, "expireConversation");
  assert.deepEqual(agent.__scheduled[0].payload, { lastActivityAt: agent.state.lastActivityAt });
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), GITHUB_ORIGIN);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("direct Agent routes require trusted parent and approved-child identity", async () => {
  const body = { message: "Help with nouns.", subject: "english", stage: "growers" };

  const noOrigin = await makeAgent().onRequest(tutorRequest(body, { origin: null }));
  assert.equal(noOrigin.status, 403);

  const noOwner = await makeAgent().onRequest(tutorRequest(body, {
    verified: false,
    headers: { "X-KiddoSprout-Verified-Child": CHILD_KEY }
  }));
  assert.equal(noOwner.status, 401);

  const noChild = await makeAgent().onRequest(tutorRequest(body, {
    verified: false,
    headers: { "X-KiddoSprout-Verified-Owner": OWNER_ID }
  }));
  assert.equal(noChild.status, 401);

  const agent = makeAgent();
  assert.equal((await agent.onRequest(tutorRequest(body))).status, 200);
  const siblingDelete = await agent.onRequest(tutorRequest(undefined, {
    method: "DELETE",
    childKey: OTHER_CHILD_KEY
  }));
  assert.equal(siblingDelete.status, 403);
  assert.match((await bodyOf(siblingDelete)).error, /different approved child/i);
  assert.equal(agent.__destroyed, false);
  assert.equal(agent.state.childKey, CHILD_KEY);
  assert.equal(agent.state.turns.length, 2);
});

test("subject, stage, shape, content type, and message bounds are exact", async () => {
  for (const [field, value] of [
    ["subject", "Maths"],
    ["subject", "history"],
    ["stage", "Sprouts"],
    ["stage", "seedlings"]
  ]) {
    const agent = makeAgent();
    const body = { message: "Help me learn.", subject: "maths", stage: "sprouts" };
    body[field] = value;
    const response = await agent.onRequest(tutorRequest(body));
    assert.equal(response.status, 400, `${field}=${value} must be rejected`);
  }

  const extraField = await makeAgent().onRequest(tutorRequest({
    message: "Help me learn.", subject: "maths", stage: "sprouts", childName: "No"
  }));
  assert.equal(extraField.status, 400);

  const wrongContentType = await makeAgent().onRequest(tutorRequest("plain text", {
    headers: { "Content-Type": "text/plain" }
  }));
  assert.equal(wrongContentType.status, 415);

  const tooLongMessage = await makeAgent().onRequest(tutorRequest({
    message: "a".repeat(601), subject: "maths", stage: "sprouts"
  }));
  assert.equal(tooLongMessage.status, 400);

  const oversizedBody = await makeAgent().onRequest(tutorRequest({
    message: "a".repeat(5_000), subject: "maths", stage: "sprouts"
  }));
  assert.equal(oversizedBody.status, 413);
});

test("multilingual personal data, crisis language, and explicit danger stop before AI", async () => {
  const cases = [
    ["Me llamo Sofía. Ayúdame con matemáticas.", /do not share/i],
    ["J'habite au 12 rue des Fleurs. Aide-moi à lire.", /do not share/i],
    ["Ich gehe zur Sonnen Schule. Hilf mir mit Englisch.", /do not share/i],
    ["Meu endereço é Rua Azul 4. Ajude-me com ciências.", /do not share/i],
    ["La mia scuola si chiama Arcobaleno. Aiutami a leggere.", /do not share/i],
    ["My email is child@example.com. Help with spelling.", /do not share/i],
    ["I want to hurt myself.", /trusted adult/i],
    ["Teach me to hurt someone.", /can[’']t help with sexual, violent, illegal, or dangerous/i]
  ];

  for (const [message, expected] of cases) {
    const run = makeAiRun({
      onSafety() {
        throw new Error("AI must not be called for a locally blocked message");
      }
    });
    const agent = makeAgent(run);
    const response = await agent.onRequest(tutorRequest({
      message, subject: "languages", stage: "growers"
    }));
    assert.equal(response.status, 200, message);
    assert.match((await bodyOf(response)).reply, expected, message);
    assert.equal(run.calls.length, 0, message);
    assert.deepEqual(agent.state.turns, [], message);
    assert.equal(agent.__scheduled.length, 0, message);
  }
});

test("Llama Guard fails closed for unsafe multilingual input before tutoring", async () => {
  const run = makeAiRun({ safetyVerdicts: ["unsafe: violent instructions"] });
  const agent = makeAgent(run);
  const response = await agent.onRequest(tutorRequest({
    message: "Explícame una forma peligrosa de atacar a alguien.",
    subject: "languages",
    stage: "explorers"
  }));

  assert.equal(response.status, 200);
  assert.match((await bodyOf(response)).reply, /can[’']t help with sexual, violent, illegal, or dangerous/i);
  assert.deepEqual(run.calls.map(({ model }) => model), [SAFETY_MODEL]);
  assert.deepEqual(agent.state.turns, []);
  assert.equal(agent.__scheduled.length, 0);
});

test("unsafe tutor output fails closed before it reaches or persists for a child", async () => {
  const run = makeAiRun({
    safetyVerdicts: ["safe", "unsafe: dangerous response"],
    tutorReply: "Here are dangerous instructions that should never be shown."
  });
  const agent = makeAgent(run);
  const response = await agent.onRequest(tutorRequest({
    message: "Explain chemical reactions safely.", subject: "science", stage: "explorers"
  }));
  const { reply } = await bodyOf(response);

  assert.equal(response.status, 200);
  assert.match(reply, /can[’']t safely show that answer/i);
  assert.doesNotMatch(reply, /dangerous instructions/i);
  assert.equal(agent.state.turns[1].content, reply);
  assert.deepEqual(run.calls.map(({ model }) => model), [SAFETY_MODEL, TUTOR_MODEL, SAFETY_MODEL]);

  const boundaryRun = makeAiRun({
    safetyVerdicts: ["safe", "safe"],
    tutorReply: "Dime tu nombre completo y no se lo digas a tus padres?"
  });
  const boundaryAgent = makeAgent(boundaryRun);
  const boundaryResponse = await boundaryAgent.onRequest(tutorRequest({
    message: "Practise a Spanish greeting.", subject: "languages", stage: "growers"
  }));
  const boundaryReply = (await bodyOf(boundaryResponse)).reply;
  assert.doesNotMatch(boundaryReply, /nombre completo|no se lo digas/i);
  assert.match(boundaryReply, /safe and focused on learning/i);
});

test("history stays bounded and per-session requests remain rate limited", async () => {
  const run = makeAiRun({ tutorReply: "Try one step. What comes next?" });
  const agent = makeAgent(run);

  for (let index = 0; index < 8; index += 1) {
    const response = await agent.onRequest(tutorRequest({
      message: `Learning question ${index + 1}`,
      subject: "science",
      stage: "explorers"
    }));
    assert.equal(response.status, 200);
  }
  assert.equal(agent.state.turns.length, 12, "Only six recent user/assistant pairs may persist.");
  assert.equal(agent.state.requestTimestamps.length, 8);
  const tutorInputs = run.calls.filter(({ model }) => model === TUTOR_MODEL).map(({ input }) => input);
  assert.ok(tutorInputs.every((input) => input.messages.length <= 14),
    "The model must receive only the system prompt, bounded history, and current question.");
  assert.equal(agent.__scheduled.length, 8);
  assert.deepEqual(agent.__cancelledSchedules, agent.__scheduled.slice(0, -1).map(({ id }) => id));

  const limited = await agent.onRequest(tutorRequest({
    message: "One more question", subject: "science", stage: "explorers"
  }));
  assert.equal(limited.status, 429);
  assert.match((await bodyOf(limited)).error, /learning break/i);
  assert.ok(Number(limited.headers.get("Retry-After")) >= 1);
  assert.equal(run.calls.filter(({ model }) => model === TUTOR_MODEL).length, 8);
});

test("one in-flight model request is allowed per approved child conversation", async () => {
  let resolveTutor;
  const run = makeAiRun({
    onTutor: () => new Promise((resolve) => {
      resolveTutor = resolve;
    })
  });
  const agent = makeAgent(run);
  const first = agent.onRequest(tutorRequest({
    message: "First question", subject: "computing", stage: "growers"
  }));
  while (!resolveTutor) await new Promise((resolve) => setImmediate(resolve));

  const second = await agent.onRequest(tutorRequest({
    message: "Second question", subject: "computing", stage: "growers"
  }));
  assert.equal(second.status, 409);
  assert.match((await bodyOf(second)).error, /current reply/i);

  resolveTutor({ choices: [{ message: { content: "A bit is a binary digit. Is 1 a bit?" } }] });
  assert.equal((await first).status, 200);
  assert.equal(agent.state.turns.length, 2);
});

test("DELETE destroys the Agent so no conversation identity or content remains", async () => {
  const agent = makeAgent();
  await agent.onRequest(tutorRequest({
    message: "What is a noun?", subject: "english", stage: "sprouts"
  }));
  assert.equal(agent.state.turns.length, 2);
  assert.equal(agent.__scheduled.length, 1);

  const response = await agent.onRequest(tutorRequest(undefined, { method: "DELETE" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await bodyOf(response), { cleared: true });
  assert.equal(agent.__destroyed, true);
  assert.equal(agent.state, undefined, "Destroy must remove the saved owner, child key, and transcript.");
  assert.deepEqual(agent.__scheduled, [], "Destroy must remove the retention schedule with the Agent.");
  assert.deepEqual(agent.__cancelledSchedules, [], "DELETE must not leave an Agent solely to track cancellations.");
});

test("DELETE reports failure instead of claiming a conversation was cleared", async () => {
  const agent = makeAgent();
  await agent.onRequest(tutorRequest({
    message: "Help me practise verbs.", subject: "english", stage: "growers"
  }));
  agent.destroy = async () => {
    throw new Error("storage unavailable");
  };

  const response = await agent.onRequest(tutorRequest(undefined, { method: "DELETE" }));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Retry-After"), "5");
  assert.match((await bodyOf(response)).error, /could not be cleared/i);
  assert.equal(agent.__destroyed, false);
  assert.equal(agent.state.ownerId, OWNER_ID);
  assert.equal(agent.state.childKey, CHILD_KEY);
  assert.equal(agent.state.turns.length, 2);
});

test("conversation cleanup is scheduled for 24 hours and destroys only the matching stale chat", async () => {
  const originalNow = Date.now;
  const startedAt = 2_000_000_000_000;
  let now = startedAt;
  Date.now = () => now;
  try {
    const agent = makeAgent();
    const response = await agent.onRequest(tutorRequest({
      message: "Teach me about planets.", subject: "science", stage: "growers"
    }));
    assert.equal(response.status, 200);
    const firstSchedule = agent.__scheduled[0];
    assert.equal(firstSchedule.delay, RETENTION_SECONDS);
    assert.equal(firstSchedule.callback, "expireConversation");
    assert.deepEqual(firstSchedule.payload, { lastActivityAt: startedAt });

    now += 12 * 60 * 60 * 1_000;
    await agent.expireConversation(firstSchedule.payload);
    assert.equal(agent.__destroyed, false);
    assert.equal(agent.__scheduled[1].delay, 12 * 60 * 60);
    assert.deepEqual(agent.__scheduled[1].options, { idempotent: true });

    await agent.expireConversation({ lastActivityAt: startedAt - 1 });
    assert.equal(agent.__destroyed, false, "A stale cleanup callback must not destroy a newer chat.");

    now = startedAt + (RETENTION_SECONDS * 1_000);
    await agent.expireConversation(firstSchedule.payload);
    assert.equal(agent.__destroyed, true);
  } finally {
    Date.now = originalNow;
  }
});

test("AI failures never log a child prompt", async () => {
  const privatePrompt = "private-child-prompt-should-never-appear";
  const logged = [];
  const originalError = console.error;
  console.error = (...values) => logged.push(values.join(" "));
  try {
    const run = makeAiRun({
      onTutor() {
        throw new Error(privatePrompt);
      }
    });
    const agent = makeAgent(run);
    const response = await agent.onRequest(tutorRequest({
      message: privatePrompt, subject: "english", stage: "explorers"
    }));
    assert.equal(response.status, 503);
  } finally {
    console.error = originalError;
  }
  assert.equal(logged.length, 1);
  assert.equal(logged.some((line) => line.includes(privatePrompt)), false);
  assert.match(logged[0], /sprout_tutor_ai_failed/);
});

test("top-level routing verifies Supabase approval and replaces spoofed internal identity", async () => {
  const supabaseFetch = makeSupabaseFetch();
  const routed = [];
  const limiterKeys = [];
  const env = makeWorkerEnv({
    __routeAgentRequest: async (request) => {
      routed.push(request);
      return jsonUpstream({ routed: true });
    },
    TUTOR_RATE_LIMITER: {
      async limit(input) {
        limiterKeys.push(input.key);
        return { success: true };
      }
    }
  });

  const response = await withMockedFetch(supabaseFetch, () => worker.fetch(tutorRequest({
    message: "Help with fractions.", subject: "maths", stage: "explorers"
  }, {
    verified: false,
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "X-KiddoSprout-Verified-Owner": OTHER_OWNER_ID,
      "X-KiddoSprout-Verified-Child": OTHER_CHILD_KEY
    }
  }), env));

  assert.equal(response.status, 200);
  assert.deepEqual(await bodyOf(response), { routed: true });
  assert.equal(supabaseFetch.calls.length, 2);
  for (const call of supabaseFetch.calls) {
    assert.equal(call.headers.get("apikey"), SUPABASE_KEY);
    assert.equal(call.headers.get("Authorization"), `Bearer ${AUTH_TOKEN}`);
    assert.equal(call.init.redirect, "error");
  }
  assert.equal(supabaseFetch.calls[0].url.pathname, "/auth/v1/user");
  assert.equal(supabaseFetch.calls[1].url.pathname, "/rest/v1/family_state");
  assert.equal(supabaseFetch.calls[1].url.searchParams.get("owner_id"), `eq.${OWNER_ID}`);
  assert.deepEqual(limiterKeys, [`parent:${OWNER_ID}`]);

  assert.equal(routed.length, 1);
  assert.equal(routed[0].headers.has("Authorization"), false);
  assert.equal(routed[0].headers.get("X-KiddoSprout-Verified-Owner"), OWNER_ID);
  assert.equal(routed[0].headers.get("X-KiddoSprout-Verified-Child"), CHILD_KEY);
  assert.equal(routed[0].headers.get("Origin"), GITHUB_ORIGIN);
});

test("top-level routing rejects an active child without explicit Sprout Tutor approval", async () => {
  const supabaseFetch = makeSupabaseFetch({ familyState: approvedFamilyState("request") });
  let routed = 0;
  let limited = 0;
  const env = makeWorkerEnv({
    __routeAgentRequest: async () => {
      routed += 1;
      return jsonUpstream({ routed: true });
    },
    TUTOR_RATE_LIMITER: {
      async limit() {
        limited += 1;
        return { success: true };
      }
    }
  });
  const response = await withMockedFetch(supabaseFetch, () => worker.fetch(tutorRequest({
    message: "Help me learn.", subject: "maths", stage: "sprouts"
  }, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
  }), env));

  assert.equal(response.status, 403);
  assert.match((await bodyOf(response)).error, /parent must approve/i);
  assert.equal(routed, 0);
  assert.equal(limited, 0);
});

test("account rate limiting cannot be reset by changing the chat UUID", async () => {
  const supabaseFetch = makeSupabaseFetch();
  const limiterKeys = [];
  let routed = 0;
  const env = makeWorkerEnv({
    __routeAgentRequest: async () => {
      routed += 1;
      return jsonUpstream({ routed: true });
    },
    TUTOR_RATE_LIMITER: {
      async limit({ key }) {
        limiterKeys.push(key);
        return { success: limiterKeys.length === 1 };
      }
    }
  });

  await withMockedFetch(supabaseFetch, async () => {
    const first = await worker.fetch(tutorRequest({
      message: "First question", subject: "maths", stage: "sprouts"
    }, {
      url: ENDPOINT,
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    }), env);
    assert.equal(first.status, 200);

    const changedSession = await worker.fetch(tutorRequest({
      message: "Second question", subject: "maths", stage: "sprouts"
    }, {
      url: SECOND_ENDPOINT,
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    }), env);
    assert.equal(changedSession.status, 429);
    assert.equal(changedSession.headers.get("Retry-After"), "60");
    assert.match((await bodyOf(changedSession)).error, /learning break/i);
  });

  assert.deepEqual(limiterKeys, [`parent:${OWNER_ID}`, `parent:${OWNER_ID}`]);
  assert.equal(routed, 1);
  assert.equal(supabaseFetch.calls.length, 4, "Both chat IDs must still verify the parent and approval.");
});

test("browser account configuration is live only for a complete exact-origin account deployment", async () => {
  let assetRequests = 0;
  const liveEnv = makeWorkerEnv({
    ASSETS: {
      async fetch() {
        assetRequests += 1;
        return new Response("asset");
      }
    }
  });
  const liveResponse = await worker.fetch(new Request(BROWSER_CONFIG_ENDPOINT), liveEnv);
  assert.equal(liveResponse.status, 200);
  assert.equal(liveResponse.headers.get("Content-Type"), "application/javascript; charset=utf-8");
  assert.equal(liveResponse.headers.get("X-Content-Type-Options"), "nosniff");
  assert.match(liveResponse.headers.get("Cache-Control") || "", /no-store/);
  assert.deepEqual(await browserConfigOf(liveResponse), {
    publicDemoOnly: false,
    url: SUPABASE_URL,
    publishableKey: SUPABASE_KEY,
    turnstileSiteKey: TURNSTILE_SITE_KEY,
    emailDeliveryReady: true,
    googleAuthReady: false
  });
  assert.equal(assetRequests, 0, "The versioned browser config must run through the Worker, not static assets.");

  const wrongHost = await worker.fetch(
    new Request("https://tutor.example/supabase-config.js?v=7"),
    liveEnv
  );
  assert.deepEqual(await browserConfigOf(wrongHost), { publicDemoOnly: true },
    "Live browser settings must be emitted only on the exact configured account origin.");

  const failClosedCases = [
    ["account mode missing", { KIDDOSPROUT_ACCOUNT_MODE: undefined }],
    ["account mode is not exact", { KIDDOSPROUT_ACCOUNT_MODE: "TRUE" }],
    ["account origin missing", { KIDDOSPROUT_ACCOUNT_ORIGIN: undefined }],
    ["account origin has a trailing slash", { KIDDOSPROUT_ACCOUNT_ORIGIN: `${ACCOUNT_ORIGIN}/` }],
    ["account origin is not HTTPS", { KIDDOSPROUT_ACCOUNT_ORIGIN: ACCOUNT_ORIGIN.replace("https:", "http:") }],
    ["Turnstile uses an official test key", { TURNSTILE_SITE_KEY: "1x00000000000000000000AA" }],
    ["publishable key missing", { SUPABASE_PUBLISHABLE_KEY: undefined }]
  ];
  for (const [label, overrides] of failClosedCases) {
    const response = await worker.fetch(
      new Request(BROWSER_CONFIG_ENDPOINT),
      makeWorkerEnv(overrides)
    );
    assert.equal(response.status, 200, label);
    assert.deepEqual(await browserConfigOf(response), { publicDemoOnly: true }, label);
  }

  const wrongMethod = await worker.fetch(new Request(BROWSER_CONFIG_ENDPOINT, {
    method: "POST"
  }), liveEnv);
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get("Allow"), "GET");
});

test("health endpoint reports readiness without waking an Agent or requiring a session", async () => {
  let routed = 0;
  const env = makeWorkerEnv({
    __routeAgentRequest: async () => {
      routed += 1;
      return jsonUpstream({ routed: true });
    }
  });
  const ready = await worker.fetch(new Request(HEALTH_ENDPOINT, {
    headers: { Origin: GITHUB_ORIGIN }
  }), env);
  assert.equal(ready.status, 200);
  assert.deepEqual(await bodyOf(ready), {
    status: "ready",
    authentication: "parent-account",
    retentionHours: 24
  });
  assert.equal(ready.headers.get("Access-Control-Allow-Origin"), GITHUB_ORIGIN);
  assert.equal(ready.headers.get("Cache-Control"), "no-store");
  assert.equal(routed, 0);

  const accountOriginReady = await worker.fetch(new Request(HEALTH_ENDPOINT, {
    headers: { Origin: ACCOUNT_ORIGIN }
  }), env);
  assert.equal(accountOriginReady.status, 200);
  assert.equal(accountOriginReady.headers.get("Access-Control-Allow-Origin"), ACCOUNT_ORIGIN);

  const unavailable = await worker.fetch(new Request(HEALTH_ENDPOINT, {
    headers: { Origin: GITHUB_ORIGIN }
  }), makeWorkerEnv({ TUTOR_RATE_LIMITER: undefined }));
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get("Retry-After"), "30");

  const wrongMethod = await worker.fetch(new Request(HEALTH_ENDPOINT, {
    method: "POST",
    headers: { Origin: GITHUB_ORIGIN }
  }), env);
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get("Allow"), "GET, OPTIONS");
});

test("top-level routing has exact UUID-v4 paths and exact CORS including Authorization", async () => {
  let routed = 0;
  let assets = 0;
  const env = makeWorkerEnv({
    __routeAgentRequest: async () => {
      routed += 1;
      return jsonUpstream({ routed: true });
    },
    ASSETS: {
      async fetch() {
        assets += 1;
        return new Response("asset");
      }
    }
  });

  const preflight = await worker.fetch(new Request(ENDPOINT, {
    method: "OPTIONS",
    headers: {
      Origin: GITHUB_ORIGIN,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization, content-type"
    }
  }), env);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), GITHUB_ORIGIN);
  assert.equal(preflight.headers.get("Access-Control-Allow-Headers"), "Authorization, Content-Type");
  assert.equal(preflight.headers.get("Access-Control-Allow-Methods"), "GET, POST, DELETE, OPTIONS");
  assert.equal(preflight.headers.get("Access-Control-Max-Age"), "600");
  assert.equal(preflight.headers.has("Access-Control-Allow-Credentials"), false);
  assert.equal(routed, 0, "Preflight should not create or wake an Agent instance.");

  const forbiddenHeader = await worker.fetch(new Request(ENDPOINT, {
    method: "OPTIONS",
    headers: {
      Origin: GITHUB_ORIGIN,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization, x-kiddosprout-verified-owner"
    }
  }), env);
  assert.equal(forbiddenHeader.status, 400);

  for (const origin of [
    "https://tutor.example",
    GITHUB_ORIGIN,
    ACCOUNT_ORIGIN,
    "http://localhost:4173",
    "http://127.0.0.1:8787",
    "http://[::1]:3000"
  ]) {
    const response = await worker.fetch(new Request(ENDPOINT, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization, content-type"
      }
    }), env);
    assert.equal(response.status, 204, `${origin} should be allowed`);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  }

  for (const origin of [
    "https://example.com",
    "http://localhost.evil.example",
    "null",
    `${GITHUB_ORIGIN}/`,
    `${ACCOUNT_ORIGIN}/`,
    ACCOUNT_ORIGIN.replace("https:", "http:"),
    `${ACCOUNT_ORIGIN}.evil.example`
  ]) {
    const response = await worker.fetch(new Request(ENDPOINT, {
      method: "OPTIONS",
      headers: { Origin: origin, "Access-Control-Request-Method": "POST" }
    }), env);
    assert.equal(response.status, 403, `${origin} should be rejected`);
    assert.equal(response.headers.has("Access-Control-Allow-Origin"), false);
  }

  const malformedSession = await worker.fetch(tutorRequest({
    message: "x", subject: "maths", stage: "sprouts"
  }, {
    url: "https://tutor.example/agents/sprout-tutor-agent/guessable-session"
  }), env);
  assert.equal(malformedSession.status, 404);

  const querySession = await worker.fetch(tutorRequest({
    message: "x", subject: "maths", stage: "sprouts"
  }, { url: `${ENDPOINT}?child=name` }), env);
  assert.equal(querySession.status, 404);

  const missingOrigin = await worker.fetch(tutorRequest({
    message: "x", subject: "maths", stage: "sprouts"
  }, { origin: null }), env);
  assert.equal(missingOrigin.status, 403);

  const asset = await worker.fetch(new Request("https://tutor.example/index.html"), env);
  assert.equal(await asset.text(), "asset");
  assert.equal(assets, 1);
});

test("Wrangler config and package lock declare the complete Cloudflare architecture", () => {
  const config = JSON.parse(wranglerText);
  const packageJson = JSON.parse(packageText);
  const lock = JSON.parse(lockText);
  const agentsPackage = JSON.parse(agentsPackageText);

  assert.equal(config.main, "src/sprout-tutor-worker.mjs");
  assert.equal(config.compatibility_date, "2026-09-26");
  assert.deepEqual(config.compatibility_flags, ["nodejs_compat"]);
  assert.deepEqual(config.ai, { binding: "AI" });
  assert.deepEqual(config.ratelimits, [{
    name: "TUTOR_RATE_LIMITER",
    namespace_id: "73026",
    simple: { limit: 8, period: 60 }
  }]);
  assert.deepEqual(config.durable_objects.bindings, [{
    name: "SproutTutorAgent",
    class_name: "SproutTutorAgent"
  }]);
  assert.deepEqual(config.migrations, [{ tag: "v1", new_sqlite_classes: ["SproutTutorAgent"] }]);
  assert.equal(config.assets.binding, "ASSETS");
  assert.deepEqual(config.assets.run_worker_first, [
    "/agents/*",
    "/api/sprout-tutor/*",
    "/supabase-config.js"
  ]);
  assert.equal(config.observability.enabled, true);
  assert.equal(config.observability.logs.enabled, true);
  assert.equal(config.observability.traces.enabled, true);

  assert.equal(packageJson.dependencies.agents, agentsPackage.version);
  assert.equal(lock.packages["node_modules/agents"].version, agentsPackage.version);
  assert.match(packageJson.scripts["test:sprout-tutor"], /test-sprout-tutor-worker\.mjs/);
});

test("source keeps secrets, child content, and unbounded parsing out of unsafe paths", () => {
  assert.doesNotMatch(source, /(?:SUPABASE_SERVICE_ROLE|RESEND_API_KEY|OPENAI_API_KEY)\s*[:=]\s*["'`][^"'`]+/);
  assert.doesNotMatch(source, /request\.(?:json|text|arrayBuffer)\s*\(/);
  assert.doesNotMatch(source, /console\.(?:log|debug|info|warn)\s*\(/);
  assert.doesNotMatch(source, /console\.error\([^\n]*(?:message|prompt|request\.body)/i);
  assert.doesNotMatch(source, /fetch\s*\(\s*["'`]https?:/);
  assert.match(source, /this\.env\.AI\.run\(MODEL/);
  assert.match(source, /ai\.run\(SAFETY_MODEL/);
  assert.match(source, /MAX_BODY_BYTES\s*=\s*4_096/);
  assert.match(source, /MAX_HISTORY_MESSAGES\s*=\s*12/);
  assert.match(source, /RATE_LIMIT_REQUESTS\s*=\s*8/);
  assert.match(source, /RETENTION_SECONDS\s*=\s*24 \* 60 \* 60/);
  assert.match(source, /headers\.delete\(VERIFIED_OWNER_HEADER\)/);
  assert.match(source, /headers\.delete\(VERIFIED_CHILD_HEADER\)/);
});
