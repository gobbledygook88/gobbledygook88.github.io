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
static generator (`app/` and `scripts/` at the repo root, still live until cutover). The migration plan
and progress log live outside git in `.context/emdash-migration-plan.md` at the repo root.

### Pages

| Page | Path | Notes |
| ---- | ---- | ----- |
| Home | `/` | Site name, section links, and the "crumb trail" line (`CrumbTrail.astro`) that redraws on tap |
| 404  | any unknown path | Uses `SiteLayout` |
| Blog | `/blog/` | Published posts, newest first |
| Blog post | `/blog/[slug]/` | `PostBody.astro`: Portable Text with `CodeBlock` (Shiki, server-side, Solarized Light; languages in `src/lib/highlight.ts`) and `MathFormula` (`math` objects with a `latex` string, inline or block; KaTeX to MathML in `src/lib/math.ts`) |

Walks (`/walks/`) and travel (`/travel/`) pages arrive in Phase 3.3; URLs must match the old site
(`/<section>/<slug>/`, as set in each collection's `urlPattern`). The template's blog pages, styles and Inter/JetBrains fonts were removed.

### Schema

See `seed/seed.json`: `posts` (blog), `walks` and `travel` (identical trip fields plus a `waypoints`
blocks field of `waypoint` blocks), `pages`; taxonomies `category` and `tag`. The seed only applies to an
empty database: after setup, change the live schema through the admin, CLI or API and keep the seed in step.

### Styling

- `src/styles/site.css`: cascade layers (`reset`, `base`, `layout`), design tokens on `:root`
  (`--color-*`, `--font-site`, `--content-width`), and the `.site` content column.
- Component styles are scoped in their `.astro` files. Use logical properties and native nesting.
- Oxygen is self-hosted via Astro's font API (`--font-oxygen`); never load fonts from a third party.
- Keep the look of the original site: minimal, centred, Oxygen, orange `--color-accent` links in posts.

### Testing

Outside-in Playwright tests in `e2e/` drive the built Worker (`e2e/serve.sh`) on desktop and mobile.
Fixture content lives in `e2e/fixtures/*.json` (seed entries plus a `publishedAt`): the test build uses
a test-only seed, and `e2e/global-setup.ts` completes setup with content and sets publish dates.
Write the test first (it must fail for the right reason), then implement. Describe behaviour a visitor
sees, not implementation. CI runs them before deploying staging.
