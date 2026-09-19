#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$PROJECT_DIR"

# Docker Desktop's installer can leave an old /usr/local/bin/docker link pointing
# at the unmounted installer volume. Prefer the CLI bundled with the installed app
# on macOS, and include its credential helper in PATH for image pulls.
DOCKER_DESKTOP_CLI_DIR=/Applications/Docker.app/Contents/Resources/bin
if [ -x "$DOCKER_DESKTOP_CLI_DIR/docker" ]; then
  KIDDOSPROUT_REAL_DOCKER="$DOCKER_DESKTOP_CLI_DIR/docker"
  PATH="$PROJECT_DIR/scripts/docker-localhost-bin:$DOCKER_DESKTOP_CLI_DIR:$PATH"
  export KIDDOSPROUT_REAL_DOCKER
  export PATH
fi
if ! docker version >/dev/null 2>&1; then
  echo "Docker Desktop is not ready. Open Docker Desktop, wait for it to finish starting, then run npm run dev again." >&2
  exit 1
fi

# A Quick Tunnel created before the public preview was moved into its own
# Compose project can survive as an orphan in the local project. Such a
# connector would keep publishing the private local website even though it is
# no longer present in docker-compose.yml. Resolve Compose's actual local
# project name, then remove only a cloudflared service with that exact label.
# The separately named kiddosprout-public-preview project is never targeted.
LOCAL_COMPOSE_PROJECT_NAME=$(
  docker compose config --format json --no-interpolate |
    node -e '
      process.stdin.setEncoding("utf8");
      let source = "";
      process.stdin.on("data", (chunk) => { source += chunk; });
      process.stdin.on("end", () => {
        const name = JSON.parse(source).name;
        if (typeof name !== "string" || !/^[a-z0-9][a-z0-9_-]*$/.test(name)) {
          throw new Error("Docker Compose did not return a safe local project name.");
        }
        process.stdout.write(name);
      });
    '
)

if [ "$LOCAL_COMPOSE_PROJECT_NAME" = "kiddosprout-public-preview" ]; then
  echo "Refusing to use the public-preview Docker project for private local development." >&2
  exit 1
fi

remove_local_orphan_tunnel() {
  LOCAL_TUNNEL_IDS=$(docker container ls --all --quiet \
    --filter "label=com.docker.compose.project=$LOCAL_COMPOSE_PROJECT_NAME" \
    --filter "label=com.docker.compose.service=cloudflared")

  for LOCAL_TUNNEL_ID in $LOCAL_TUNNEL_IDS; do
    case "$LOCAL_TUNNEL_ID" in
      *[!0-9a-f]*|'')
        echo "Refusing to remove an invalid Docker container identifier." >&2
        exit 1
        ;;
    esac

    LOCAL_TUNNEL_PROJECT=$(docker container inspect \
      --format '{{ index .Config.Labels "com.docker.compose.project" }}' \
      "$LOCAL_TUNNEL_ID" 2>/dev/null || :)
    LOCAL_TUNNEL_SERVICE=$(docker container inspect \
      --format '{{ index .Config.Labels "com.docker.compose.service" }}' \
      "$LOCAL_TUNNEL_ID" 2>/dev/null || :)

    if [ "$LOCAL_TUNNEL_PROJECT" = "$LOCAL_COMPOSE_PROJECT_NAME" ] && \
       [ "$LOCAL_TUNNEL_PROJECT" != "kiddosprout-public-preview" ] && \
       [ "$LOCAL_TUNNEL_SERVICE" = "cloudflared" ]; then
      echo "Removing a stale Quick Tunnel from the private local Docker project."
      docker container rm --force "$LOCAL_TUNNEL_ID" >/dev/null
    fi
  done
}

remove_local_orphan_tunnel

if [ ! -f .env ]; then
  echo "Missing .env. Copy .env.example to .env, then add your private sign-in settings." >&2
  exit 1
fi

set -a
. ./.env
set +a
chmod 600 .env

SMTP_READY=false
SMTP_CONFIGURED=false
if [ -n "${SMTP_HOST:-}" ] || [ -n "${SMTP_USER:-}" ] || [ -n "${SMTP_PASS:-}" ] || [ -n "${SMTP_FROM:-}" ]; then
  SMTP_CONFIGURED=true
fi
if [ -n "${SMTP_HOST:-}" ] && [ -n "${SMTP_PORT:-}" ] && [ -n "${SMTP_USER:-}" ] && [ -n "${SMTP_PASS:-}" ] && [ -n "${SMTP_FROM:-}" ]; then
  SMTP_READY=true
fi

if [ "$SMTP_CONFIGURED" = "true" ]; then
  node scripts/email-readiness.mjs
fi

GOOGLE_AUTH_READY=false
if [ -n "${GOOGLE_OAUTH_CLIENT_ID:-}" ] && [ -n "${GOOGLE_OAUTH_CLIENT_SECRET:-}" ]; then
  GOOGLE_AUTH_READY=true
elif [ -n "${GOOGLE_OAUTH_CLIENT_ID:-}" ] || [ -n "${GOOGLE_OAUTH_CLIENT_SECRET:-}" ]; then
  echo "Google sign-in is incomplete: GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must both be set." >&2
  exit 1
fi

if [ "$SMTP_READY" != "true" ] && [ "$GOOGLE_AUTH_READY" != "true" ]; then
  echo "KiddoSprout needs at least one secure parent sign-in route." >&2
  echo "Add both Google OAuth values, or complete all five SMTP values, in the private .env file." >&2
  exit 1
fi

# The checked-in config keeps optional Google sign-in disabled, defaults SMTP to
# STARTTLS port 587, and contains no OAuth secret. A private temporary copy is
# used whenever Google is enabled or a provider uses another supported TLS port.
# Google-only mode disables SMTP so missing mail credentials never reach Auth.
SUPABASE_CLI_WORKDIR=$PROJECT_DIR
LOCAL_AUTH_WORKDIR=
cleanup_auth_workdir() {
  case "${LOCAL_AUTH_WORKDIR:-}" in
    "${TMPDIR:-/tmp}"/kiddosprout-supabase.*)
      rm -rf -- "$LOCAL_AUTH_WORKDIR"
      ;;
  esac
}
trap cleanup_auth_workdir EXIT HUP INT TERM

if [ "$GOOGLE_AUTH_READY" = "true" ] || { [ "$SMTP_READY" = "true" ] && [ "${SMTP_PORT:-587}" != "587" ]; }; then
  LOCAL_AUTH_WORKDIR=$(mktemp -d "${TMPDIR:-/tmp}/kiddosprout-supabase.XXXXXX")
  cp -R "$PROJECT_DIR/supabase" "$LOCAL_AUTH_WORKDIR/supabase"
  node - "$LOCAL_AUTH_WORKDIR/supabase/config.toml" "$SMTP_READY" "$GOOGLE_AUTH_READY" "${SMTP_PORT:-587}" <<'NODE'
const { readFileSync, writeFileSync } = require("node:fs");

const [configPath, smtpReady, googleReady, smtpPort] = process.argv.slice(2);
let config = readFileSync(configPath, "utf8");

function updateSection(sectionName, values) {
  const header = `[${sectionName}]`;
  const start = config.indexOf(header);
  if (start < 0) throw new Error(`Missing ${header} in local Auth config.`);
  const bodyStart = config.indexOf("\n", start) + 1;
  const nextSection = config.indexOf("\n[", bodyStart);
  const bodyEnd = nextSection < 0 ? config.length : nextSection + 1;
  let body = config.slice(bodyStart, bodyEnd);

  for (const [key, value] of Object.entries(values)) {
    const pattern = new RegExp(`^${key}\\s*=.*$`, "m");
    if (!pattern.test(body)) throw new Error(`Missing ${key} in ${header}.`);
    body = body.replace(pattern, `${key} = ${value}`);
  }

  config = `${config.slice(0, bodyStart)}${body}${config.slice(bodyEnd)}`;
}

if (googleReady === "true") {
  updateSection("auth.external.google", {
    enabled: "true",
    client_id: '"env(GOOGLE_OAUTH_CLIENT_ID)"',
    secret: '"env(GOOGLE_OAUTH_CLIENT_SECRET)"'
  });
}

if (smtpReady !== "true") {
  updateSection("auth.email.smtp", {
    enabled: "false",
    host: '""',
    user: '""',
    pass: '""',
    admin_email: '""'
  });
} else {
  updateSection("auth.email.smtp", {
    port: String(Number.parseInt(smtpPort, 10))
  });
}

writeFileSync(configPath, config, { encoding: "utf8", mode: 0o600 });
NODE
  SUPABASE_CLI_WORKDIR=$LOCAL_AUTH_WORKDIR
fi

LOCAL_SUPABASE_NETWORK=kiddosprout-supabase-local-only
if ! docker network inspect "$LOCAL_SUPABASE_NETWORK" >/dev/null 2>&1; then
  docker network create --driver bridge \
    --opt com.docker.network.bridge.host_binding_ipv4=127.0.0.1 \
    "$LOCAL_SUPABASE_NETWORK" >/dev/null
fi

# Restart the local account stack so config.toml changes (CAPTCHA, email confirmation,
# Google provider, and redirect URLs) are applied even when Supabase was already running.
if npx supabase status -o json >/dev/null 2>&1; then
  npx supabase stop >/dev/null
fi
npx supabase start --workdir "$SUPABASE_CLI_WORKDIR" --yes --network-id "$LOCAL_SUPABASE_NETWORK" --exclude mailpit >/dev/null

SUPABASE_PROJECT_ID=$(sed -n 's/^[[:space:]]*project_id[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' supabase/config.toml | head -n 1)
UNSAFE_BINDINGS=$(docker ps --format '{{.Names}} {{.Ports}}' | awk -v suffix="_$SUPABASE_PROJECT_ID" '
  index($1, "supabase_") == 1 && substr($1, length($1) - length(suffix) + 1) == suffix && ($0 ~ /0\.0\.0\.0:/ || $0 ~ /\[::\]:/) { print }
')
if [ -n "$UNSAFE_BINDINGS" ]; then
  npx supabase stop >/dev/null
  echo "KiddoSprout stopped the local account stack because Docker exposed development ports beyond this Mac:" >&2
  echo "$UNSAFE_BINDINGS" >&2
  exit 1
fi

STATUS_JSON=$(npx supabase status --workdir "$SUPABASE_CLI_WORKDIR" -o json)
SUPABASE_URL=$(printf '%s' "$STATUS_JSON" | node -e 'process.stdin.setEncoding("utf8"); let value=""; process.stdin.on("data", chunk => value += chunk); process.stdin.on("end", () => process.stdout.write(JSON.parse(value).API_URL || ""));')
SUPABASE_PUBLISHABLE_KEY=$(printf '%s' "$STATUS_JSON" | node -e 'process.stdin.setEncoding("utf8"); let value=""; process.stdin.on("data", chunk => value += chunk); process.stdin.on("end", () => process.stdout.write(JSON.parse(value).PUBLISHABLE_KEY || ""));')
# KiddoSprout waits for the visitor's deliberate click before rendering this
# official always-pass local test widget, so one click completes development checks.
TURNSTILE_SITE_KEY=${TURNSTILE_SITE_KEY:-1x00000000000000000000AA}

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_PUBLISHABLE_KEY" ]; then
  echo "Local account service did not return its browser configuration." >&2
  exit 1
fi

AUTH_EMAIL_DELIVERY_READY=$SMTP_READY
export SUPABASE_URL SUPABASE_PUBLISHABLE_KEY TURNSTILE_SITE_KEY AUTH_EMAIL_DELIVERY_READY GOOGLE_AUTH_READY
node scripts/write-local-compose-override.mjs
docker compose up -d --build

echo "KiddoSprout: http://127.0.0.1:8001"
echo "Local database studio: http://127.0.0.1:54323"
if [ "$SMTP_READY" = "true" ]; then
  echo "Account emails: delivered to the parent's real inbox as KiddoSprout"
fi
if [ "$GOOGLE_AUTH_READY" = "true" ]; then
  echo "Google sign-in: ready (callback http://127.0.0.1:54321/auth/v1/callback)"
fi
