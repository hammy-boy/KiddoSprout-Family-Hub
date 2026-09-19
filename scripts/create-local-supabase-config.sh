#!/bin/sh
set -eu

SCRIPT_DIRECTORY=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIRECTORY=$(dirname -- "$SCRIPT_DIRECTORY")

exec node "$SCRIPT_DIRECTORY/create-local-supabase-config.mjs" "$PROJECT_DIRECTORY"
