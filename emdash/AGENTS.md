This is an EmDash site -- a CMS built on Astro with a full admin UI.

## Commands

```bash
pnpm dev                 # Start the Astro dev server
pnpm test:e2e            # Build, serve with wrangler dev, run Playwright tests
pnpx emdash types        # Regenerate TypeScript types from a running site
```

The admin UI is at `http://localhost:4321/_emdash/admin`.

## Key Files

| File                     | Purpose                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `astro.config.mjs`       | Astro config with `emdash()` integration, database, and storage                    |
| `src/live.config.ts`     | EmDash loader registration (boilerplate -- don't modify)                           |
| `seed/seed.json`         | Schema definition + demo content (collections, fields, taxonomies, menus, widgets) |
| `emdash-env.d.ts`        | Generated types for collections (auto-regenerated on dev server start)             |
| `src/layouts/SiteLayout.astro` | Page shell: head, EmDash SEO/plugin hooks, banner, `<main>`                  |
| `src/pages/`             | Astro pages -- all server-rendered                                                 |

## Skills

Agent skills are in `.agents/skills/`. Load them when working on specific tasks:

- **building-emdash-site** -- Querying content, rendering Portable Text, schema design, seed files, site features (menus, widgets, search, SEO, comments, bylines). Start here.
- **creating-plugins** -- Building EmDash plugins with hooks, storage, admin UI, API routes, and Portable Text block types.
- **emdash-cli** -- CLI commands for content management, seeding, type generation, and visual editing flow.

## Documentation

The EmDash docs are available as an MCP server at `https://docs.emdashcms.com/mcp`. When you need to verify an API, hook, config option, field type, or pattern, call `search_docs` against the live documentation rather than relying on training-data recall. The docs reflect current behaviour; assumptions may not.

This template ships with `.mcp.json`, `.cursor/mcp.json`, and `.vscode/mcp.json` so Claude Code, Cursor, and VS Code auto-discover the docs server. Other tools (OpenCode, Windsurf, etc.) need a manual one-time setup -- see [docs.emdashcms.com/docs-mcp](https://docs.emdashcms.com/docs-mcp).

## Rules

- All content pages must be server-rendered (`output: "server"`). No `getStaticPaths()` for CMS content.
- Image fields are objects (`{ src, alt }`), not strings. Use `<Image image={...} />` from `"emdash/ui"`.
- `entry.id` is the slug (for URLs). `entry.data.id` is the database ULID (for API calls like `getEntryTerms`).
- When Astro's cache is enabled, pass content-query hints to `Astro.cache.set(cacheHint)`. Use the `WithCacheHint` variants for site settings, menus, taxonomies, and widget areas rendered by cached routes.
- Taxonomy names in queries must match the seed's `"name"` field exactly (e.g., `"category"` not `"categories"`).

## This Site

Biscuit Crumbs (marcusmo.co.uk): a personal blog, walks and travel site, migrated from a custom Python
static generator (removed; see git history before #192). The only Python left is the logbook data pipeline
(`logbook/` and `scripts/` at the repo root, run by `scripts/update-logbook-data.sh`). The migration plan
and progress log live outside git in `.context/emdash-migration-plan.md` at the repo root.

### Pages

| Page | Path | Notes |
| ---- | ---- | ----- |
| Home | `/` | Site name, section links, and a procedural valley along the bottom (`Landscape.astro`, `scripts/landscape/`): two hills, a stream, a forest and a trail where a hiker walks and startles birds. Drawn in the browser from a random seed (generating it on the Worker would eat the Free plan's 10 ms CPU budget); a tap draws a new one |
| 404  | any unknown path | Uses `SiteLayout` |
| Blog | `/blog/` | Published posts, newest first |
| Blog post | `/blog/[slug]/` | `PostBody.astro`: Portable Text with `CodeBlock` (plain `<pre><code>` from the server; `scripts/code-highlighter.ts` colours it in the browser with highlight.js, Solarized Light, loaded only on pages with code) and `MathFormula` (`math` objects with a `latex` string, inline or block; KaTeX to MathML in `src/lib/math.ts`) |
| Walks / Travel | `/walks/`, `/travel/` | Newest first (`EntryList.astro`); travel starts with a Logbook link |
| Walk / trip | `/walks/[slug]/`, `/travel/[slug]/` | `components/trip/TripPage.astro`: sticky map (`RouteMap` + `scripts/route-map.ts`, Leaflet bundled, OpenStreetMap tiles), headline video, route summary, then the story and `Waypoint`s. Hovering/tapping a waypoint with coordinates moves the map marker |
| Logbook | `/travel/logbook/` | Static data, not CMS content: statistics in `src/data/logbook-statistics.json` and map layers in `public/travel/logbook/*.geojson`, regenerated from the repo root's `logbook/` by `scripts/update-logbook-data.sh` (runs the Python pipeline). Maps load when scrolled to (`scripts/logbook-map.ts`); thousands of places draw on one canvas |

URLs must match the old site (`/<section>/<slug>/`, as set in each collection's `urlPattern`). The template's blog pages, styles and Inter/JetBrains fonts were removed.

### Schema

See `seed/seed.json`: `posts` (blog), `walks` and `travel` (identical trip fields plus a `waypoints`
blocks field of `waypoint` blocks), `pages`; taxonomies `category` and `tag`. The seed only applies to an
empty database: after setup, change the live schema through the admin, CLI or API and keep the seed in step.

### Styling

- `src/styles/site.css`: cascade layers (`reset`, `base`, `layout`), design tokens on `:root`
  (`--color-*`, `--font-site`, `--content-width`), and the `.site` content column.
- Component styles are scoped in their `.astro` files. Use logical properties and native nesting.
- Oxygen is self-hosted via Astro's font API (`--font-oxygen`); never load fonts from a third party.
- Maps share `src/scripts/map-base.ts` (Leaflet bundled from npm, OpenStreetMap tiles). The reset in
  `site.css` skips anything inside `.leaflet-container`, which sizes its own tiles, markers and canvases.
- Keep the look of the original site: minimal, centred, Oxygen, orange `--color-accent` links in posts.

### Environments and deployment

| Environment | Worker | Used for |
| ----------- | ------ | -------- |
| production | `biscuit-crumbs` (`env.production` in `wrangler.jsonc`), serving https://marcusmo.co.uk | The live site. **All content is written here** |
| staging | `biscuit-crumbs-staging` (top level of `wrangler.jsonc`) | Backs PR previews (`pr-<n>-biscuit-crumbs-staging…workers.dev`); its content is a test copy |

Continuous deployment (`.github/workflows/emdash.yml`): a merge to `main` runs the tests, then migrates
and deploys staging, then production (`CLOUDFLARE_ENV=production` at build time). Each environment has its
own D1, R2 and KV; never point one at the other's. Schema changes made in an admin (fields, block types)
are database state: apply them to production and staging, and keep `seed/seed.json` in step.

### Performance: Workers Free (10 ms CPU per request)

The site runs on the Workers **Free** plan, which allows 10 ms of CPU per request (error 1102 beyond it).
Keep server rendering cheap: no syntax highlighting or other heavy work per request (server-side Shiki
took ~500 ms for one post). Rendered pages are cached at the edge (`cache` + `routeRules` in
`astro.config.mjs`); every new public route needs a rule tagged with its collection so EmDash purges it
on publish. Check CPU with `wrangler tail biscuit-crumbs-staging --format json` (`cpuTime`, `outcome`).

### Testing

Outside-in Playwright tests in `e2e/` drive the built Worker (`e2e/serve.sh`) on desktop and mobile.
Fixture content lives in `e2e/fixtures/*.json` (seed entries plus a `publishedAt`): the test build uses
a test-only seed, and `e2e/global-setup.ts` completes setup with content and sets publish dates.
Fixture files (route GeoJSON, photos) use the fake host `https://fixtures.test/`; `e2e/support/network.ts`
serves them, map tiles and video players from `e2e/fixtures/files/` so tests run offline.
Write the test first (it must fail for the right reason), then implement. Describe behaviour a visitor
sees, not implementation. CI runs them before deploying staging.
