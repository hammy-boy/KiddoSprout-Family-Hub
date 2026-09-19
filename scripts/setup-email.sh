#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$PROJECT_DIR"

if [ ! -t 0 ]; then
  echo "Run npm run setup:email in an interactive Terminal window." >&2
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi
chmod 600 .env

for required_name in SMTP_HOST SMTP_PORT SMTP_USER SMTP_FROM; do
  required_value=$(sed -n "s/^${required_name}=//p" .env | tail -n 1)
  if [ -z "$required_value" ]; then
    echo "$required_name is missing from .env. Add the SMTP provider setting first." >&2
    exit 1
  fi
done

echo "KiddoSprout owner email setup"
echo "Use an SMTP-specific password or sending-only API key from your provider."
echo "Never enter the password for your normal email account."
echo "For Resend use smtp.resend.com, port 587, username resend, and a key scoped to your verified sending domain."
printf "SMTP password or API key (hidden): "

APP_PASSWORD=""
ENV_TEMP=""

restore_terminal() {
  stty echo >/dev/null 2>&1 || true
}

cleanup() {
  restore_terminal
  if [ -n "$ENV_TEMP" ] && [ -f "$ENV_TEMP" ]; then
    rm -f -- "$ENV_TEMP"
  fi
}

trap cleanup EXIT HUP INT TERM
stty -echo
IFS= read -r APP_PASSWORD
restore_terminal
printf "\n"

if [ -z "$APP_PASSWORD" ]; then
  echo "No SMTP credential was entered. Nothing was saved." >&2
  exit 1
fi

# Store the credential as a quoted .env value. Escaping shell metacharacters keeps
# provider-issued credentials literal when the local launcher reads the private file.
APP_PASSWORD_ESCAPED=$(printf "%s" "$APP_PASSWORD" | sed 's/\\/\\\\/g; s/"/\\"/g; s/`/\\`/g; s/\$/\\$/g')

ENV_TEMP=$(mktemp "${TMPDIR:-/tmp}/kiddosprout-env.XXXXXX")
FOUND_SMTP_PASS=false
while IFS= read -r env_line || [ -n "$env_line" ]; do
  case "$env_line" in
    SMTP_PASS=*)
      printf 'SMTP_PASS="%s"\n' "$APP_PASSWORD_ESCAPED" >> "$ENV_TEMP"
      FOUND_SMTP_PASS=true
      ;;
    *)
      printf "%s\n" "$env_line" >> "$ENV_TEMP"
      ;;
  esac
done < .env

if [ "$FOUND_SMTP_PASS" = false ]; then
  printf 'SMTP_PASS="%s"\n' "$APP_PASSWORD_ESCAPED" >> "$ENV_TEMP"
fi

chmod 600 "$ENV_TEMP"
mv "$ENV_TEMP" .env
ENV_TEMP=""
APP_PASSWORD=""
APP_PASSWORD_ESCAPED=""

echo "SMTP credential saved privately. Checking the non-secret configuration..."
node scripts/email-readiness.mjs
echo "Starting KiddoSprout and its local account service..."
npm run dev
