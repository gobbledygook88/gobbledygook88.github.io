/**
 * Outside-in tests for the legacy importer: run the CLI in --dry-run mode over
 * a miniature copy of the old site (test/fixtures/app) and check the entries
 * and uploads it plans.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { describe, test } from "node:test";

const FIXTURE_SITE = new URL("./fixtures/app/", import.meta.url).pathname;
const CLI = new URL("../cli.ts", import.meta.url).pathname;

interface Block {
	_type: string;
	_key?: string;
	style?: string;
	children?: Block[];
	markDefs?: { _key: string; _type: string; href?: string }[];
	marks?: string[];
	text?: string;
	[field: string]: unknown;
}

interface PlannedEntry {
	collection: string;
	slug: string;
	status: "published" | "draft";
	publishedAt: string | null;
	data: Record<string, unknown> & { title: string; content?: Block[] };
	taxonomies?: Record<string, string[]>;
}

interface Plan {
	entries: PlannedEntry[];
	media: { path: string }[];
}

function dryRun(...args: string[]): Plan {
	const output = execFileSync("node", [CLI, "--source", FIXTURE_SITE, "--dry-run", ...args], {
		encoding: "utf8",
	});
	return JSON.parse(output);
}

const plan = dryRun();

function entry(collection: string, slug: string): PlannedEntry {
	const found = plan.entries.find((e) => e.collection === collection && e.slug === slug);
	assert.ok(found, `expected a ${collection} entry "${slug}"`);
	return found;
}

const contentOf = (e: PlannedEntry) => e.data.content ?? [];
const textOf = (block: Block) => (block.children ?? []).map((child) => child.text ?? "").join("");

describe("blog posts", () => {
	test("are imported with their slug, title and the date from the filename", () => {
		const post = entry("posts", "c");
		assert.equal(post.status, "published");
		assert.equal(post.data.title, "Notes On: C");
		assert.match(post.publishedAt ?? "", /^2013-11-20T/);
	});

	test("published on the same day keep the old site's order", () => {
		// The old index listed same-day posts in reverse filename order
		assert.ok(entry("posts", "cpp").publishedAt! > entry("posts", "c").publishedAt!);
	});

	test("in _drafts stay drafts", () => {
		const draft = entry("posts", "sso-and-saml");
		assert.equal(draft.status, "draft");
		assert.equal(draft.publishedAt, null);
	});

	test("have Jekyll post links turned into blog links", () => {
		const links = contentOf(entry("posts", "notes-on")).flatMap((block) => block.markDefs ?? []);
		assert.deepEqual(
			links.map((link) => link.href),
			["/blog/c/", "/blog/cpp/"],
		);
		assert.doesNotMatch(JSON.stringify(entry("posts", "notes-on")), /\{%/);
	});

	test("lose Jekyll raw tags", () => {
		const [code] = contentOf(entry("posts", "simple-latex-drafting-commands")).filter(
			(block) => block._type === "code",
		);
		assert.doesNotMatch(String(code?.code), /raw/);
		assert.match(String(code?.code), /^\\newcommand/);
	});

	test("keep code blocks with their language, and inline code", () => {
		const content = contentOf(entry("posts", "cpp"));
		const code = content.filter((block) => block._type === "code");
		assert.deepEqual(
			code.map((block) => block.language),
			["cpp", "bash"],
		);
		assert.match(String(code[0]?.code), /std::cout << "Hello world!"/);

		const inlineCode = content.flatMap((block) => block.children ?? []).find((span) => span.text === "g++");
		assert.deepEqual(inlineCode?.marks, ["code"]);
		assert.ok(content.some((block) => block.style === "h2" && textOf(block) === "Setup"));
	});

	test("have $$…$$ maths turned into formulas, inline or on their own line", () => {
		const content = contentOf(entry("posts", "parallel-poisson-solver"));
		const inline = content.flatMap((block) => block.children ?? []).filter((child) => child._type === "math");
		assert.deepEqual(
			inline.map((formula) => formula.latex),
			["\\mathbf{r} \\in \\mathbb{R}^2", "[0,1]^2"],
		);
		const display = content.filter((block) => block._type === "math");
		assert.deepEqual(
			display.map((formula) => formula.latex),
			["\\nabla \\varphi(\\mathbf{r}) = \\rho(\\mathbf{r})"],
		);
	});

	test("keep images (to upload) and tables", () => {
		const content = contentOf(entry("posts", "3d-modular-origami-dragon"));
		const image = content.find((block) => block._type === "image");
		assert.deepEqual(image?.asset, { $asset: "img/origami/paper_stack.JPG" });
		assert.equal(image?.alt, "Stack of cut yellow paper");

		const table = content.find((block) => block._type === "table") as
			| { rows: { cells: { content: { text: string }[]; isHeader?: boolean }[] }[] }
			| undefined;
		assert.deepEqual(
			table?.rows.map((row) => row.cells.map((cell) => cell.content.map((span) => span.text).join(""))),
			[
				["Colour", "Pieces"],
				["Yellow", "400"],
			],
		);
		assert.equal(table?.rows[0]?.cells[0]?.isHeader, true);
	});

	test("have categories and tags turned into taxonomy terms", () => {
		assert.deepEqual(entry("posts", "c").taxonomies, { category: ["notes-on"] });
		assert.deepEqual(entry("posts", "simple-latex-drafting-commands").taxonomies, {
			tag: ["latex", "quick-tips"],
		});
		assert.equal(entry("posts", "notes-on").taxonomies, undefined);
	});
});

describe("walks and travel", () => {
	test("carry their route summary and map file", () => {
		const walk = entry("walks", "seven-sisters");
		assert.match(walk.publishedAt ?? "", /^2022-08-14T/);
		assert.deepEqual(
			{
				route_start: walk.data.route_start,
				route_end: walk.data.route_end,
				route_type: walk.data.route_type,
				distance: walk.data.distance,
				duration: walk.data.duration,
				gpx_url: walk.data.gpx_url,
				gpx_url_text: walk.data.gpx_url_text,
				map_data: walk.data.map_data,
			},
			{
				route_start: "Eastbourne",
				route_end: "East Dean",
				route_type: "Linear",
				distance: "11km",
				duration: "3 hours",
				gpx_url: "https://www.alltrails.com/explore/map/seven-sisters",
				gpx_url_text: "AllTrails",
				map_data: { $asset: "_walks/2022-08-14-seven-sisters.geojson" },
			},
		);
		assert.equal(textOf(contentOf(walk)[0]!), "Via Birling Gap and Seven Sisters");
	});

	test("turn waypoints into waypoint blocks, with photo rows and videos", () => {
		const waypoints = entry("walks", "seven-sisters").data.waypoints as Block[];
		assert.equal(waypoints.length, 3);
		assert.ok(waypoints.every((waypoint) => waypoint._type === "waypoint" && waypoint._version === 1));
		assert.equal(new Set(waypoints.map((waypoint) => waypoint._key)).size, 3);

		const [birlingGap, teaRoom, noCoordinates] = waypoints;
		assert.equal(birlingGap?.title, "Birling Gap");
		assert.equal(birlingGap?.latitude, 50.742012345678);
		assert.equal(birlingGap?.text, "The cliffs drop straight to the beach here.");
		assert.deepEqual(
			(birlingGap?.images as unknown[]).map(({ _key, ...image }: any) => image),
			[
				{ image: { $asset: "img/walks/2022-08-14-seven-sisters/cliffs.jpg", alt: "White chalk cliffs" }, flex: "2" },
				{ image: { $asset: "img/walks/2022-08-14-seven-sisters/lighthouse.jpg" }, flex: "auto", new_row: true },
			],
		);
		assert.deepEqual(
			(birlingGap?.videos as unknown[]).map(({ _key, ...video }: any) => video),
			[{ url: "https://www.youtube.com/embed/fixture", title: "Waves at Birling Gap" }],
		);
		assert.equal(teaRoom?.icon, "food");
		assert.equal(noCoordinates?.latitude, undefined);
		assert.equal(noCoordinates?.text, "Somewhere without coordinates.");
	});

	test("centre the map when there's no route file", () => {
		const trip = entry("travel", "new-york");
		assert.equal(trip.data.map_data, undefined);
		assert.deepEqual(
			[trip.data.map_latitude, trip.data.map_longitude, trip.data.map_zoom],
			[40.7633832837379, -73.98045737506159, 11],
		);
	});

	test("keep the headline video", () => {
		const trip = entry("travel", "round-the-world");
		assert.deepEqual(
			(trip.data.video as unknown[]).map(({ _key, ...video }: any) => video),
			[
				{
					url: "https://player.vimeo.com/video/1065483186?h=46c1385b66",
					title: "2024 Round the world",
					player: "vimeo",
					orientation: "horizontal",
					autoplay: true,
					mute: true,
					loop: true,
				},
			],
		);
		assert.deepEqual(trip.taxonomies, { tag: ["train"] });
	});
});

describe("the import", () => {
	test("uploads each referenced file once", () => {
		assert.deepEqual(plan.media.map((file) => file.path).sort(), [
			"_walks/2022-08-14-seven-sisters.geojson",
			"img/origami/paper_stack.JPG",
			"img/walks/2022-08-14-seven-sisters/cliffs.jpg",
			"img/walks/2022-08-14-seven-sisters/lighthouse.jpg",
		]);
	});

	test("can be limited to one collection or entry", () => {
		const walksOnly = dryRun("--only", "walks");
		assert.deepEqual(new Set(walksOnly.entries.map((e) => e.collection)), new Set(["walks"]));

		const one = dryRun("--only", "posts", "--slug", "cpp");
		assert.deepEqual(
			one.entries.map((e) => e.slug),
			["cpp"],
		);
	});
});
