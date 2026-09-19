#!/bin/sh
set -eu

SUPABASE_BROWSER_KEY=${SUPABASE_PUBLISHABLE_KEY:-${SUPABASE_ANON_KEY:-}}

is_supported_supabase_url() {
  candidate=$1
  case "$candidate" in
    https://*.supabase.co)
      project_ref=${candidate#https://}
      project_ref=${project_ref%.supabase.co}
      case "$project_ref" in
        ""|-*|*-|*[!A-Za-z0-9-]*) return 1 ;;
      esac
      ;;
    http://localhost|http://127.0.0.1)
      ;;
    http://localhost:*|http://127.0.0.1:*)
      port=${candidate##*:}
      case "$port" in
        ""|*[!0-9]*) return 1 ;;
      esac
      ;;
    *) return 1 ;;
  esac
  return 0
}

legacy_key_is_anon() {
  candidate=$1
  case "$candidate" in
    *[!A-Za-z0-9._-]*|*.*.*.*) return 1 ;;
  esac
  first_removed=${candidate#*.}
  if [ "$first_removed" = "$candidate" ]; then return 1; fi
  payload=${first_removed%%.*}
  if [ "$payload" = "$first_removed" ] || [ -z "$payload" ]; then return 1; fi

  case $((${#payload} % 4)) in
    0) padded_payload=$payload ;;
    2) padded_payload=${payload}== ;;
    3) padded_payload=${payload}= ;;
    *) return 1 ;;
  esac
  if ! decoded_payload=$(printf '%s' "$padded_payload" | tr '_-' '/+' | base64 -d 2>/dev/null); then
    return 1
  fi
  printf '%s' "$decoded_payload" | grep -Eq '"role"[[:space:]]*:[[:space:]]*"anon"'
}

is_browser_safe_supabase_key() {
  candidate=$1
  case "$candidate" in
    sb_publishable_*)
      suffix=${candidate#sb_publishable_}
      [ ${#suffix} -ge 12 ] || return 1
      case "$suffix" in *[!A-Za-z0-9_-]*) return 1 ;; esac
      return 0
      ;;
    sb_secret_*|"") return 1 ;;
    *) legacy_key_is_anon "$candidate" ;;
  esac
}

PUBLIC_DEMO_ONLY_VALUE=false
PUBLIC_DEMO_SETTING=unset
if [ "${PUBLIC_DEMO_ONLY+x}" = "x" ]; then
  PUBLIC_DEMO_SETTING=${PUBLIC_DEMO_ONLY}
  case "$PUBLIC_DEMO_SETTING" in
    true) PUBLIC_DEMO_ONLY_VALUE=true ;;
    false) PUBLIC_DEMO_ONLY_VALUE=false ;;
    *)
      echo "PUBLIC_DEMO_ONLY must be exactly true or false." >&2
      exit 1
      ;;
  esac
fi

WEB_ROOT=${KIDDOSPROUT_WEB_ROOT:-/usr/share/nginx/html}
CONFIG_TARGET=${KIDDOSPROUT_CONFIG_TARGET:-$WEB_ROOT/supabase-config.js}
CONFIG_TEMP=${CONFIG_TARGET}.tmp
trap 'rm -f "$CONFIG_TEMP"' EXIT

if [ "$PUBLIC_DEMO_ONLY_VALUE" = "true" ]; then
  # The public colleague preview receives no account endpoint, browser key, or
  # CAPTCHA key. Remove obsolete recipe prototypes that contain standalone
  # account forms so they cannot bypass the current app's demo gate.
  for legacy_page in app_1.html app_2.html app_3.html app_4.html app_5.html app_6.html; do
    rm -f "$WEB_ROOT/$legacy_page"
  done
  cat > "$CONFIG_TEMP" <<'EOF'
window.KIDDO_SPROUT_SUPABASE = Object.freeze({
  publicDemoOnly: true
});
EOF
  mv "$CONFIG_TEMP" "$CONFIG_TARGET"
  trap - EXIT
  exit 0
fi

case "${AUTH_EMAIL_DELIVERY_READY:-false}" in
  true) EMAIL_DELIVERY_READY=true ;;
  false) EMAIL_DELIVERY_READY=false ;;
  *)
    echo "AUTH_EMAIL_DELIVERY_READY must be exactly true or false." >&2
    exit 1
    ;;
esac
case "${GOOGLE_AUTH_READY:-false}" in
  true) GOOGLE_AUTH_READY_VALUE=true ;;
  false) GOOGLE_AUTH_READY_VALUE=false ;;
  *)
    echo "GOOGLE_AUTH_READY must be exactly true or false." >&2
    exit 1
    ;;
esac

if [ -z "${SUPABASE_URL:-}" ] || [ -z "$SUPABASE_BROWSER_KEY" ] || [ -z "${TURNSTILE_SITE_KEY:-}" ]; then
  echo "KiddoSprout account configuration is incomplete. Run npm run dev for local Docker, or provide the three production browser settings." >&2
  exit 1
fi

while [ "${SUPABASE_URL%/}" != "$SUPABASE_URL" ]; do
  SUPABASE_URL=${SUPABASE_URL%/}
done
if ! is_supported_supabase_url "$SUPABASE_URL"; then
  echo "SUPABASE_URL must be a managed HTTPS Supabase origin or the local loopback Auth origin." >&2
  exit 1
fi
if ! is_browser_safe_supabase_key "$SUPABASE_BROWSER_KEY"; then
  echo "SUPABASE_PUBLISHABLE_KEY must be a browser-safe publishable or legacy anon key. Secret and service-role keys are forbidden." >&2
  exit 1
fi
if [ ${#TURNSTILE_SITE_KEY} -lt 20 ]; then
  echo "TURNSTILE_SITE_KEY is not a valid sitekey." >&2
  exit 1
fi
case "$TURNSTILE_SITE_KEY" in
  *[!A-Za-z0-9_-]*)
    echo "TURNSTILE_SITE_KEY contains invalid characters." >&2
    exit 1
    ;;
esac

case "${TURNSTILE_SITE_KEY}" in
  1x00000000000000000000AA|2x00000000000000000000AB|1x00000000000000000000BB|2x00000000000000000000BB|3x00000000000000000000FF)
    if [ "$PUBLIC_DEMO_SETTING" = "false" ]; then
      echo "PUBLIC_DEMO_ONLY=false requires a real Turnstile sitekey; Cloudflare test sitekeys are forbidden." >&2
      exit 1
    fi
    case "${SUPABASE_URL}" in
      http://127.0.0.1:*|http://localhost:*) ;;
      *)
        echo "Cloudflare test sitekeys are allowed only with the loopback Supabase stack started by npm run dev." >&2
        exit 1
        ;;
    esac
    ;;
esac
if [ "$EMAIL_DELIVERY_READY" != "true" ] && [ "$GOOGLE_AUTH_READY_VALUE" != "true" ]; then
  echo "KiddoSprout is starting in existing-account mode. New parent signup stays disabled until Google or external email is configured." >&2
fi

cat > "$CONFIG_TEMP" <<EOF
window.KIDDO_SPROUT_SUPABASE = Object.freeze({
  publicDemoOnly: false,
  url: "${SUPABASE_URL:-}",
  publishableKey: "$SUPABASE_BROWSER_KEY",
  turnstileSiteKey: "${TURNSTILE_SITE_KEY:-}",
  emailDeliveryReady: $EMAIL_DELIVERY_READY,
  googleAuthReady: $GOOGLE_AUTH_READY_VALUE
});
EOF

mv "$CONFIG_TEMP" "$CONFIG_TARGET"
trap - EXIT
