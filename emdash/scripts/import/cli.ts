/**
 * Imports the old site's content into EmDash.
 *
 *   pnpm import:legacy --source ../app --url https://biscuit-crumbs-staging.marcusmo88.workers.dev
 *   pnpm import:legacy --source ../app --dry-run [--only posts|walks|travel] [--slug <slug>]
 *
 * --dry-run prints the planned entries and uploads as JSON without contacting
 * EmDash. Otherwise files are uploaded (EmDash deduplicates them by content)
 * and entries are created, or updated by slug, so the import can be re-run.
 * Auth comes from `emdash login --url <url>`, or EMDASH_TOKEN.
 */
import { parseArgs } from "node:util";
import { type ImportPlan, planImport } from "./convert.ts";
import { readLegacySite } from "./legacy.ts";
import { publishPlan } from "./publish.ts";

const { values: options } = parseArgs({
	options: {
		source: { type: "string" },
		url: { type: "string" },
		"dry-run": { type: "boolean", default: false },
		only: { type: "string" },
		slug: { type: "string" },
	},
});

if (!options.source) {
	console.error("Usage: --source <path to the old site's app/ folder> (--url <EmDash site> | --dry-run)");
	process.exit(1);
}

/** Files referenced by the given entries, so a narrowed import uploads only what it needs. */
function referencedMedia(entries: ImportPlan["entries"]): ImportPlan["media"] {
	const paths = new Set<string>();
	JSON.stringify(entries, (key, value) => {
		if (key === "$asset") paths.add(value);
		return value;
	});
	return [...paths].sort().map((path) => ({ path }));
}

// Plan everything first: same-day publish times depend on all entries
const fullPlan = planImport(readLegacySite(options.source), options.source);
const entries = fullPlan.entries.filter(
	(entry) =>
		(!options.only || entry.collection === options.only) && (!options.slug || entry.slug === options.slug),
);
const sources = new Set(entries.map((entry) => entry.source));
const plan: ImportPlan = {
	entries,
	media: referencedMedia(entries),
	// Warnings start with the file they're about
	warnings: fullPlan.warnings.filter((warning) => sources.has(warning.split(":")[0]!)),
};

if (options["dry-run"]) {
	process.stdout.write(`${JSON.stringify(plan, null, "\t")}\n`);
} else if (options.url) {
	await publishPlan(plan, { siteRoot: options.source, url: options.url });
} else {
	console.error("Pass --url <EmDash site> to import, or --dry-run to preview");
	process.exit(1);
}
