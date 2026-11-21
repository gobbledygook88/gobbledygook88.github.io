import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

const file = (name: string) => readFileSync(new URL(`../fixtures/files/${name}`, import.meta.url));

/**
 * Serves fixture files for the fake https://fixtures.test/ host used by the
 * fixture content (route GeoJSON, photos), and blank map tiles, so trip pages
 * render the same way every run without the network.
 *
 * Returns the tile URLs requested, for asserting where the map looked.
 */
export async function stubExternalAssets(page: Page) {
	const tileRequests: string[] = [];

	await page.route("https://fixtures.test/**", (route) => {
		const name = new URL(route.request().url()).pathname.slice(1);
		if (name.endsWith(".geojson")) {
			return route.fulfill({ contentType: "application/geo+json", body: file(name) });
		}
		return route.fulfill({ contentType: "image/png", body: file("photo.png") });
	});

	await page.route(/basemaps\.cartocdn\.com/, (route) => {
		tileRequests.push(route.request().url());
		return route.fulfill({ contentType: "image/png", body: file("tile.png") });
	});

	await page.route(/(youtube\.com|vimeo\.com)\//, (route) =>
		route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Video</title>" }),
	);

	return { tileRequests };
}
