import { defineConfig, devices } from "@playwright/test";
import { FAKE_STRAVA_PORT, PORT, STATE_DIR } from "./e2e/serve-config";

/**
 * Outside-in tests: drive the real built Worker (`wrangler dev`) in a browser.
 * The server starts from an empty local database each run and is built with a
 * test-only seed (the real schema plus e2e/fixtures content), which EmDash
 * applies on the first request, as on a fresh deployment.
 */
export default defineConfig({
	testDir: "./e2e",
	globalSetup: "./e2e/global-setup.ts",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["github"], ["list"]] : "list",
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: "retain-on-failure",
	},
	projects: [
		{ name: "desktop", use: { ...devices["Desktop Chrome"] } },
		{ name: "mobile", use: { ...devices["Pixel 7"] } },
	],
	webServer: [
		{
			command: `node e2e/support/fake-strava.mjs ${FAKE_STRAVA_PORT}`,
			port: FAKE_STRAVA_PORT,
			reuseExistingServer: !process.env.CI,
		},
		{
			command: `./e2e/serve.sh ${PORT} ${STATE_DIR} ${FAKE_STRAVA_PORT}`,
			url: `http://localhost:${PORT}/`,
			timeout: 180_000,
			reuseExistingServer: !process.env.CI,
		},
	],
});
