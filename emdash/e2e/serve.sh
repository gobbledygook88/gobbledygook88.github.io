#!/usr/bin/env bash
# Build the site and serve the Worker locally for end-to-end tests,
# starting from an empty local database so the seed is applied fresh.
set -euo pipefail

port="${1:-8788}"
state_dir=".wrangler/e2e-state"

cd "$(dirname "$0")/.."
rm -rf "$state_dir"
pnpm build
exec pnpm wrangler dev --port "$port" --persist-to "$state_dir"
