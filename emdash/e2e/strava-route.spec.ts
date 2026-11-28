import { expect, test, type Page } from "@playwright/test";
import { EDITOR_SESSION } from "./serve-config";
import { createDraftWalk, openWalkSidebar, showSidebar } from "./support/admin";
import { stubExternalAssets } from "./support/network";

// Signed in as the site's admin (see global-setup.ts). Strava is the fake in
// e2e/support/fake-strava.mjs: "Seven Sisters" (a walk) and "Morning run" on
// 14 August 2022, and "Box Hill and the stepping stones" (a hike) in 2021.
test.use({ storageState: EDITOR_SESSION });

const stravaControl = (page: Page) => page.getByRole("button", { name: /^(Connect Strava|Choose from Strava)$/ });

/** Opens the Strava activity chooser, connecting Strava first if no test has yet. */
async function openStravaChooser(page: Page, walkId: string) {
	const control = await openWalkSidebar(page, walkId, stravaControl);
	if ((await control.textContent()) === "Connect Strava") {
		// Strava approves and sends the browser back to the site, which returns it to this walk
		const signedIn = page.waitForResponse((response) => response.url().includes("/strava/callback"));
		await control.click();
		expect((await signedIn).status()).toBe(302);
		// Only the returned page can offer this: the one we left was offering to connect
		await showSidebar(page, (on) => on.getByRole("button", { name: "Choose from Strava" }));
	}
	await page.getByRole("button", { name: "Choose from Strava" }).click();
	return page.getByRole("dialog", { name: "Choose a Strava activity" });
}

test.describe("Route from Strava", () => {
	test.beforeEach(async ({ page }) => {
		await stubExternalAssets(page);
	});

	test("fills in a walk's route from a pasted Strava link", async ({ page }) => {
		const walkId = await createDraftWalk(page);
		const chooser = await openStravaChooser(page, walkId);

		await chooser.getByLabel("Search").fill("https://www.strava.com/activities/1001");
		const result = chooser.getByRole("listitem").filter({ hasText: "Seven Sisters" });
		await expect(result).toContainText("14 Aug 2022");
		await expect(result).toContainText("11.2km");
		await result.getByRole("button", { name: "Use this route" }).click();
		await expect(chooser).toBeHidden();

		// Empty fields are filled in; ones already written are left alone
		await expect(page.getByLabel("Distance")).toHaveValue("11.2km");
		await expect(page.getByLabel("Duration")).toHaveValue("3 hours");
		await expect(page.getByLabel("Route link URL")).toHaveValue("https://www.strava.com/activities/1001");
		await expect(page.getByLabel("Route link text")).toHaveValue("Strava");

		// The route is the walk's route file: the waypoint editor's map draws it
		await page.getByRole("button", { name: "Edit waypoints" }).click();
		const map = page.getByRole("dialog", { name: "Waypoints" }).getByRole("region", { name: "Map of the route" });
		await expect(map.locator("path.route-line")).toBeVisible();
		await page.getByRole("button", { name: "Done" }).click();

		await page.getByRole("button", { name: /^Save/ }).first().click();
		await expect(page.getByText("Saved").first()).toBeVisible();
		await page.reload();
		await expect(page.getByLabel("Distance")).toHaveValue("11.2km");
	});

	test("lists the walks and hikes recorded on a chosen date", async ({ page }) => {
		const walkId = await createDraftWalk(page);
		const chooser = await openStravaChooser(page, walkId);

		await chooser.getByLabel("Date").fill("2022-08-14");
		await expect(chooser.getByRole("listitem")).toHaveCount(1);
		await expect(chooser.getByRole("listitem")).toContainText("Seven Sisters");
	});

	test("finds a walk by words from its title, however long ago", async ({ page }) => {
		const walkId = await createDraftWalk(page);
		const chooser = await openStravaChooser(page, walkId);

		await chooser.getByLabel("Search").fill("stepping stones");
		await expect(chooser.getByRole("listitem")).toHaveCount(1);
		await expect(chooser.getByRole("listitem")).toContainText("Box Hill and the stepping stones");
		await expect(chooser.getByRole("listitem")).toContainText("2 May 2021");
	});

	test("narrows a search to a year, and to walks and hikes unless runs and rides are wanted", async ({ page }) => {
		const walkId = await createDraftWalk(page);
		const chooser = await openStravaChooser(page, walkId);

		await chooser.getByLabel("Search").fill("2022");
		await expect(chooser.getByRole("listitem")).toHaveCount(1);
		await expect(chooser.getByRole("listitem")).toContainText("Seven Sisters");

		await chooser.getByLabel("Include runs, rides and other activities").check();
		await expect(chooser.getByRole("listitem")).toHaveCount(2);
		await expect(chooser.getByRole("listitem").nth(1)).toContainText("Morning run");
	});
});
