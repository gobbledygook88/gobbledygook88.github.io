import { defineConfig, devices } from "@playwright/test";

const PORT = 8788;

/**
 * Outside-in tests: drive the real built Worker (`wrangler dev`) in a browser.
 * The server starts from an empty local database each run, so EmDash applies
 * seed/seed.json on the first request, exactly as a fresh deployment would.
 */
export default defineConfig({
	testDir: "./e2e",
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
	webServer: {
		command: `./e2e/serve.sh ${PORT}`,
		url: `http://localhost:${PORT}/`,
		timeout: 180_000,
		reuseExistingServer: !process.env.CI,
	},
});
