import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import type { FullConfig } from "@playwright/test";
import { STATE_DIR } from "./serve-config";

interface FixtureEntry {
	slug: string;
	publishedAt?: string;
}

const FIXTURES_DIR = new URL("./fixtures/", import.meta.url);
const MAX_SETUP_ATTEMPTS = 20;
/** The MEDIA bucket the test server uses (the top level of wrangler.jsonc) */
const MEDIA_BUCKET = "biscuit-crumbs-media-staging";

/**
 * Runs once the test server is up (Playwright starts it first), before any test.
 *
 * 1. Completes EmDash's setup with content, as the setup wizard does on a fresh
 *    deployment: the automatic first-request seed only applies the schema.
 * 2. Gives each fixture its publish date, which seed files can't set.
 */
export default async function globalSetup(config: FullConfig) {
	const baseURL = config.projects[0]?.use.baseURL;
	if (!baseURL) throw new Error("No baseURL configured");

	await applySeedContent(baseURL);
	setPublishDates();
	storeMediaLibraryPhotos();
}

async function applySeedContent(baseURL: string) {
	for (let attempt = 1; attempt <= MAX_SETUP_ATTEMPTS; attempt++) {
		const response = await fetch(`${baseURL}/_emdash/api/setup`, {
			method: "POST",
			headers: { "Content-Type": "application/json", "X-EmDash-Request": "1" },
			body: JSON.stringify({
				title: "Biscuit Crumbs",
				tagline: "A collection of biscuit crumbs",
				includeContent: true,
			}),
		});
		const body = await response.json();
		if (!response.ok) throw new Error(`Setup failed: ${JSON.stringify(body)}`);

		// EmDash applies large seeds over several requests
		const result = body.data ?? body;
		if (result.seedComplete) return;
	}
	throw new Error(`Seed content still incomplete after ${MAX_SETUP_ATTEMPTS} setup requests`);
}

/**
 * Puts the fixture photos that live in the media library into the local R2
 * bucket. Unlike fixtures.test photos, the Worker fetches these itself to
 * resize them, so a browser-side stub can't stand in for them.
 */
function storeMediaLibraryPhotos() {
	const photos = [{ storageKey: "fixture-scones-storage.jpg", file: "scones.jpg", contentType: "image/jpeg" }];
	for (const { storageKey, file, contentType } of photos) {
		execFileSync(
			"pnpm",
			[
				"wrangler",
				"r2",
				"object",
				"put",
				`${MEDIA_BUCKET}/${storageKey}`,
				"--file",
				new URL(`files/${file}`, FIXTURES_DIR).pathname,
				"--content-type",
				contentType,
				"--local",
				"--persist-to",
				STATE_DIR,
			],
			{ stdio: "ignore" },
		);
	}
}

function setPublishDates() {
	// e2e/fixtures/<collection>.json
	const fixtureFiles = readdirSync(FIXTURES_DIR).filter((file) => file.endsWith(".json"));
	const statements = fixtureFiles.flatMap((file) => {
		const collection = file.replace(/\.json$/, "");
		const entries: FixtureEntry[] = JSON.parse(readFileSync(new URL(file, FIXTURES_DIR), "utf8"));
		return entries
			.filter((entry) => entry.publishedAt)
			.map(
				(entry) =>
					`UPDATE ec_${collection} SET published_at = '${entry.publishedAt}' WHERE slug = '${entry.slug}';`,
			);
	});

	execFileSync(
		"pnpm",
		["wrangler", "d1", "execute", "DB", "--local", "--persist-to", STATE_DIR, "--command", statements.join(" ")],
		{ stdio: "ignore" },
	);
}
