/** Old site entries → EmDash entries, plus the files they need uploaded. */
import type { Collection, LegacyEntry } from "./legacy.ts";
import { type AssetRef, type Block, markdownToPortableText } from "./markdown.ts";
import { MediaFiles } from "./media-files.ts";

export interface PlannedEntry {
	collection: Collection;
	slug: string;
	status: "published" | "draft";
	publishedAt: string | null;
	data: Record<string, unknown>;
	taxonomies?: Record<string, string[]>;
	/** Where it came from, for progress messages */
	source: string;
}

export interface ImportPlan {
	entries: PlannedEntry[];
	media: { path: string }[];
	/** Problems in the old content that the import worked around */
	warnings: string[];
}

/** Categories that only said which section an entry was in */
const SECTION_CATEGORIES = new Set(["blog", "walk", "travel"]);
/** Terms of the seed's hierarchical `category` taxonomy; anything else is a tag */
const POST_CATEGORIES = new Set(["notes-on"]);

/** Drops undefined values so absent fields stay absent. */
const compact = <T extends Record<string, unknown>>(object: T): T =>
	Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined)) as T;

const asString = (value: unknown) => (value === undefined || value === null ? undefined : String(value));

/** Old waypoint photo URLs are relative to app/img, with or without a leading slash. */
const imagePath = (url: string) => `img/${url.replace(/^\//, "")}`;

function taxonomiesFor(entry: LegacyEntry): Record<string, string[]> | undefined {
	const { categories, tags } = entry.frontmatter;
	const extraCategories = String(categories ?? "")
		.split(/\s+/)
		.filter((term) => term && !SECTION_CATEGORIES.has(term));
	// Tags were space-separated in the old frontmatter
	const tagList = (Array.isArray(tags) ? tags : String(tags ?? "").split(/[\s,]+/))
		.map((tag: string) => tag.trim())
		.filter(Boolean);

	const category = entry.collection === "posts" ? extraCategories.filter((t) => POST_CATEGORIES.has(t)) : [];
	const tag = [...extraCategories.filter((t) => !category.includes(t)), ...tagList];
	const taxonomies = compact({
		category: category.length ? category : undefined,
		tag: tag.length ? tag : undefined,
	});
	return Object.keys(taxonomies).length ? taxonomies : undefined;
}

function convertImages(images: any[] | undefined, media: MediaFiles, source: string) {
	if (!images?.length) return undefined;
	let startNewRow = false;
	const rows = images.flatMap((image, index) => {
		if (image.space === "break") {
			startNewRow = true;
			return [];
		}
		const path = imagePath(image.url);
		if (!media.use(path, source)) return [];
		const converted = compact({
			_key: `photo-${index}`,
			image: compact({ $asset: path, alt: image.alt }),
			flex: asString(image.flex),
			new_row: startNewRow || undefined,
		});
		startNewRow = false;
		return [converted];
	});
	return rows.length ? rows : undefined;
}

function convertWaypoint(waypoint: any, index: number, media: MediaFiles, source: string): Block {
	return compact({
		_type: "waypoint",
		_version: 1,
		_key: `waypoint-${index}`,
		title: waypoint.title,
		latitude: waypoint.latitude,
		longitude: waypoint.longitude,
		icon: waypoint.icon,
		text: waypoint.text,
		images: convertImages(waypoint.images, media, source),
		videos: waypoint.videos?.map((video: any, videoIndex: number) =>
			compact({ _key: `video-${videoIndex}`, url: video.url, title: video.title }),
		),
	});
}

function tripData(entry: LegacyEntry, media: MediaFiles): Record<string, unknown> {
	const { map = {}, route = {}, video } = entry.frontmatter;
	const mapPath = map.data ? `${entry.folder}/${map.data}` : undefined;
	const mapFile = mapPath && media.use(mapPath, entry.path) ? mapPath : undefined;

	return compact({
		route_start: route.start,
		route_end: route.end,
		route_type: route.type,
		distance: asString(route.distance),
		duration: asString(route.duration),
		gpx_url: route.gpx_url,
		gpx_url_text: route.gpx_url_text,
		map_data: mapFile ? ({ $asset: mapFile } satisfies AssetRef) : undefined,
		map_latitude: map.latitude,
		map_longitude: map.longitude,
		map_zoom: map.zoomLevel,
		video: video
			? [
					compact({
						_key: "video-0",
						url: video.url,
						title: video.title,
						player: video.player,
						orientation: video.orientation,
						autoplay: video.autoplay,
						mute: video.mute,
						loop: video.loop,
					}),
				]
			: undefined,
		waypoints: route.waypoints?.map((waypoint: any, index: number) =>
			convertWaypoint(waypoint, index, media, entry.path),
		),
	});
}

/**
 * The old site had dates without times, and listed same-day entries in
 * reverse filename order. Midday plus a second per earlier filename keeps
 * that order when sorting by publish date.
 */
function publishDates(entries: LegacyEntry[]): Map<LegacyEntry, string> {
	const dates = new Map<LegacyEntry, string>();
	const byDay = Map.groupBy(
		entries.filter((entry) => !entry.draft),
		(entry) => `${entry.collection}/${entry.date}`,
	);
	for (const sameDay of byDay.values()) {
		[...sameDay]
			.sort((a, b) => a.slug.localeCompare(b.slug))
			.forEach((entry, index) => {
				dates.set(entry, new Date(Date.parse(`${entry.date}T12:00:00Z`) + index * 1000).toISOString());
			});
	}
	return dates;
}

export function planImport(legacy: LegacyEntry[], siteRoot: string): ImportPlan {
	const media = new MediaFiles(siteRoot);
	const dates = publishDates(legacy);

	const entries = legacy.map((entry): PlannedEntry => {
		const content = markdownToPortableText(entry.body, media, entry.path);
		return compact({
			collection: entry.collection,
			slug: entry.slug,
			status: entry.draft ? "draft" : "published",
			publishedAt: dates.get(entry) ?? null,
			data: compact({
				title: String(entry.frontmatter.title ?? entry.slug),
				content: content.length ? content : undefined,
				...(entry.collection === "posts" ? {} : tripData(entry, media)),
			}),
			taxonomies: taxonomiesFor(entry),
			source: entry.path,
		});
	});

	return { entries, media: [...media.paths].sort().map((path) => ({ path })), warnings: media.warnings };
}
