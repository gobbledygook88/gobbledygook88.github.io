// Builds the test-only seed: the real schema (seed/seed.json) plus fixture
// content from e2e/fixtures/<collection>.json. EmDash prefers .emdash/seed.json
// over the seed named in package.json, so the e2e build picks this up;
// e2e/serve.sh deletes it again straight after building.
//
// Seeds can't set publish dates, so dated fixtures are given their dates by
// e2e/global-setup.ts once the content has been applied.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const fixturesDir = new URL("./", import.meta.url);
const readJson = (url) => JSON.parse(readFileSync(url, "utf8"));
const withoutDates = (entries) => entries.map(({ publishedAt: _publishedAt, ...entry }) => entry);

const seed = readJson(new URL("../../seed/seed.json", import.meta.url));
seed.content = Object.fromEntries(
	readdirSync(fixturesDir)
		.filter((file) => file.endsWith(".json"))
		.map((file) => [file.replace(/\.json$/, ""), withoutDates(readJson(new URL(file, fixturesDir)))]),
);

mkdirSync(new URL("../../.emdash/", import.meta.url), { recursive: true });
writeFileSync(new URL("../../.emdash/seed.json", import.meta.url), JSON.stringify(seed, null, "\t"));
