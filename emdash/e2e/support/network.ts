import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

const file = (name: string) => readFileSync(new URL(`../fixtures/files/${name}`, import.meta.url));

/**
 * Serves fixture files for the fake https://fixtures.test/ host used by the
 * fixture content (photos), the fixture route file from the media library, and
 * blank map tiles, so trip pages
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

	// A route file in the media library (R2), which the test server doesn't have
	await page.route("**/_emdash/api/media/file/fixture-route-storage.geojson", (route) =>
		route.fulfill({ contentType: "application/geo+json", body: file("seven-sisters.geojson") }),
	);

	await page.route(/tile\.openstreetmap\.org/, (route) => {
		tileRequests.push(route.request().url());
		return route.fulfill({ contentType: "image/png", body: file("tile.png") });
	});

	await page.route(/(youtube\.com|vimeo\.com)\//, (route) =>
		route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Video</title>" }),
	);

	return { tileRequests };
}
