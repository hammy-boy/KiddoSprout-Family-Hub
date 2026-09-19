#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$PROJECT_DIR"

DOCKER_DESKTOP_CLI_DIR=/Applications/Docker.app/Contents/Resources/bin
if [ -x "$DOCKER_DESKTOP_CLI_DIR/docker" ]; then
  PATH="$DOCKER_DESKTOP_CLI_DIR:$PATH"
  export PATH
fi

# Remove only a legacy cloudflared orphan that belongs to this local Compose
# project. The active colleague preview has the explicit, different project
# name kiddosprout-public-preview and must keep running when local development
# is stopped.
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
  echo "Refusing to stop the public-preview Docker project through the local stop command." >&2
  exit 1
fi

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

docker compose down
npx supabase stop
