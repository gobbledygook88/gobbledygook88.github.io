import { expect, test } from "@playwright/test";

// Fixture posts live in e2e/fixtures/posts.json

test.describe("Blog index", () => {
	test("lists published posts, newest first", async ({ page }) => {
		await page.goto("/blog/");

		await expect(page).toHaveTitle("Blog — Biscuit Crumbs");
		await expect(page.getByRole("heading", { level: 1, name: "Blog" })).toBeAttached();

		const posts = page.getByRole("main").getByRole("listitem");
		await expect(posts).toHaveText([
			"Learning stenography",
			"Thru-hiking / camping packing list",
			"Notes On: C++",
			"Parallel Poisson solver",
		]);
		await expect(posts.first().getByRole("link")).toHaveAttribute(
			"href",
			"/blog/learning-stenography/",
		);
	});

	test("keeps drafts private", async ({ page }) => {
		await page.goto("/blog/");
		await expect(page.getByRole("link", { name: "SSO and SAML" })).toHaveCount(0);

		const response = await page.goto("/blog/sso-and-saml/");
		expect(response?.status()).toBe(404);
	});
});

test.describe("Blog post", () => {
	test("shows the title and story, with working links", async ({ page }) => {
		await page.goto("/blog/");
		await page.getByRole("link", { name: "Learning stenography" }).click();

		await expect(page).toHaveURL("/blog/learning-stenography/");
		await expect(page).toHaveTitle("Learning stenography — Biscuit Crumbs");
		await expect(page.getByRole("heading", { level: 1, name: "Learning stenography" })).toBeVisible();

		const story = page.getByRole("article");
		await expect(story.getByRole("link", { name: "Plover" })).toHaveAttribute(
			"href",
			"https://www.openstenoproject.org/plover/",
		);
		await expect(story.getByRole("heading", { level: 2, name: "Resources" })).toBeVisible();
		await expect(story.getByRole("listitem")).toHaveText(["Art of Chording", "Typey Type"]);
	});

	test("still opens from old links without a trailing slash", async ({ page }) => {
		const response = await page.goto("/blog/learning-stenography");

		expect(response?.ok()).toBe(true);
		await expect(page.getByRole("heading", { level: 1, name: "Learning stenography" })).toBeVisible();
	});

	test("highlights code without downloading a highlighter", async ({ page }) => {
		const scripts: string[] = [];
		page.on("request", (request) => {
			if (request.resourceType() === "script") scripts.push(request.url());
		});

		await page.goto("/blog/cpp/");

		const code = page.getByRole("article").locator("pre code");
		await expect(code).toContainText('std::cout << "Hello world!" << std::endl;');
		const colours = await code
			.locator("span")
			.evaluateAll((spans) => new Set(spans.map((span) => getComputedStyle(span).color)).size);
		expect(colours).toBeGreaterThan(2);
		await expect(page.getByRole("article").locator("p code")).toHaveText("main");
		expect(scripts.filter((url) => /highlight|hljs|prism|shiki/i.test(url))).toEqual([]);
	});

	test("lets wide code scroll inside its box on narrow screens", async ({ page }) => {
		await page.setViewportSize({ width: 360, height: 740 });
		await page.goto("/blog/cpp/");

		const pageOverflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
		);
		expect(pageOverflow).toBeLessThanOrEqual(0);

		const codeBox = page.getByRole("article").locator("pre");
		const canScroll = await codeBox.evaluate((pre) => pre.scrollWidth > pre.clientWidth);
		expect(canScroll).toBe(true);
	});

	test("shows tables with their header row", async ({ page }) => {
		await page.goto("/blog/thru-hiking-packing-list/");

		const table = page.getByRole("table");
		await expect(table.getByRole("columnheader")).toHaveText(["Item", "Weight"]);
		await expect(table.getByRole("row").nth(1).getByRole("cell")).toHaveText(["Tent", "1.2kg"]);
	});

	test("typesets maths without loading a script", async ({ page }) => {
		const scripts: string[] = [];
		page.on("request", (request) => {
			if (request.resourceType() === "script") scripts.push(request.url());
		});

		await page.goto("/blog/parallel-poisson-solver/");

		const story = page.getByRole("article");
		await expect(story.getByRole("math")).toHaveCount(2);
		// One formula sits within its sentence, the other is set on its own line
		await expect(story.getByRole("paragraph").getByRole("math")).toHaveCount(1);
		await expect(story.locator('math[display="block"]')).toHaveCount(1);
		// Bold and blackboard letters as their own characters, which every browser shows
		// (Chrome's MathML ignores the mathvariant attribute)
		await expect(story.getByRole("paragraph").getByRole("math")).toContainText("𝐫∈ℝ");
		expect(scripts.filter((url) => /mathjax|katex/i.test(url))).toEqual([]);
	});

	test("shows the not-found page for a post that doesn't exist", async ({ page }) => {
		const response = await page.goto("/blog/no-such-post/");

		expect(response?.status()).toBe(404);
		await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
	});
});
