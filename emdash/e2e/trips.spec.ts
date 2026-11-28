import { expect, test, type Locator } from "@playwright/test";
import { stubExternalAssets } from "./support/network";

// Fixture walks and trips live in e2e/fixtures/walks.json and travel.json

/** Hover on desktop, tap on touch devices: how readers point at a waypoint. */
async function pointAt(target: Locator) {
	if (test.info().project.use.hasTouch) await target.tap();
	else await target.hover();
}

test.describe("Walks and travel indexes", () => {
	test("lists walks newest first", async ({ page }) => {
		await page.goto("/walks/");

		await expect(page).toHaveTitle("Walks — Biscuit Crumbs");
		await expect(page.getByRole("heading", { level: 1, name: "Walks" })).toBeAttached();
		const walks = page.getByRole("main").getByRole("listitem");
		await expect(walks).toHaveText(["Seven Sisters", "Box Hill"]);
		await expect(walks.first().getByRole("link")).toHaveAttribute("href", "/walks/seven-sisters/");
	});

	test("lists trips newest first, after a link to the logbook", async ({ page }) => {
		await page.goto("/travel/");

		await expect(page).toHaveTitle("Travel — Biscuit Crumbs");
		const links = page.getByRole("main").getByRole("link");
		await expect(links).toHaveText(["Logbook", "Round the world", "New York"]);
		await expect(links.first()).toHaveAttribute("href", "/travel/logbook/");
	});
});

test.describe("Trip page", () => {
	test.beforeEach(async ({ page }) => {
		await stubExternalAssets(page);
	});

	test("summarises the route", async ({ page }) => {
		await page.goto("/walks/seven-sisters/");

		await expect(page).toHaveTitle("Seven Sisters — Biscuit Crumbs");
		await expect(page.getByRole("heading", { level: 1, name: "Seven Sisters" })).toBeVisible();

		const summary = page.getByRole("list", { name: "Route summary" });
		await expect(summary.getByRole("listitem")).toHaveText([
			"Eastbourne to East Dean",
			"Linear",
			"11km",
			"3 hours",
			"AllTrails",
		]);
		await expect(summary.getByRole("link", { name: "AllTrails" })).toHaveAttribute(
			"href",
			"https://www.alltrails.com/explore/map/seven-sisters",
		);
		await expect(page.getByRole("main")).toContainText("Via Birling Gap and the Seven Sisters cliffs.");
	});

	test("names a circular walk's start once", async ({ page }) => {
		await page.goto("/walks/box-hill/");

		const summary = page.getByRole("list", { name: "Route summary" });
		await expect(summary.getByRole("listitem")).toHaveText(["Box Hill", "Circular", "8km", "2.5 hours"]);
	});

	test("draws the route on a map", async ({ page }) => {
		await page.goto("/walks/seven-sisters/");

		const map = page.getByRole("region", { name: "Map of the route" });
		await expect(map).toBeVisible();
		await expect(map.locator("path.route-line")).toBeVisible();
		await expect(map).toContainText("OpenStreetMap");
	});

	test("centres the map on the trip when there's no route file", async ({ page }) => {
		const { tileRequests } = await stubExternalAssets(page);
		await page.goto("/travel/new-york/");

		await expect(page.getByRole("region", { name: "Map of the route" })).toBeVisible();
		// Zoom 11 tile containing 40.7634, -73.9805 (Midtown Manhattan)
		await expect.poll(() => tileRequests.some((url) => url.includes("/11/603/769"))).toBe(true);
	});

	test("marks a waypoint on the map when the reader points at it", async ({ page }) => {
		await page.goto("/walks/seven-sisters/");
		const map = page.getByRole("region", { name: "Map of the route" });
		await expect(map.locator("path.route-line")).toBeVisible();

		await pointAt(page.getByRole("region", { name: "Birling Gap" }));
		const viewpoint = map.getByRole("img", { name: "Birling Gap" });
		await expect(viewpoint).toBeVisible();
		const pinIcon = await viewpoint.getAttribute("src");

		await pointAt(page.getByRole("region", { name: "Tea room" }));
		const teaRoom = map.getByRole("img", { name: "Tea room" });
		await expect(teaRoom).toBeVisible();
		await expect(map.getByRole("img", { name: "Birling Gap" })).toHaveCount(0);
		// Food stops get their own marker icon
		await expect(teaRoom).not.toHaveAttribute("src", pinIcon ?? "");
	});

	test("shows a waypoint's position, photos, videos and notes", async ({ page }) => {
		await page.goto("/walks/seven-sisters/");

		const waypoint = page.getByRole("region", { name: "Birling Gap" });
		await expect(waypoint.getByRole("heading")).toHaveText("50.742, 0.2032 – Birling Gap");
		await expect(waypoint).toContainText("The cliffs drop straight to the beach here.");
		await expect(waypoint.locator("iframe[title='Waves at Birling Gap']")).toHaveAttribute(
			"src",
			"https://www.youtube.com/embed/fixture",
		);

		const cliffs = waypoint.getByRole("img", { name: "White chalk cliffs" });
		const beach = waypoint.getByRole("img", { name: "Pebble beach" });
		const lighthouse = waypoint.getByRole("img", { name: "Belle Tout lighthouse" });
		await expect(lighthouse).toBeVisible();
		const [cliffsBox, beachBox, lighthouseBox] = await Promise.all(
			[cliffs, beach, lighthouse].map((image) => image.boundingBox()),
		);
		// The first two photos share a row; the third starts a new one
		expect(beachBox?.y).toBe(cliffsBox?.y);
		expect(lighthouseBox!.y).toBeGreaterThan(cliffsBox!.y + cliffsBox!.height);
	});

	test("sends photos at a size that fits the page, not the full-size original", async ({ page }) => {
		await page.goto("/walks/seven-sisters/");

		// The fixture photo is a 2400 px wide original in the media library
		const scones = page.getByRole("region", { name: "Tea room" }).getByRole("img", { name: "Scones on a plate" });
		await scones.scrollIntoViewIfNeeded();
		await expect.poll(() => scones.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth)).toBeTruthy();

		// naturalWidth is scaled by the screen's pixel density, so measure the file the browser chose
		const { loadedWidth, shownWidth } = await scones.evaluate(async (image: HTMLImageElement) => {
			const photo = await createImageBitmap(await (await fetch(image.currentSrc)).blob());
			return {
				loadedWidth: photo.width,
				shownWidth: image.getBoundingClientRect().width * window.devicePixelRatio,
			};
		});
		expect(loadedWidth).toBeLessThan(2400);
		// Still sharp: at least as many pixels as the screen shows, within one size step
		expect(loadedWidth).toBeGreaterThanOrEqual(Math.min(shownWidth, 1280) * 0.75);
	});

	test("shows waypoints without coordinates, without marking them on the map", async ({ page }) => {
		await page.goto("/walks/seven-sisters/");
		const map = page.getByRole("region", { name: "Map of the route" });
		await expect(map.locator("path.route-line")).toBeVisible();

		const waypoint = page.getByRole("region", { name: "Cuckmere Haven" });
		await expect(waypoint.getByRole("heading")).toHaveText("Cuckmere Haven");
		await pointAt(waypoint);
		await expect(map.locator(".leaflet-marker-icon")).toHaveCount(0);
	});

	test("plays the headline video in place of a map", async ({ page }) => {
		await page.goto("/travel/round-the-world/");

		const video = page.locator("iframe[title='2024 Round the world']");
		await expect(video).toHaveAttribute("src", /^https:\/\/player\.vimeo\.com\/video\/1065483186\?h=46c1385b66/);
		await expect(page.getByRole("region", { name: "Map of the route" })).toHaveCount(0);
		await expect(page.getByRole("main")).toContainText("Five months, mostly by train.");
	});

	test("bundles the map library with the site", async ({ page }) => {
		const hosts = new Set<string>();
		page.on("request", (request) => hosts.add(new URL(request.url()).hostname));

		await page.goto("/walks/seven-sisters/");
		await expect(page.getByRole("region", { name: "Map of the route" }).locator("path.route-line")).toBeVisible();

		expect([...hosts].filter((host) => /unpkg|cdnjs|jsdelivr/.test(host))).toEqual([]);
	});

	test("fits narrow screens without sideways scrolling", async ({ page }) => {
		await page.setViewportSize({ width: 360, height: 740 });
		await page.goto("/walks/seven-sisters/");

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
		);
		expect(overflow).toBeLessThanOrEqual(0);
	});

	test("keeps only the map in view as the reader scrolls the story on a phone", async ({ page }) => {
		await page.setViewportSize({ width: 360, height: 740 });
		await page.goto("/walks/seven-sisters/");
		const map = page.getByRole("region", { name: "Map of the route" });
		const summary = page.getByRole("list", { name: "Route summary" });
		await expect(map).toBeVisible();

		await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

		await expect.poll(async () => (await map.boundingBox())?.y).toBe(0);
		await expect(summary).not.toBeInViewport();
	});

	test("keeps drafts private and shows the not-found page for unknown trips", async ({ page }) => {
		expect((await page.goto("/walks/unfinished-walk/"))?.status()).toBe(404);
		expect((await page.goto("/travel/no-such-trip/"))?.status()).toBe(404);
		await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
	});
});
