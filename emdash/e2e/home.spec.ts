import { expect, test, type Page } from "@playwright/test";

/** Taps (or clicks, on desktop) a blank spot away from the links. */
async function tapEmptySpace(page: Page) {
	const { hasTouch } = test.info().project.use;
	if (hasTouch) await page.touchscreen.tap(8, 8);
	else await page.mouse.click(8, 8);
}

function crumbTrailPoints(page: Page) {
	return page.getByTestId("crumb-trail").locator("polyline").getAttribute("points");
}

test.describe("Home page", () => {
	test("introduces the site and links to each section", async ({ page }) => {
		await page.goto("/");

		await expect(page).toHaveTitle("Biscuit Crumbs");
		await expect(
			page.getByRole("heading", { level: 1, name: "Biscuit Crumbs" }),
		).toBeVisible();

		const sections = page.getByRole("navigation", { name: "Sections" });
		await expect(sections.getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog/");
		await expect(sections.getByRole("link", { name: "Walks" })).toHaveAttribute("href", "/walks/");
		await expect(sections.getByRole("link", { name: "Travel" })).toHaveAttribute("href", "/travel/");
	});

	test("draws a wandering crumb trail across the page", async ({ page }) => {
		await page.goto("/");

		const trail = page.getByTestId("crumb-trail");
		await expect(trail).toBeVisible();
		await expect(trail).toHaveAttribute("aria-hidden", "true");

		const points = (await crumbTrailPoints(page))?.trim().split(/\s+/) ?? [];
		// Ten rounds of midpoint displacement on a single segment: 2^10 + 1 points
		expect(points).toHaveLength(1025);

		const xs = points.map((point) => Number(point.split(",")[0]));
		expect(Math.min(...xs)).toBe(0);
		expect(Math.max(...xs)).toBe(1000);
		const ys = new Set(points.map((point) => point.split(",")[1]));
		expect(ys.size).toBeGreaterThan(1);
	});

	test("draws a new crumb trail each time the visitor taps the page", async ({ page }) => {
		await page.goto("/");
		const before = await crumbTrailPoints(page);

		await tapEmptySpace(page);

		await expect.poll(() => crumbTrailPoints(page)).not.toBe(before);
		await expect(page).toHaveURL("/");
	});
});
