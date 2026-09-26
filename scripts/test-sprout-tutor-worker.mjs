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
const ACCOUNT_ORIGIN = "https://families.kiddosprout.example";
const BROWSER_CONFIG_ENDPOINT = `${ACCOUNT_ORIGIN}/supabase-config.js?v=7`;
const SUPABASE_URL = "https://kiddosprouttest.supabase.co";
const SUPABASE_KEY = "sb_publishable_12345678901234567890";
const TURNSTILE_SITE_KEY = "0x4AAAAAAAKiddoSproutProductionKey";
const AUTH_TOKEN = "parent-access-token";
const TUTOR_MODEL = "@cf/zai-org/glm-4.7-flash";
const SAFETY_MODEL = "@cf/meta/llama-guard-3-8b";
const RETENTION_SECONDS = 24 * 60 * 60;

const [source, wranglerText, packageText, lockText, agentsPackageText, approvalMigration] = await Promise.all([
  readFile(WORKER_URL, "utf8"),
  readFile(new URL("wrangler.jsonc", ROOT), "utf8"),
  readFile(new URL("package.json", ROOT), "utf8"),
  readFile(new URL("package-lock.json", ROOT), "utf8"),
  readFile(new URL("node_modules/agents/package.json", ROOT), "utf8"),
  readFile(new URL(
    "supabase/migrations/20260926161116_add_sprout_tutor_approval_rpc.sql",
    ROOT
  ), "utf8")
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
    headers.set("Origin", options.origin ?? ACCOUNT_ORIGIN);
  }
  if (!headers.has("Content-Type") && options.contentType !== null) {
    headers.set("Content-Type", options.contentType ?? "application/json");
  }
  if (options.expected !== false) {
    if (!headers.has("X-KiddoSprout-Expected-Owner")) {
      headers.set("X-KiddoSprout-Expected-Owner", options.expectedOwnerId ?? OWNER_ID);
    }
    if (!headers.has("X-KiddoSprout-Expected-Child")) {
      headers.set("X-KiddoSprout-Expected-Child", options.expectedChildId ?? CHILD_ID);
    }
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

function makeAgent(run = makeAiRun(), envOverrides = {}) {
  const agent = new SproutTutorAgent({}, {
    AI: { run },
    KIDDOSPROUT_ACCOUNT_ORIGIN: ACCOUNT_ORIGIN,
    TUTOR_RATE_LIMITER: { limit: async () => ({ success: true }) },
    ...envOverrides
  });
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

function makeSupabaseFetch(options = {}) {
  const ownerId = options.ownerId ?? OWNER_ID;
  const calls = [];
  const mock = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    const headers = new Headers(init.headers);
    calls.push({ url, init, headers });
    if (url.pathname === "/auth/v1/user") {
      return jsonUpstream(options.authPayload ?? {
        id: ownerId,
        email: "parent@example.test",
        email_confirmed_at: "2026-09-01T10:00:00.000Z",
        is_anonymous: false
      }, options.authStatus ?? 200);
    }
    if (url.pathname === "/rest/v1/rpc/sprout_tutor_active_child_approval") {
      if (!headers.has("Authorization")) {
        return jsonUpstream(options.readinessPayload ?? {
          code: "42501",
          message: "permission denied for function sprout_tutor_active_child_approval"
        }, options.readinessStatus ?? 401);
      }
      return jsonUpstream(options.approvalPayload ?? [{
        child_id: options.childId ?? CHILD_ID,
        approved: options.approved ?? true
      }], options.approvalStatus ?? 200);
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
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), ACCOUNT_ORIGIN);
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
  const changedChildDelete = await agent.onRequest(tutorRequest(undefined, {
    method: "DELETE",
    childKey: OTHER_CHILD_KEY
  }));
  assert.equal(changedChildDelete.status, 200,
    "The confirmed owning parent must be able to erase an old chat after changing children.");
  assert.deepEqual(await bodyOf(changedChildDelete), { cleared: true });
  assert.equal(agent.__destroyed, true);

  const otherParentAgent = makeAgent();
  assert.equal((await otherParentAgent.onRequest(tutorRequest(body))).status, 200);
  const otherParentDelete = await otherParentAgent.onRequest(tutorRequest(undefined, {
    method: "DELETE",
    ownerId: OTHER_OWNER_ID,
    childKey: OTHER_CHILD_KEY
  }));
  assert.equal(otherParentDelete.status, 403);
  assert.match((await bodyOf(otherParentDelete)).error, /different parent account/i);
  assert.equal(otherParentAgent.__destroyed, false);
  assert.equal(otherParentAgent.state.ownerId, OWNER_ID);
  assert.equal(otherParentAgent.state.turns.length, 2);
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
    ["My name's Alice. Help with spelling.", /do not share/i],
    ["I'm Alice. Help with spelling.", /do not share/i],
    ["my name's alice smith.", /do not share/i],
    ["I live in London. Help with geography.", /do not share/i],
    ["I live near Oak Primary School. Help with geography.", /do not share/i],
    ["Our house is 10 Downing Street. Help with history.", /do not share/i],
    ["My Discord username is sproutkid42. Help with computing.", /do not share/i],
    ["I was born on 3 May 2015. Help with maths.", /do not share/i],
    ["I want to hurt myself.", /trusted adult/i],
    ["I swallowed a bottle of pills.", /trusted adult/i],
    ["My dad hits me.", /trusted adult/i],
    ["An adult sexually assaulted me.", /trusted adult/i],
    ["I was raped.", /trusted adult/i],
    ["I wish I was dead.", /trusted adult/i],
    ["I am choking.", /trusted adult/i],
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

test("ordinary first-person learning statements are not mistaken for private data", async () => {
  for (const message of [
    "I am learning fractions",
    "i am learning maths",
    "I am very confused",
    "I am solving this"
  ]) {
    const run = makeAiRun();
    const agent = makeAgent(run);
    const response = await agent.onRequest(tutorRequest({
      message, subject: "maths", stage: "growers"
    }));

    assert.equal(response.status, 200, message);
    assert.match((await bodyOf(response)).reply, /Good thinking/i, message);
    assert.deepEqual(
      run.calls.map(({ model }) => model),
      [SAFETY_MODEL, TUTOR_MODEL, SAFETY_MODEL],
      message
    );
    assert.equal(agent.state.turns[0]?.content, message);
  }
});

test("urgent deterministic safety help bypasses an exhausted or unavailable AI limiter", async () => {
  for (const limiter of [
    { limit: async () => ({ success: false }) },
    { limit: async () => { throw new Error("limiter offline"); } }
  ]) {
    let limiterCalls = 0;
    const wrappedLimiter = {
      async limit(input) {
        limiterCalls += 1;
        return limiter.limit(input);
      }
    };
    const run = makeAiRun({
      onSafety() {
        throw new Error("AI must not be called for a deterministic crisis reply");
      }
    });
    const agent = makeAgent(run, { TUTOR_RATE_LIMITER: wrappedLimiter });
    const response = await agent.onRequest(tutorRequest({
      message: "I want to hurt myself.", subject: "english", stage: "growers"
    }));

    assert.equal(response.status, 200);
    assert.match((await bodyOf(response)).reply, /trusted adult/i);
    assert.equal(limiterCalls, 0);
    assert.equal(run.calls.length, 0);
    assert.deepEqual(agent.state.turns, []);
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

test("Llama Guard crisis categories receive the urgent trusted-adult response", async () => {
  for (const verdict of ["\nunsafe\nS11", "unsafe\nS4", "unsafe\nS4, S11"]) {
    const run = makeAiRun({ safetyVerdicts: [verdict] });
    const agent = makeAgent(run);
    const response = await agent.onRequest(tutorRequest({
      message: "There is something difficult I need help with.",
      subject: "english",
      stage: "explorers"
    }));

    assert.equal(response.status, 200, verdict);
    assert.match((await bodyOf(response)).reply, /trusted adult/i, verdict);
    assert.deepEqual(run.calls.map(({ model }) => model), [SAFETY_MODEL], verdict);
    assert.deepEqual(agent.state.turns, [], verdict);
    assert.equal(agent.__scheduled.length, 0, verdict);
  }
});

test("Llama Guard non-crisis and malformed verdicts fail closed without a false crisis claim", async () => {
  for (const verdict of [
    "unsafe\nS1",
    "unsafe\nS2",
    "unsafe\nS9, S14",
    "unsafe\nS12",
    "safe\nS11",
    "unsafe-ish\nS11",
    "unsafe\nS99",
    ""
  ]) {
    const run = makeAiRun({ safetyVerdicts: [verdict] });
    const agent = makeAgent(run);
    const response = await agent.onRequest(tutorRequest({
      message: "Explain a difficult topic.", subject: "english", stage: "explorers"
    }));
    const { reply } = await bodyOf(response);

    assert.equal(response.status, 200, verdict);
    assert.match(reply, /can[’']t help with sexual, violent, illegal, or dangerous/i, verdict);
    assert.doesNotMatch(reply, /really glad you told me/i, verdict);
    assert.deepEqual(run.calls.map(({ model }) => model), [SAFETY_MODEL], verdict);
    assert.deepEqual(agent.state.turns, [], verdict);
  }
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

test("link-bearing tutor output is replaced before it reaches or persists for a child", async () => {
  const replies = [
    "Visit www.example.com for the full lesson.",
    "Open example.co.uk/lesson and follow the steps.",
    "Download it from ftp://example.org/file.",
    "Run javascript:alert(1) in your browser.",
    "Open //192.0.2.1/lesson in your browser.",
    "Try www . example . org for another lesson.",
    "Try example[.]org for another lesson."
  ];

  for (const tutorReply of replies) {
    const run = makeAiRun({ safetyVerdicts: ["safe", "safe"], tutorReply });
    const agent = makeAgent(run);
    const response = await agent.onRequest(tutorRequest({
      message: "Help me understand this topic.", subject: "computing", stage: "growers"
    }));
    const { reply } = await bodyOf(response);

    assert.equal(response.status, 200, tutorReply);
    assert.match(reply, /can[’']t safely share links/i, tutorReply);
    assert.doesNotMatch(reply, /example|ftp:|javascript:/i, tutorReply);
    assert.equal(agent.state.turns[1].content, reply, tutorReply);
    assert.deepEqual(run.calls.map(({ model }) => model), [SAFETY_MODEL, TUTOR_MODEL, SAFETY_MODEL]);
  }
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
  assert.equal(supabaseFetch.calls[1].url.pathname, "/rest/v1/rpc/sprout_tutor_active_child_approval");
  assert.equal(supabaseFetch.calls[1].init.method, "POST");
  assert.equal(supabaseFetch.calls[1].init.body, JSON.stringify({ p_expected_child_id: CHILD_ID }));
  assert.equal(supabaseFetch.calls[1].headers.get("Content-Type"), "application/json");
  assert.equal(supabaseFetch.calls[1].url.search, "");
  assert.deepEqual(limiterKeys, [],
    "The Durable Object must apply the limiter after deterministic safety checks.");

  assert.equal(routed.length, 1);
  assert.equal(routed[0].headers.has("Authorization"), false);
  assert.equal(routed[0].headers.has("X-KiddoSprout-Expected-Owner"), false);
  assert.equal(routed[0].headers.has("X-KiddoSprout-Expected-Child"), false);
  assert.equal(routed[0].headers.get("X-KiddoSprout-Verified-Owner"), OWNER_ID);
  assert.equal(routed[0].headers.get("X-KiddoSprout-Verified-Child"), CHILD_KEY);
  assert.equal(routed[0].headers.get("Origin"), ACCOUNT_ORIGIN);
});

test("top-level DELETE lets the confirmed owning parent clear an old chat without current-child approval", async () => {
  const supabaseFetch = makeSupabaseFetch({ approved: false });
  const routed = [];
  let limited = 0;
  const env = makeWorkerEnv({
    __routeAgentRequest: async (request) => {
      routed.push(request);
      return jsonUpstream({ cleared: true });
    },
    TUTOR_RATE_LIMITER: {
      async limit() {
        limited += 1;
        return { success: true };
      }
    }
  });

  const response = await withMockedFetch(supabaseFetch, () => worker.fetch(tutorRequest(undefined, {
    method: "DELETE",
    verified: false,
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "X-KiddoSprout-Verified-Owner": OTHER_OWNER_ID,
      "X-KiddoSprout-Verified-Child": OTHER_CHILD_KEY
    }
  }), env));

  assert.equal(response.status, 200);
  assert.deepEqual(await bodyOf(response), { cleared: true });
  assert.equal(supabaseFetch.calls.length, 1,
    "DELETE authenticates the parent but must not call the active-child approval RPC.");
  assert.equal(supabaseFetch.calls[0].url.pathname, "/auth/v1/user");
  assert.equal(limited, 0, "Conversation deletion must not consume the tutoring rate limit.");
  assert.equal(routed.length, 1);
  assert.equal(routed[0].headers.has("Authorization"), false);
  assert.equal(routed[0].headers.get("X-KiddoSprout-Verified-Owner"), OWNER_ID);
  assert.equal(routed[0].headers.has("X-KiddoSprout-Verified-Child"), false);
});

test("top-level routing requires email confirmation, not generic account confirmation", async () => {
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
  for (const authPayload of [
    {
      id: OWNER_ID,
      email: "parent@example.test",
      email_confirmed_at: null,
      confirmed_at: null,
      is_anonymous: false
    },
    {
      id: OWNER_ID,
      email: "parent@example.test",
      email_confirmed_at: null,
      confirmed_at: "2026-09-01T10:00:00.000Z",
      is_anonymous: false
    }
  ]) {
    const supabaseFetch = makeSupabaseFetch({ authPayload });
    const response = await withMockedFetch(supabaseFetch, () => worker.fetch(tutorRequest({
      message: "Help me learn.", subject: "maths", stage: "sprouts"
    }, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    }), env));
    assert.equal(response.status, 401);
    assert.match((await bodyOf(response)).error, /verified parent account/i);
    assert.equal(supabaseFetch.calls.length, 1,
      "An email-unconfirmed account must be rejected before the approval RPC runs.");
  }
  assert.equal(routed, 0);
  assert.equal(limited, 0);
});

test("top-level routing rejects an active child without explicit Sprout Tutor approval", async () => {
  const supabaseFetch = makeSupabaseFetch({ approved: false });
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

test("top-level routing rejects stale parent and child bindings before an AI request", async () => {
  let routed = 0;
  const env = makeWorkerEnv({
    __routeAgentRequest: async () => {
      routed += 1;
      return jsonUpstream({ routed: true });
    }
  });

  const missingBindingFetch = makeSupabaseFetch();
  const missingBinding = await withMockedFetch(missingBindingFetch, () => worker.fetch(tutorRequest({
    message: "Help with fractions.", subject: "maths", stage: "growers"
  }, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    expected: false
  }), env));
  assert.equal(missingBinding.status, 400);
  assert.match((await bodyOf(missingBinding)).error, /family profile binding/i);
  assert.equal(missingBindingFetch.calls.length, 0,
    "A missing expected identity must fail before any account request.");

  const wrongOwnerFetch = makeSupabaseFetch();
  const wrongOwner = await withMockedFetch(wrongOwnerFetch, () => worker.fetch(tutorRequest({
    message: "Help with fractions.", subject: "maths", stage: "growers"
  }, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    expectedOwnerId: OTHER_OWNER_ID
  }), env));
  assert.equal(wrongOwner.status, 403);
  assert.match((await bodyOf(wrongOwner)).error, /parent account changed/i);
  assert.equal(wrongOwnerFetch.calls.length, 1,
    "A stale expected parent must be rejected before the approval RPC.");

  const wrongChildFetch = makeSupabaseFetch({ approvalPayload: [] });
  const wrongChild = await withMockedFetch(wrongChildFetch, () => worker.fetch(tutorRequest({
    message: "Help with fractions.", subject: "maths", stage: "growers"
  }, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    expectedChildId: "learner-two"
  }), env));
  assert.equal(wrongChild.status, 403);
  assert.match((await bodyOf(wrongChild)).error, /parent must approve/i);
  assert.equal(wrongChildFetch.calls[1].init.body,
    JSON.stringify({ p_expected_child_id: "learner-two" }));
  assert.equal(routed, 0);
});

test("account rate limiting cannot be reset by changing the chat UUID", async () => {
  const limiterKeys = [];
  const limiter = {
    async limit({ key }) {
      limiterKeys.push(key);
      return { success: limiterKeys.length === 1 };
    }
  };
  const firstAgent = makeAgent(makeAiRun(), { TUTOR_RATE_LIMITER: limiter });
  const secondAgent = makeAgent(makeAiRun(), { TUTOR_RATE_LIMITER: limiter });

  const first = await firstAgent.onRequest(tutorRequest({
    message: "First question", subject: "maths", stage: "sprouts"
  }, { url: ENDPOINT }));
  assert.equal(first.status, 200);

  const changedSession = await secondAgent.onRequest(tutorRequest({
    message: "Second question", subject: "maths", stage: "sprouts"
  }, { url: SECOND_ENDPOINT }));
  assert.equal(changedSession.status, 429);
  assert.equal(changedSession.headers.get("Retry-After"), "60");
  assert.match((await bodyOf(changedSession)).error, /learning break/i);

  assert.deepEqual(limiterKeys, [`parent:${OWNER_ID}`, `parent:${OWNER_ID}`]);
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

test("Worker-first assets replace the public-demo CSP only on the exact live account origin", async () => {
  const publicDemoCsp = "default-src 'self'; connect-src 'self'; frame-src 'none'";
  const assetPaths = [];
  const env = makeWorkerEnv({
    ASSETS: {
      async fetch(input) {
        assetPaths.push(new URL(typeof input === "string" ? input : input.url).pathname);
        return new Response("<h1>KiddoSprout</h1>", {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Security-Policy": publicDemoCsp,
            "X-Content-Type-Options": "nosniff"
          }
        });
      }
    }
  });

  const live = await worker.fetch(new Request(`${ACCOUNT_ORIGIN}/sprout-tutor.html`), env);
  const liveCsp = live.headers.get("Content-Security-Policy") || "";
  assert.equal(live.status, 200);
  assert.equal(await live.text(), "<h1>KiddoSprout</h1>");
  assert.match(liveCsp, new RegExp(`connect-src[^;]*${SUPABASE_URL.replaceAll(".", "\\.")}`));
  assert.match(liveCsp, /connect-src[^;]*wss:\/\/kiddosprouttest\.supabase\.co/);
  assert.match(liveCsp, /script-src[^;]*https:\/\/challenges\.cloudflare\.com/);
  assert.match(liveCsp, /frame-src[^;]*https:\/\/challenges\.cloudflare\.com/);
  assert.doesNotMatch(liveCsp, /https:\/\/\*\.supabase\.co/);
  assert.doesNotMatch(liveCsp, /hammy-boy\.github\.io|localhost|127\.0\.0\.1/);
  assert.equal(live.headers.get("X-Content-Type-Options"), "nosniff");

  const alternateHost = await worker.fetch(new Request("https://tutor.example/sprout-tutor.html"), env);
  assert.equal(alternateHost.headers.get("Content-Security-Policy"), publicDemoCsp,
    "An alternate Worker hostname must keep the static demo policy and cannot expose live account connections.");

  const incomplete = await worker.fetch(
    new Request(`${ACCOUNT_ORIGIN}/sprout-tutor.html`),
    makeWorkerEnv({ TURNSTILE_SITE_KEY: undefined, ASSETS: env.ASSETS })
  );
  assert.equal(incomplete.headers.get("Content-Security-Policy"), publicDemoCsp,
    "Incomplete account configuration must fail closed to the public-demo policy.");

  const root = await worker.fetch(new Request(`${ACCOUNT_ORIGIN}/`), env);
  const nestedIndex = await worker.fetch(new Request(`${ACCOUNT_ORIGIN}/games/learning-world/`), env);
  assert.equal(root.status, 200);
  assert.equal(nestedIndex.status, 200);
  assert.deepEqual(assetPaths, [
    "/sprout-tutor.html",
    "/sprout-tutor.html",
    "/sprout-tutor.html",
    "/index.html",
    "/games/learning-world/index.html"
  ], "Exact .html URLs must stay stable while directory routes are explicitly mapped to index.html.");
});

test("health endpoint separates credential-free deployment status from parent-authorized AI readiness", async () => {
  let routed = 0;
  const storageFetch = makeSupabaseFetch();
  let publicUpstreamCalls = 0;
  const publicFetch = async () => {
    publicUpstreamCalls += 1;
    throw new Error("A credential-free health check must not call Supabase.");
  };
  const env = makeWorkerEnv({
    __routeAgentRequest: async () => {
      routed += 1;
      return jsonUpstream({ routed: true });
    }
  });
  const configured = await withMockedFetch(publicFetch, () => worker.fetch(new Request(HEALTH_ENDPOINT, {
    headers: { Origin: ACCOUNT_ORIGIN }
  }), env));
  assert.equal(configured.status, 200);
  assert.deepEqual(await bodyOf(configured), {
    status: "configured",
    authentication: "parent-account",
    retentionHours: 24
  });
  assert.equal(configured.headers.get("Access-Control-Allow-Origin"), ACCOUNT_ORIGIN);
  assert.equal(configured.headers.get("Cache-Control"), "no-store");
  assert.equal(routed, 0);

  const sameOriginConfigured = await withMockedFetch(publicFetch, () => worker.fetch(new Request(HEALTH_ENDPOINT, {
    headers: { Origin: "https://tutor.example" }
  }), env));
  assert.equal(sameOriginConfigured.status, 200);
  assert.equal(sameOriginConfigured.headers.get("Access-Control-Allow-Origin"), "https://tutor.example");
  assert.equal(publicUpstreamCalls, 0,
    "Public deployment status must not create unbounded anonymous Supabase traffic.");

  const authorized = await withMockedFetch(storageFetch, () => worker.fetch(new Request(HEALTH_ENDPOINT, {
    headers: {
      Origin: ACCOUNT_ORIGIN,
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "X-KiddoSprout-Expected-Owner": OWNER_ID,
      "X-KiddoSprout-Expected-Child": CHILD_ID
    }
  }), env));
  assert.equal(authorized.status, 200);
  assert.deepEqual(await bodyOf(authorized), {
    status: "ready",
    authentication: "parent-account",
    retentionHours: 24
  });
  assert.equal(storageFetch.calls.length, 2);
  assert.equal(storageFetch.calls[0].url.pathname, "/auth/v1/user");
  assert.equal(storageFetch.calls[1].url.pathname,
    "/rest/v1/rpc/sprout_tutor_active_child_approval");
  assert.equal(storageFetch.calls[1].headers.get("Authorization"), `Bearer ${AUTH_TOKEN}`);

  const malformedAuthorization = await worker.fetch(new Request(HEALTH_ENDPOINT, {
    headers: {
      Origin: ACCOUNT_ORIGIN,
      Authorization: "Bearer"
    }
  }), env);
  assert.equal(malformedAuthorization.status, 401,
    "An attempted authenticated health check must not fall back to public deployment status.");

  const unavailable = await worker.fetch(new Request(HEALTH_ENDPOINT, {
    headers: { Origin: ACCOUNT_ORIGIN }
  }), makeWorkerEnv({ TUTOR_RATE_LIMITER: undefined }));
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get("Retry-After"), "30");

  const missingAssets = await worker.fetch(new Request(HEALTH_ENDPOINT, {
    headers: { Origin: ACCOUNT_ORIGIN }
  }), makeWorkerEnv({ ASSETS: undefined }));
  assert.equal(missingAssets.status, 503,
    "Readiness must fail when the hosted application assets are not bound.");

  const preflight = await worker.fetch(new Request(HEALTH_ENDPOINT, {
    method: "OPTIONS",
    headers: {
      Origin: ACCOUNT_ORIGIN,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization, x-kiddosprout-expected-owner, x-kiddosprout-expected-child"
    }
  }), env);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Methods"), "GET, OPTIONS");
  assert.equal(preflight.headers.get("Access-Control-Allow-Headers"),
    "Authorization, Content-Type, X-KiddoSprout-Expected-Owner, X-KiddoSprout-Expected-Child");

  const forbiddenPreflight = await worker.fetch(new Request(HEALTH_ENDPOINT, {
    method: "OPTIONS",
    headers: {
      Origin: ACCOUNT_ORIGIN,
      "Access-Control-Request-Method": "POST"
    }
  }), env);
  assert.equal(forbiddenPreflight.status, 405);
  assert.equal(forbiddenPreflight.headers.get("Allow"), "GET, OPTIONS");

  const wrongMethod = await worker.fetch(new Request(HEALTH_ENDPOINT, {
    method: "POST",
    headers: { Origin: ACCOUNT_ORIGIN }
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
      Origin: ACCOUNT_ORIGIN,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization, content-type, x-kiddosprout-expected-owner, x-kiddosprout-expected-child"
    }
  }), env);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), ACCOUNT_ORIGIN);
  assert.equal(preflight.headers.get("Access-Control-Allow-Headers"),
    "Authorization, Content-Type, X-KiddoSprout-Expected-Owner, X-KiddoSprout-Expected-Child");
  assert.equal(preflight.headers.get("Access-Control-Allow-Methods"), "POST, DELETE, OPTIONS");
  assert.equal(preflight.headers.get("Access-Control-Max-Age"), "600");
  assert.equal(preflight.headers.has("Access-Control-Allow-Credentials"), false);
  assert.equal(routed, 0, "Preflight should not create or wake an Agent instance.");

  const forbiddenHeader = await worker.fetch(new Request(ENDPOINT, {
    method: "OPTIONS",
    headers: {
      Origin: ACCOUNT_ORIGIN,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization, x-kiddosprout-verified-owner"
    }
  }), env);
  assert.equal(forbiddenHeader.status, 400);

  for (const origin of [
    "https://tutor.example",
    ACCOUNT_ORIGIN
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
    "https://hammy-boy.github.io",
    "http://localhost:4173",
    "http://127.0.0.1:8787",
    "http://[::1]:3000",
    "http://localhost.evil.example",
    "null",
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
  assert.deepEqual(config.vars, { KIDDOSPROUT_ACCOUNT_MODE: "true" });
  assert.deepEqual(config.secrets?.required, [
    "KIDDOSPROUT_ACCOUNT_ORIGIN",
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "TURNSTILE_SITE_KEY"
  ], "Wrangler must refuse a deployment that is missing an account secret.");
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
  assert.equal(config.assets.run_worker_first, true,
    "Every live asset response must pass through the Worker so it can receive the exact-origin CSP.");
  assert.equal(config.assets.html_handling, "none",
    "Cloudflare must preserve exact .html URLs used by the PWA shell instead of redirecting them.");
  assert.equal(config.observability.enabled, true);
  assert.equal(config.observability.logs.enabled, true);
  assert.equal(config.observability.traces.enabled, true);

  assert.equal(packageJson.dependencies.agents, agentsPackage.version);
  assert.equal(lock.packages["node_modules/agents"].version, agentsPackage.version);
  assert.match(packageJson.scripts["test:sprout-tutor"], /test-sprout-tutor-worker\.mjs/);
  assert.match(packageJson.scripts["test:sprout-tutor"], /test-sprout-tutor-database-check\.mjs/);
  assert.match(packageJson.scripts["deploy:sprout-tutor:first"], /check:sprout-tutor-database/,
    "A first deployment must verify that the narrow approval RPC exists and is not public.");
});

test("approval RPC migration is owner-scoped, invoker-safe, and returns no family JSON", () => {
  assert.match(approvalMigration,
    /create or replace function public\.sprout_tutor_active_child_approval\(\s*p_expected_child_id text\s*\)/i);
  assert.match(approvalMigration, /returns table\s*\(\s*child_id text,\s*approved boolean\s*\)/i);
  assert.match(approvalMigration, /security invoker/i);
  assert.doesNotMatch(approvalMigration, /security definer/i);
  assert.match(approvalMigration,
    /family\.owner_id\s*=\s*\(select auth\.uid\(\)\)/i,
    "The function must enforce owner scope even in addition to family_state RLS.");
  assert.match(approvalMigration,
    /active_child\.child_id\s*=\s*p_expected_child_id/i,
    "The RPC must reject a stale browser child instead of silently switching identities.");
  assert.match(approvalMigration,
    /revoke all on function public\.sprout_tutor_active_child_approval\(text\)[\s\S]*?from public, anon, authenticated/i);
  assert.match(approvalMigration,
    /grant execute on function public\.sprout_tutor_active_child_approval\(text\)[\s\S]*?to authenticated/i);
  assert.doesNotMatch(approvalMigration, /returns\s+(?:setof\s+)?jsonb?\b/i,
    "The RPC contract must never return the private family document.");
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
  assert.match(source, /MAX_APPROVAL_RESPONSE_BYTES\s*=\s*8 \* 1024/);
  assert.match(source, /MAX_HISTORY_MESSAGES\s*=\s*12/);
  assert.match(source, /RATE_LIMIT_REQUESTS\s*=\s*8/);
  assert.match(source, /RETENTION_SECONDS\s*=\s*24 \* 60 \* 60/);
  assert.match(source, /headers\.delete\(VERIFIED_OWNER_HEADER\)/);
  assert.match(source, /headers\.delete\(VERIFIED_CHILD_HEADER\)/);
  assert.match(source, /headers\.delete\(EXPECTED_OWNER_HEADER\)/);
  assert.match(source, /headers\.delete\(EXPECTED_CHILD_HEADER\)/);
  assert.match(source, /email_confirmed_at/);
  assert.match(source, /\/rest\/v1\/rpc\/sprout_tutor_active_child_approval/);
  assert.doesNotMatch(source, /\/rest\/v1\/family_state/,
    "The Worker must never download the full private family document.");
});
