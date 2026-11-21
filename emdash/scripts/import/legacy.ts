/** Reads the old site's content files: app/_blog, _drafts, _walks and _travel. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export type Collection = "posts" | "walks" | "travel";

export interface LegacyEntry {
	collection: Collection;
	/** Folder under the site root, e.g. "_walks" (map files are relative to it) */
	folder: string;
	/** Path relative to the site root, for messages */
	path: string;
	/** YYYY-MM-DD from the filename */
	date: string;
	slug: string;
	draft: boolean;
	frontmatter: Record<string, any>;
	body: string;
}

const FOLDERS: { folder: string; collection: Collection; draft: boolean }[] = [
	{ folder: "_blog", collection: "posts", draft: false },
	{ folder: "_drafts", collection: "posts", draft: true },
	{ folder: "_walks", collection: "walks", draft: false },
	{ folder: "_travel", collection: "travel", draft: false },
];

const FILENAME = /^(\d{4}-\d{2}-\d{2})-(.+)\.md$/;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function readEntry(siteRoot: string, folder: string, file: string) {
	const match = FILENAME.exec(file);
	if (!match) return undefined;
	const [, date, slug] = match as unknown as [string, string, string];
	const source = readFileSync(join(siteRoot, folder, file), "utf8");
	const parts = FRONTMATTER.exec(source);
	return {
		date,
		slug,
		frontmatter: (parts ? parseYaml(parts[1]!) : {}) ?? {},
		body: parts ? parts[2]! : source,
	};
}

export function readLegacySite(siteRoot: string): LegacyEntry[] {
	return FOLDERS.flatMap(({ folder, collection, draft }) =>
		readdirSync(join(siteRoot, folder))
			.sort()
			.flatMap((file) => {
				const entry = readEntry(siteRoot, folder, file);
				return entry ? [{ collection, folder, path: `${folder}/${file}`, draft, ...entry }] : [];
			}),
	);
}
