#!/bin/sh
set -eu

cat > /usr/share/nginx/html/supabase-config.js <<EOF
window.KIDDO_SPROUT_SUPABASE = {
  url: "${SUPABASE_URL:-}",
  publishableKey: "${SUPABASE_PUBLISHABLE_KEY:-${SUPABASE_ANON_KEY:-}}"
};
EOF
