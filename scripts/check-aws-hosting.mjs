import process from "node:process";

const REQUEST_TIMEOUT_MS = 15_000;
const SECRET_SHAPE = /(?:service[_-]?role|smtp[_-]?pass|resend[_-]?api|aws[_-]?(?:access|secret)|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;
const LOOPBACK = /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?\b/i;
const KIDDO_SPROUT_URL = "https://hammy-boy.github.io/KiddoSprout-Family-Hub/";
const ROOKAVELLE_URL = `${KIDDO_SPROUT_URL}games/chess-academy/`;

function requestedUrl() {
  const value = process.argv[2]
    || process.env.SANDO_AWS_URL
    || process.env.KIDDOSPROUT_AWS_URL
    || "";
  if (!value) {
    throw new Error(
      "Provide the Amplify address: npm run check:aws-hosting -- https://main.example.amplifyapp.com"
    );
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("The AWS hosting address is not a valid URL.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("Use a plain HTTPS site address with no credentials, query, or fragment.");
  }
  if (LOOPBACK.test(url.hostname)) {
    throw new Error("The AWS check needs the public Amplify address, not a local Docker address.");
  }
  url.pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  return url;
}

async function load(base, path, expectedType) {
  const response = await fetch(new URL(path, base), {
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { Accept: expectedType }
  });
  if (!response.ok) {
    throw new Error(`${path || "/"} returned HTTP ${response.status}.`);
  }
  const type = response.headers.get("content-type") || "";
  if (!type.toLowerCase().includes(expectedType.toLowerCase())) {
    throw new Error(`${path || "/"} returned ${type || "no content type"}, not ${expectedType}.`);
  }
  const body = await response.text();
  if (SECRET_SHAPE.test(body)) {
    throw new Error(`${path || "/"} contains secret-shaped text and must not be shared.`);
  }
  return { response, body };
}

function requireHeader(headers, name, expected) {
  const value = headers.get(name) || "";
  if (!expected.test(value)) {
    throw new Error(`The hosted home page is missing the reviewed ${name} header.`);
  }
}

async function main() {
  const base = requestedUrl();
  const home = await load(base, "", "text/html");
  if (!/<h1\b[^>]*>\s*S&amp;O Devs\s*<\/h1>/i.test(home.body) || LOOPBACK.test(home.body)) {
    throw new Error("The AWS site is not the reviewed S&O Devs project portal.");
  }
  for (const destination of [KIDDO_SPROUT_URL, ROOKAVELLE_URL]) {
    const escapedDestination = destination.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = home.body.match(new RegExp(`href=["']${escapedDestination}["']`, "gi")) || [];
    if (matches.length !== 1) {
      throw new Error(`The portal must link exactly once to ${destination}`);
    }
  }
  if (/<\/?(?:script|form|iframe)\b/i.test(home.body)) {
    throw new Error("The hosted chooser contains an unexpected active element.");
  }

  requireHeader(home.response.headers, "strict-transport-security", /max-age=31536000/i);
  requireHeader(home.response.headers, "x-content-type-options", /^nosniff$/i);
  requireHeader(home.response.headers, "x-frame-options", /^DENY$/i);
  requireHeader(home.response.headers, "x-robots-tag", /noindex/i);
  requireHeader(home.response.headers, "content-security-policy", /default-src 'self'/i);
  requireHeader(home.response.headers, "content-security-policy", /connect-src 'none'/i);

  const notFound = await load(base, "404.html", "text/html");
  if (!/<h1\b[^>]*>\s*Page not found\s*<\/h1>/i.test(notFound.body) || !/href=["']\/["']/i.test(notFound.body)) {
    throw new Error("The hosted portal's friendly not-found page is incomplete.");
  }

  console.log(`AWS Amplify check passed for ${base.origin}: the neutral two-site portal and its security headers are available.`);
}

main().catch((error) => {
  console.error(`AWS Amplify check failed: ${error.message}`);
  process.exitCode = 1;
});
