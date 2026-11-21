import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { stubExternalAssets } from "./support/network";

// The logbook shows real data: regenerate it with scripts/update-logbook-data.sh
const stats = JSON.parse(
	readFileSync(new URL("../src/data/logbook-statistics.json", import.meta.url), "utf8"),
);

test.describe("Logbook", () => {
	test.beforeEach(async ({ page }) => {
		await stubExternalAssets(page);
	});

	test("is linked from the travel page", async ({ page }) => {
		await page.goto("/travel/");
		await page.getByRole("link", { name: "Logbook" }).click();

		await expect(page).toHaveURL("/travel/logbook/");
		await expect(page).toHaveTitle("Logbook — Biscuit Crumbs");
		await expect(page.getByRole("heading", { level: 2, name: "Countries" })).toBeVisible();
	});

	test("counts the continents, countries and cities visited", async ({ page }) => {
		await page.goto("/travel/logbook/");

		const totals = page.getByRole("region", { name: "Countries" });
		await expect(totals.getByRole("term")).toHaveText([
			"Continents",
			"Countries",
			"Cities",
			...Object.keys(stats.num_countries_per_continent),
		]);
		await expect(totals.getByRole("definition").first()).toHaveText(String(stats.num_continents));
		await expect(totals.getByRole("definition").nth(1)).toHaveText(String(stats.num_countries));
		await expect(totals.getByRole("definition").nth(2)).toHaveText(`> ${stats.num_cities}`);
		await expect(totals.getByRole("definition").nth(3)).toHaveText(
			`${stats.num_countries_per_continent.Europe} / 44`,
		);
	});

	test("names the furthest places in each direction", async ({ page }) => {
		await page.goto("/travel/logbook/");

		const places = page.getByRole("region", { name: "Places" });
		for (const name of [
			stats.most_northern_place,
			stats.most_southern_place,
			stats.most_western_place,
			stats.most_eastern_place,
		]) {
			await expect(places.getByRole("definition").filter({ hasText: name })).toHaveCount(1);
		}
	});

	test("shows a place's name when its marker is selected", async ({ page }) => {
		await page.goto("/travel/logbook/");

		const map = page.getByRole("region", { name: "Map of the furthest places" });
		await map.scrollIntoViewIfNeeded();
		await map.getByRole("img", { name: stats.most_eastern_place }).click();

		await expect(map.locator(".leaflet-popup")).toHaveText(stats.most_eastern_place);
	});

	test("draws every map", async ({ page }) => {
		await page.goto("/travel/logbook/");

		for (const name of ["countries", "USA states", "UK counties", "London boroughs"]) {
			const map = page.getByRole("region", { name: `Map of ${name} visited` });
			await map.scrollIntoViewIfNeeded();
			await expect(map.locator("path.visited").first()).toBeVisible();
		}
		const places = page.getByRole("region", { name: "Map of places visited" });
		await places.scrollIntoViewIfNeeded();
		// Thousands of places are drawn on one canvas rather than as separate markers
		await expect(places.locator("canvas")).toBeVisible();
	});

	test("downloads each map's data only when the reader scrolls to it", async ({ page }) => {
		const layers: string[] = [];
		page.on("request", (request) => {
			if (request.url().endsWith(".geojson")) layers.push(new URL(request.url()).pathname);
		});

		await page.goto("/travel/logbook/");
		await expect.poll(() => layers).toContain("/travel/logbook/logbook_countries.geojson");
		expect(layers).not.toContain("/travel/logbook/logbook_london_boroughs.geojson");

		await page.getByRole("region", { name: "Map of London boroughs visited" }).scrollIntoViewIfNeeded();
		await expect.poll(() => layers).toContain("/travel/logbook/logbook_london_boroughs.geojson");
	});

	test("reports progress on states and boroughs", async ({ page }) => {
		await page.goto("/travel/logbook/");

		await expect(page.getByText(`I have visited ${stats.num_usa_states} out of 50 states.`)).toBeVisible();
		await expect(
			page.getByText(
				`I have visited ${stats.num_london_boroughs - 1} out of 32 London boroughs, and the City of London.`,
			),
		).toBeVisible();
	});

	test("fits narrow screens without sideways scrolling", async ({ page }) => {
		await page.setViewportSize({ width: 360, height: 740 });
		await page.goto("/travel/logbook/");

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
		);
		expect(overflow).toBeLessThanOrEqual(0);
	});
});
