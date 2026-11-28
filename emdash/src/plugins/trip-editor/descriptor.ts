import { fileURLToPath } from "node:url";
import type { PluginDescriptor } from "emdash";
import { TRIP_EDITOR_ID, TRIP_EDITOR_VERSION, type TripEditorOptions } from "./identity";

/**
 * The site's own native plugin for editing walks and travel trips. Lives in the
 * site rather than a package, so its entrypoints are file paths.
 *
 * Registered in astro.config.mjs; the runtime half is ./plugin.ts.
 */
export function tripEditorPlugin(): PluginDescriptor<TripEditorOptions> {
	const adminEntry = fileURLToPath(new URL("./admin/index.tsx", import.meta.url));
	return {
		id: TRIP_EDITOR_ID,
		version: TRIP_EDITOR_VERSION,
		format: "native",
		entrypoint: fileURLToPath(new URL("./plugin.ts", import.meta.url)),
		adminEntry,
		options: { adminEntry },
	};
}
