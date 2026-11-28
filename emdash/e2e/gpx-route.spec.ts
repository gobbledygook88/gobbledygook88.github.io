import { expect, test, type Page } from "@playwright/test";
import { EDITOR_SESSION } from "./serve-config";
import { createDraftWalk, openWalkSidebar } from "./support/admin";
import { stubExternalAssets } from "./support/network";

// Signed in as the site's admin (see global-setup.ts)
test.use({ storageState: EDITOR_SESSION });

// 13.1km along the Seven Sisters, 3 h 40 m from start to finish including a 30-minute stop
const GPX_FILE = "e2e/fixtures/files/seven-sisters.gpx";

test.describe("Route from a GPX file", () => {
	test.beforeEach(async ({ page }) => {
		await stubExternalAssets(page);
	});

	test("fills in a walk's route, distance and moving time from an uploaded GPX file", async ({ page }) => {
		const walkId = await createDraftWalk(page);
		// Not written yet, so the GPX file fills it in
		const clearDuration = (on: Page) => on.getByLabel("Duration").fill("");
		await openWalkSidebar(page, walkId, (on) => on.getByText("Upload a GPX file", { exact: true }), clearDuration);

		await page.getByLabel("Upload a GPX file").setInputFiles(GPX_FILE);
		await expect(page.getByRole("status").filter({ hasText: "Seven Sisters" })).toHaveText(
			"The route from “Seven Sisters” is in the form. Save to keep it.",
		);

		await expect(page.getByLabel("Distance")).toHaveValue("13.1km");
		// Moving time leaves out the stop
		await expect(page.getByLabel("Duration")).toHaveValue("3 hours");
		await expect(page.getByLabel("Route link URL")).toHaveValue("");

		await page.getByRole("button", { name: "Edit waypoints" }).click();
		const map = page.getByRole("dialog", { name: "Waypoints" }).getByRole("region", { name: "Map of the route" });
		await expect(map.locator("path.route-line")).toBeVisible();
		await page.getByRole("button", { name: "Done" }).click();

		await page.getByRole("button", { name: /^Save/ }).first().click();
		await expect(page.getByText("Saved").first()).toBeVisible();
		await page.reload();
		await expect(page.getByLabel("Distance")).toHaveValue("13.1km");
	});

	test("explains when a file has no GPS track", async ({ page }) => {
		const walkId = await createDraftWalk(page);
		await openWalkSidebar(page, walkId, (on) => on.getByText("Upload a GPX file", { exact: true }));

		await page.getByLabel("Upload a GPX file").setInputFiles({
			name: "notes.gpx",
			mimeType: "application/gpx+xml",
			buffer: Buffer.from("Remember to buy scones"),
		});
		await expect(page.getByRole("alert")).toHaveText("That file has no GPS track in it. Choose a GPX file of the walk.");
	});
});
