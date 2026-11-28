#!/usr/bin/env bash
# Build the site with the test-only seed (real schema + fixture content) and
# serve the Worker locally, starting from an empty local database.
set -euo pipefail

port="$1"
state_dir="$2"
fake_strava_port="$3"

cd "$(dirname "$0")/.."
rm -rf "$state_dir"

# EmDash prefers .emdash/seed.json over the real seed: only keep it for the build
trap 'rm -f .emdash/seed.json' EXIT
node e2e/fixtures/prepare.mjs
pnpm build
rm -f .emdash/seed.json

# Strava sign-in and API calls go to the fake Strava (e2e/support/fake-strava.mjs)
exec pnpm wrangler dev --port "$port" --persist-to "$state_dir" \
	--var "STRAVA_ORIGIN:http://localhost:$fake_strava_port" \
	--var STRAVA_CLIENT_ID:test-client-id \
	--var STRAVA_CLIENT_SECRET:test-client-secret
