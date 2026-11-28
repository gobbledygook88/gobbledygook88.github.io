import { expect, test, type Page } from "@playwright/test";
import { EDITOR_SESSION } from "./serve-config";
import { createDraftWalk, openWalkSidebar, walkIdBySlug } from "./support/admin";
import { stubExternalAssets } from "./support/network";

// Signed in as the site's admin (see global-setup.ts)
test.use({ storageState: EDITOR_SESSION });

const PHOTOS = ["e2e/fixtures/files/scones.jpg", "e2e/fixtures/files/photo.png"];

/**
 * The draft walk with a route that this project's tests edit (fixtures, one per
 * project, since the content API only takes route files from the media library).
 */
const walkWithRoute = (page: Page) => walkIdBySlug(page, `waypoint-editing-${test.info().project.name}`);

async function openWaypointEditor(page: Page, walkId: string) {
	const editWaypoints = await openWalkSidebar(page, walkId, (on) => on.getByRole("button", { name: "Edit waypoints" }));
	await editWaypoints.click();
	return page.getByRole("dialog", { name: "Waypoints" });
}

test.describe("Waypoint editor", () => {
	test.beforeEach(async ({ page }) => {
		await stubExternalAssets(page);
	});

	test("places a waypoint by tapping the walk's route map", async ({ page }) => {
		// Its one waypoint, Cuckmere Haven, isn't on the map yet
		const walkId = await walkWithRoute(page);

		const editor = await openWaypointEditor(page, walkId);
		const map = editor.getByRole("region", { name: "Map of the route" });
		await expect(map.locator("path.route-line")).toBeVisible();

		const waypoint = editor.getByRole("region", { name: "Cuckmere Haven" });
		await waypoint.click();
		await expect(waypoint.getByRole("status")).toHaveText("Tap the map where this waypoint is.");
		await map.click();
		await expect(waypoint.getByRole("status")).toContainText(/On the map at 50\.\d+, 0\.\d+/);
		await expect(map.getByRole("button", { name: "Cuckmere Haven" })).toBeVisible();

		await editor.getByRole("button", { name: "Done" }).click();
		await expect(page.getByText("1 waypoint, 1 on the map.")).toBeVisible();

		// Saved with the walk: still placed after reopening the editor
		await page.getByRole("button", { name: /^Save/ }).first().click();
		await expect(page.getByText("Saved").first()).toBeVisible();
		const reopened = await openWaypointEditor(page, walkId);
		await expect(reopened.getByRole("region", { name: "Cuckmere Haven" }).getByRole("status")).toContainText(
			"On the map at",
		);
	});

	test("adds a waypoint with several photos uploaded at once", async ({ page }) => {
		const walkId = await createDraftWalk(page);

		const editor = await openWaypointEditor(page, walkId);
		await editor.getByRole("button", { name: "Add waypoint" }).click();
		await editor.getByLabel("Title").fill("Birling Gap");
		await editor.getByLabel("Notes").fill("The cliffs drop straight to the beach here.");
		await editor.getByRole("button", { name: "Select photos" }).click();

		const picker = page.getByRole("dialog", { name: "Select photos" });
		await picker.locator("input[type=file]").setInputFiles(PHOTOS);
		await picker.getByRole("button", { name: "Add 2 images" }).click();

		const waypoint = editor.getByRole("region", { name: "Birling Gap" });
		await expect(waypoint.getByRole("list", { name: "Photos" }).getByRole("img")).toHaveCount(2);
		await editor.getByRole("region", { name: "Map of the route" }).click();
		await editor.getByRole("button", { name: "Done" }).click();
		await expect(page.getByText("1 waypoint, 1 on the map.")).toBeVisible();

		await page.getByRole("button", { name: /^Save/ }).first().click();
		await expect(page.getByText("Saved").first()).toBeVisible();
		const reopened = await openWaypointEditor(page, walkId);
		const saved = reopened.getByRole("region", { name: "Birling Gap" });
		await expect(saved.getByLabel("Notes")).toHaveValue("The cliffs drop straight to the beach here.");
		await expect(saved.getByRole("list", { name: "Photos" }).getByRole("img")).toHaveCount(2);
	});
});
