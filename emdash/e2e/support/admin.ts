import { expect, test, type Locator, type Page } from "@playwright/test";

/** Shared steps for admin tests, which run signed in as the site's admin (see global-setup.ts). */

function idFrom(body: { data?: { item?: { id: string } }; item?: { id: string } }) {
	return (body.data?.item ?? body.item ?? body.data) as { id: string };
}

/** The ID of a fixture walk, for its editor's URL. */
export async function walkIdBySlug(page: Page, slug: string) {
	const response = await page.request.get(`/_emdash/api/content/walks/${slug}`);
	expect(response.ok(), await response.text()).toBe(true);
	return idFrom(await response.json()).id;
}

/** A new draft walk of the test's own, without a route, so tests don't share state. */
export async function createDraftWalk(page: Page, data: Record<string, unknown> = {}) {
	const slug = `test-walk-${test.info().project.name}-${test.info().testId}`;
	const response = await page.request.post("/_emdash/api/content/walks", {
		headers: { "X-EmDash-Request": "1" },
		data: {
			slug,
			data: { title: "Seven Sisters again", route_start: "Eastbourne", route_end: "East Dean", duration: "3 hours", ...data },
		},
	});
	expect(response.ok(), await response.text()).toBe(true);
	return idFrom(await response.json()).id;
}

/**
 * Opens a walk in the editor with its settings sidebar showing (phones start
 * with it closed), and returns `control`, which is in that sidebar.
 * `beforeSidebar` edits the form first, while the sidebar doesn't cover it.
 */
export async function openWalkSidebar(
	page: Page,
	walkId: string,
	control: (page: Page) => Locator,
	beforeSidebar?: (page: Page) => Promise<void>,
) {
	await page.goto(`/_emdash/admin/content/walks/${walkId}`);
	await beforeSidebar?.(page);
	const showSettings = page.getByRole("button", { name: "Show settings" });
	await expect(showSettings.or(control(page)).first()).toBeVisible();
	if (await showSettings.isVisible()) await showSettings.click();
	return control(page);
}
