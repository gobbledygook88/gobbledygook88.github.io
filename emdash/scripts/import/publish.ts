/**
 * Carries out an import plan against a live EmDash site: uploads files,
 * creates missing taxonomy terms, then creates or updates each entry by slug.
 * Safe to re-run: uploads deduplicate by content and entries are matched by slug.
 */
import { readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import type { ImportPlan, PlannedEntry } from "./convert.ts";
import { EmDashApi, type MediaItem } from "./emdash-api.ts";

interface PublishOptions {
	siteRoot: string;
	url: string;
}

const MIME_TYPES: Record<string, string> = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".gif": "image/gif",
	".webp": "image/webp",
	".geojson": "application/geo+json",
};

/** Map files sit beside their trip (`_walks/…`), so their folder names the collection. */
const MAP_FILE_COLLECTIONS: Record<string, string> = { _walks: "walks", _travel: "travel" };

async function uploadMedia(api: EmDashApi, plan: ImportPlan, siteRoot: string) {
	const mapFieldIds: Record<string, string | undefined> = {};
	for (const [folder, collection] of Object.entries(MAP_FILE_COLLECTIONS)) {
		mapFieldIds[folder] = (await api.fieldIds(collection)).map_data;
	}

	const uploaded = new Map<string, MediaItem>();
	for (const [index, { path }] of plan.media.entries()) {
		const extension = extname(path).toLowerCase();
		const file = new Blob([readFileSync(join(siteRoot, path))], {
			type: MIME_TYPES[extension] ?? "application/octet-stream",
		});
		// GeoJSON is only allowed when uploaded for the map_data field
		const fieldId = extension === ".geojson" ? mapFieldIds[path.split("/")[0]!] : undefined;
		uploaded.set(path, await api.upload(file, basename(path), fieldId));
		process.stderr.write(`\ruploaded ${index + 1}/${plan.media.length} files`);
	}
	process.stderr.write("\n");
	return uploaded;
}

/**
 * Swaps each `{ $asset: path }` placeholder for the uploaded media, in the
 * shape its place expects: a Portable Text image's `asset`, a file field
 * (the GeoJSON), or an image field.
 */
function withMedia(value: unknown, uploaded: Map<string, MediaItem>, key?: string): unknown {
	if (Array.isArray(value)) return value.map((item) => withMedia(item, uploaded));
	if (!value || typeof value !== "object") return value;

	const { $asset, ...rest } = value as Record<string, unknown>;
	if (typeof $asset !== "string") {
		return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withMedia(v, uploaded, k)]));
	}

	const media = uploaded.get($asset);
	if (!media) throw new Error(`No upload for ${$asset}`);
	if (key === "asset") return { _ref: media.id, url: media.url };
	if (media.mimeType.includes("json")) {
		return { id: media.id, url: media.url, filename: media.filename, mimeType: media.mimeType, size: media.size };
	}
	return {
		...rest,
		provider: "local",
		id: media.id,
		src: media.url,
		filename: media.filename,
		mimeType: media.mimeType,
		...(media.width ? { width: media.width } : {}),
		...(media.height ? { height: media.height } : {}),
	};
}

async function ensureTerms(api: EmDashApi, entries: PlannedEntry[]) {
	const wanted = new Map<string, Set<string>>();
	for (const entry of entries) {
		for (const [taxonomy, terms] of Object.entries(entry.taxonomies ?? {})) {
			for (const term of terms) wanted.set(taxonomy, (wanted.get(taxonomy) ?? new Set()).add(term));
		}
	}
	for (const [taxonomy, terms] of wanted) {
		const existing = await api.termSlugs(taxonomy);
		for (const term of terms) {
			if (!existing.has(term)) await api.createTerm(taxonomy, term);
		}
	}
}

async function upsertEntry(api: EmDashApi, entry: PlannedEntry, uploaded: Map<string, MediaItem>) {
	const input = {
		data: withMedia(entry.data, uploaded),
		...(entry.taxonomies ? { taxonomies: entry.taxonomies } : {}),
	};
	const existing = await api.find(entry.collection, entry.slug);
	const item = existing
		? await api.update(entry.collection, existing.id, input)
		: await api.create(entry.collection, { ...input, slug: entry.slug });
	if (entry.status === "published" && entry.publishedAt) {
		await api.publish(entry.collection, item.id, entry.publishedAt);
	}
	return existing ? "updated" : "created";
}

export async function publishPlan(plan: ImportPlan, { siteRoot, url }: PublishOptions): Promise<void> {
	const api = new EmDashApi(url);
	const uploaded = await uploadMedia(api, plan, siteRoot);
	await ensureTerms(api, plan.entries);

	const failures: string[] = [];
	for (const entry of plan.entries) {
		try {
			const outcome = await upsertEntry(api, entry, uploaded);
			console.error(`${outcome} ${entry.collection}/${entry.slug}`);
		} catch (error) {
			failures.push(`${entry.source}: ${(error as Error).message}`);
			console.error(`FAILED ${entry.collection}/${entry.slug}`);
		}
	}

	for (const warning of plan.warnings) console.error(`warning: ${warning}`);
	if (failures.length) {
		console.error(`\n${failures.length} entries failed:\n${failures.join("\n")}`);
		process.exitCode = 1;
	}
}
