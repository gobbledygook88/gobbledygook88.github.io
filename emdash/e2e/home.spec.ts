import { expect, test, type Page } from "@playwright/test";

/** Taps (or clicks, on desktop) a blank spot away from the links. */
async function tapEmptySpace(page: Page) {
	const { hasTouch } = test.info().project.use;
	if (hasTouch) await page.touchscreen.tap(8, 8);
	else await page.mouse.click(8, 8);
}

const landscape = (page: Page) => page.getByTestId("landscape");

/** The outline of the hills: every ridgeline's shape, which changes with each new landscape. */
function hillOutlines(page: Page) {
	return landscape(page)
		.locator(".ridge")
		.evaluateAll((ridges) => ridges.map((ridge) => ridge.getAttribute("d")).join(" "));
}

async function hikerPosition(page: Page) {
	const transform = await landscape(page).locator(".hiker").getAttribute("transform");
	const [, x = "NaN"] = transform?.match(/translate\(([-\d.]+),/) ?? [];
	return Number(x);
}

interface ValleyMeasurements {
	/** The highest point of the hills, in drawing units from the top edge */
	hilltopY: number;
	leftPeak: { x: number; rise: number; onScreenX: number };
	rightPeak: { x: number; rise: number; onScreenX: number };
	dipX: number;
	springX: number;
	treesTouchingStream: number;
}

/** Measures the landscape as drawn: its skyline, where the stream starts, and what it runs past. */
function measureValley(page: Page): Promise<ValleyMeasurements> {
	return landscape(page).evaluate((svg: SVGSVGElement) => {
		const pointsIn = (text: string | null) =>
			(text?.match(/-?[\d.]+,-?[\d.]+/g) ?? []).map((pair) => pair.split(",").map(Number) as [number, number]);

		// The skyline: at each x, the highest point of any ridgeline. Only x positions that every
		// ridgeline passes through count, since a partial set of rows would show a false dip.
		const ridges = [...svg.querySelectorAll(".ridge")];
		const skyline = new Map<number, { y: number; rows: number }>();
		for (const ridge of ridges) {
			for (const [x, y] of pointsIn(ridge.getAttribute("d"))) {
				if (x < 0 || x > 1000 || y >= 300) continue;
				const highest = skyline.get(x) ?? { y: Infinity, rows: 0 };
				skyline.set(x, { y: Math.min(y, highest.y), rows: highest.rows + 1 });
			}
		}
		const outline = [...skyline.entries()]
			.filter(([, { rows }]) => rows === ridges.length)
			.map(([x, { y }]) => ({ x, y }))
			.sort((a, b) => a.x - b.x);

		const banks = [...svg.querySelectorAll(".stream-bank")].map((bank) => pointsIn(bank.getAttribute("points")));
		const springX = banks[0]?.[0]?.[0] ?? NaN;

		const highest = (points: typeof outline) => points.reduce((a, b) => (b.y < a.y ? b : a));
		const leftPeak = highest(outline.filter((p) => p.x < springX));
		const rightPeak = highest(outline.filter((p) => p.x > springX));
		const dip = outline
			.filter((p) => p.x > leftPeak.x && p.x < rightPeak.x)
			.reduce((a, b) => (b.y > a.y ? b : a));

		const toScreenX = (x: number) => new DOMPoint(x, 0).matrixTransform(svg.getScreenCTM() ?? undefined).x;

		const streamPoints = banks.flat();
		const treesTouchingStream = [...svg.querySelectorAll<SVGGraphicsElement>(".tree")].filter((tree) => {
			const box = tree.getBBox();
			return streamPoints.some(
				([x, y]) => x > box.x && x < box.x + box.width && y > box.y && y < box.y + box.height,
			);
		}).length;

		return {
			hilltopY: highest(outline).y,
			leftPeak: { x: leftPeak.x, rise: dip.y - leftPeak.y, onScreenX: toScreenX(leftPeak.x) },
			rightPeak: { x: rightPeak.x, rise: dip.y - rightPeak.y, onScreenX: toScreenX(rightPeak.x) },
			dipX: dip.x,
			springX,
			treesTouchingStream,
		};
	});
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
});

test.describe("Home page landscape", () => {
	test("draws a valley of hills, a stream, a forest and a trail along the bottom of the page", async ({
		page,
	}) => {
		await page.goto("/");

		const valley = landscape(page);
		await expect(valley).toBeVisible();
		await expect(valley).toHaveAttribute("aria-hidden", "true");
		const box = await valley.boundingBox();
		expect(box && box.y + box.height).toBe(page.viewportSize()?.height);

		await expect(valley.locator(".ridge").first()).toBeAttached();
		await expect(valley.locator(".stream-bank").first()).toBeAttached();
		expect(await valley.locator(".tree").count()).toBeGreaterThan(40);
		await expect(valley.locator(".trail").first()).toBeAttached();
		await expect(valley.locator(".bridge")).toHaveCount(1);
		await expect(valley.locator(".hiker")).toHaveCount(1);
	});

	test("draws a new landscape each time the visitor taps the page", async ({ page }) => {
		await page.goto("/");
		await expect(landscape(page).locator(".ridge").first()).toBeAttached();
		const before = await hillOutlines(page);

		await tapEmptySpace(page);

		await expect.poll(() => hillOutlines(page)).not.toBe(before);
		await expect(page).toHaveURL("/");
	});

	test("shows a hiker walking along the trail as soon as the page loads", async ({ page }) => {
		await page.goto("/");
		const hiker = landscape(page).locator(".hiker");
		await expect(hiker).toBeInViewport();

		const start = await hikerPosition(page);
		await expect.poll(() => hikerPosition(page), { timeout: 10_000 }).toBeGreaterThan(start + 5);
	});

	test("startles birds out of the forest as the hiker walks past", async ({ page }) => {
		await page.clock.install();
		await page.goto("/");
		const birds = landscape(page).locator(".bird");
		await expect(birds).toHaveCount(0);

		for (let second = 0; second < 90 && (await birds.count()) === 0; second++) {
			await page.clock.runFor(1000);
		}
		await page.clock.runFor(1000);

		expect(await birds.count()).toBeGreaterThanOrEqual(3);
		await expect(birds.first()).toBeInViewport();
	});

	test("always frames the valley with a low hill on the left, a taller one on the right, and the stream springing from the dip between them", async ({
		page,
	}) => {
		await page.goto("/");
		const viewportWidth = page.viewportSize()?.width ?? 0;

		for (let landscapeNumber = 0; landscapeNumber < 12; landscapeNumber++) {
			if (landscapeNumber > 0) await tapEmptySpace(page);
			await expect(landscape(page).locator(".stream-bank").first()).toBeAttached();
			const valley = await measureValley(page);
			const context = `landscape ${landscapeNumber}: ${JSON.stringify(valley)}`;

			expect(valley.hilltopY, `hilltop stays inside the frame, ${context}`).toBeGreaterThan(20);
			expect(valley.leftPeak.rise, `left hill rises above the dip, ${context}`).toBeGreaterThan(8);
			expect(valley.rightPeak.rise, `right hill clearly taller, ${context}`).toBeGreaterThan(
				1.6 * valley.leftPeak.rise,
			);
			expect(Math.abs(valley.springX - valley.dipX), `stream springs from the dip, ${context}`).toBeLessThan(40);
			for (const peak of [valley.leftPeak, valley.rightPeak]) {
				expect(peak.onScreenX, `both hilltops on screen, ${context}`).toBeGreaterThan(0);
				expect(peak.onScreenX, `both hilltops on screen, ${context}`).toBeLessThan(viewportWidth);
			}
			expect(valley.treesTouchingStream, `no tree over the stream, ${context}`).toBe(0);
		}
	});
});
