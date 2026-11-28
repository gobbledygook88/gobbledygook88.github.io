import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig, fontProviders } from "astro/config";
import emdash from "emdash/astro";
import { tripEditorPlugin } from "./src/plugins/trip-editor/descriptor.ts";

/**
 * Cache rendered pages in Cloudflare's cache so most visits don't run the
 * Worker: Workers Free allows only 10 ms of CPU per request. Pages re-render
 * after a day (serving the stale copy for up to a week while they do), and
 * EmDash purges a collection's tag whenever its content is published or
 * changed. Each deploy starts with an empty cache.
 */
const DAY = 86_400;
const cached = (...tags) => ({ maxAge: DAY, swr: 7 * DAY, tags });

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	cache: { provider: cacheCloudflare() },
	routeRules: {
		"/": cached(),
		"/blog": cached("posts"),
		"/blog/[slug]": cached("posts"),
		"/walks": cached("walks"),
		"/walks/[slug]": cached("walks"),
		"/travel": cached("travel"),
		"/travel/[slug]": cached("travel"),
		"/travel/logbook": cached(),
	},
	image: {
		layout: "constrained",
		responsiveStyles: true,
		remotePatterns: [
			{ protocol: "https", hostname: "marcusmo.co.uk", pathname: "/_emdash/api/media/file/**" },
			{ protocol: "https", hostname: "**.marcusmo88.workers.dev", pathname: "/_emdash/api/media/file/**" },
			{ protocol: "http", hostname: "localhost", pathname: "/_emdash/api/media/file/**" },
		],
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto", coalesce: true }),
			storage: r2({ binding: "MEDIA" }),
			plugins: [tripEditorPlugin()],
			// Logged-in editors get the cached public page, so load the toolbar client-side
			toolbar: "client",
		}),
	],
	fonts: [
		// The site's own typeface, downloaded at build time and served from the
		// site (no runtime request to Google Fonts).
		{
			provider: fontProviders.google(),
			name: "Oxygen",
			cssVariable: "--font-oxygen",
			weights: [400, 700],
			fallbacks: ["Helvetica", "Arial", "sans-serif"],
		},
	],
	devToolbar: { enabled: false },
});
