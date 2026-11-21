Biscuit Crumbs
==============

A blog. My blog? Not really a blog. More, a collection of biscuit crumbs.

The source for [marcusmo.co.uk](https://marcusmo.co.uk): blog posts, walks and travel, built with
[EmDash](https://github.com/emdash-cms/emdash) (Astro) on Cloudflare Workers, with D1 and R2.

## Layout

| Path | What |
| ---- | ---- |
| `emdash/` | The site: Astro pages, components, schema seed and Playwright tests. See `emdash/AGENTS.md` |
| `logbook/`, `scripts/` | Inputs and Python pipeline for the logbook page's map data |
| `.github/workflows/` | CI and deployment |

Content is not in git. Posts, walks and trips are written in the EmDash admin at
https://marcusmo.co.uk/_emdash/admin and stored in the production D1 database and R2 bucket.

## Local development

From `emdash/`:

    nvm use              # Node version from .nvmrc
    pnpm install
    pnpm dev             # http://localhost:4321, admin at /_emdash/admin

To run the built Worker as it runs on Cloudflare, and the browser tests:

    pnpm build && pnpm wrangler dev
    pnpm test:e2e        # builds, serves with wrangler dev, runs Playwright

The local site uses its own database, so complete the admin setup wizard on first run.

## Deployment

Continuous deployment runs from `.github/workflows/emdash.yml`:

- **Pull requests** get a Workers preview, backed by the staging database.
- **Merges to `main`** run the tests, then deploy staging (Worker `biscuit-crumbs-staging`), then
  production (Worker `biscuit-crumbs`, serving marcusmo.co.uk).

## Logbook data

The logbook page (`/travel/logbook/`) is static data, not CMS content. To update it after a Google
Takeout export:

1. Update the inputs in `logbook/`: `timeline_statistics.json` (from the Takeout location history)
   and `locations.csv` (countries and areas visited).
2. Run the pipeline from the repo root (needs [uv](https://docs.astral.sh/uv/)). Add
   `--fetch-all-geojson` to re-download the country, state and county boundaries:

       emdash/scripts/update-logbook-data.sh

3. Commit the regenerated `emdash/public/travel/logbook/*.geojson` map layers and
   `emdash/src/data/logbook-statistics.json`. They deploy with the site.
