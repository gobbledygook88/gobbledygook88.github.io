import { existsSync } from "node:fs";
import { join } from "node:path";

/** The old site's files an import references, checked to exist on disk. */
export class MediaFiles {
	readonly paths = new Set<string>();
	readonly warnings: string[] = [];
	readonly #siteRoot: string;

	// Plain fields, not parameter properties: Node runs this file by stripping types
	constructor(siteRoot: string) {
		this.#siteRoot = siteRoot;
	}

	/** Records a file to upload; returns false (and warns) if it doesn't exist. */
	use(path: string, referencedBy: string): boolean {
		if (!existsSync(join(this.#siteRoot, path))) {
			this.warnings.push(`${referencedBy}: skipped missing file ${path}`);
			return false;
		}
		this.paths.add(path);
		return true;
	}
}
