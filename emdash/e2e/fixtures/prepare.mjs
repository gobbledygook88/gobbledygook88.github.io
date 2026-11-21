// Builds the test-only seed: the real schema (seed/seed.json) plus fixture
// content from e2e/fixtures. EmDash prefers .emdash/seed.json over the seed
// named in package.json, so the e2e build picks this up; e2e/serve.sh deletes
// it again straight after building.
//
// Seeds can't set publish dates, so dated fixtures are given their dates by
// e2e/global-setup.ts once the seed has been applied.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

const seed = readJson("../../seed/seed.json");
const posts = readJson("./posts.json");

const withoutDates = (entries) => entries.map(({ publishedAt: _publishedAt, ...entry }) => entry);

seed.content = { posts: withoutDates(posts) };

mkdirSync(new URL("../../.emdash/", import.meta.url), { recursive: true });
writeFileSync(new URL("../../.emdash/seed.json", import.meta.url), JSON.stringify(seed, null, "\t"));
