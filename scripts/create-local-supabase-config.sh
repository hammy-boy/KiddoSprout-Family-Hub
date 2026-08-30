#!/bin/sh
set -eu

if [ ! -f .env ]; then
  echo "Missing .env. Copy .env.example to .env first."
  exit 1
fi

set -a
. ./.env
set +a

cat > supabase-config.js <<EOF
window.KIDDO_SPROUT_SUPABASE = {
  url: "${SUPABASE_URL:-}",
  publishableKey: "${SUPABASE_PUBLISHABLE_KEY:-${SUPABASE_ANON_KEY:-}}"
};
EOF

echo "Created supabase-config.js for local testing. It is ignored by Git."
