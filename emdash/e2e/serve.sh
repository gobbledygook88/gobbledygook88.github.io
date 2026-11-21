#!/usr/bin/env bash
# Build the site with the test-only seed (real schema + fixture content) and
# serve the Worker locally, starting from an empty local database.
set -euo pipefail

port="$1"
state_dir="$2"

cd "$(dirname "$0")/.."
rm -rf "$state_dir"

# EmDash prefers .emdash/seed.json over the real seed: only keep it for the build
trap 'rm -f .emdash/seed.json' EXIT
node e2e/fixtures/prepare.mjs
pnpm build
rm -f .emdash/seed.json

exec pnpm wrangler dev --port "$port" --persist-to "$state_dir"
