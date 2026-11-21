import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig, fontProviders } from "astro/config";
import emdash from "emdash/astro";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto", coalesce: true }),
			storage: r2({ binding: "MEDIA" }),
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
