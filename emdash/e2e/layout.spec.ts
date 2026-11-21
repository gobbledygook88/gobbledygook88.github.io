import { expect, test } from "@playwright/test";

const MISSING_PAGE = "/a-page-that-does-not-exist/";

test.describe("Site layout", () => {
	test("serves a helpful page when a link is broken", async ({ page }) => {
		const response = await page.goto(MISSING_PAGE);

		expect(response?.status()).toBe(404);
		await expect(page).toHaveTitle("Page not found — Biscuit Crumbs");
		await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
		await expect(page.getByRole("main").getByRole("link", { name: "home page" })).toHaveAttribute(
			"href",
			"/",
		);
	});

	test("shows a banner linking home and to my profiles", async ({ page }) => {
		await page.goto(MISSING_PAGE);

		const banner = page.getByRole("banner");
		await expect(banner.getByRole("link", { name: "Biscuit Crumbs" })).toHaveAttribute("href", "/");
		await expect(banner.getByRole("link", { name: "GitHub" })).toHaveAttribute(
			"href",
			"https://github.com/gobbledygook88",
		);
		await expect(banner.getByRole("link", { name: "AllTrails" })).toHaveAttribute(
			"href",
			"https://www.alltrails.com/members/marcus-mo/maps",
		);
		await expect(banner.getByRole("link", { name: "Strava" })).toHaveAttribute(
			"href",
			"https://strava.app.link/C5jt2v2v8Jb",
		);
	});

	test("fits narrow screens without sideways scrolling", async ({ page }) => {
		await page.setViewportSize({ width: 360, height: 740 });
		await page.goto(MISSING_PAGE);

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
		);
		expect(overflow).toBeLessThanOrEqual(0);
	});

	for (const path of ["/", MISSING_PAGE]) {
		test(`loads fonts from the site itself and no analytics trackers on ${path}`, async ({
			page,
		}) => {
			const requestedHosts = new Set<string>();
			page.on("request", (request) => requestedHosts.add(new URL(request.url()).hostname));

			await page.goto(path, { waitUntil: "networkidle" });

			for (const host of requestedHosts) {
				expect(host).not.toMatch(/fonts\.(googleapis|gstatic)\.com|google-analytics\.com/);
			}
			const loadedOxygenFaces = await page.evaluate(async () => {
				await document.fonts.ready;
				return [...document.fonts].filter(
					(face) => face.family.replaceAll('"', "") === "Oxygen" && face.status === "loaded",
				).length;
			});
			expect(loadedOxygenFaces).toBeGreaterThan(0);
		});
	}
});
