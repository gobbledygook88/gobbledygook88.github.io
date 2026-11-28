/**
 * Strava activities as the admin shows them, and the walk fields an activity
 * fills in, in the same style as the walks already written ("14.5km",
 * "2.5 hours").
 */
import type { ActivitySummary } from "../strava/strava";

export type { ActivitySummary };

/**
 * The activity ID in a pasted link ("strava.com/activities/123…") or a bare
 * ID. Strava's IDs are long, so a short number such as a year is a search.
 */
export function activityIdFrom(text: string): string | undefined {
	const trimmed = text.trim();
	if (/^\d{6,}$/.test(trimmed)) return trimmed;
	return trimmed.match(/strava\.com\/activities\/(\d+)/)?.[1];
}

/** Strava's short share links (strava.app.link) can only be followed by the server. */
export function isStravaShareLink(text: string): boolean {
	return /^https:\/\/strava\.app\.link\/\w+/.test(text.trim());
}

export function activityUrl(id: number): string {
	return `https://www.strava.com/activities/${id}`;
}

export function distanceText(metres: number): string {
	return `${Number((metres / 1000).toFixed(1))}km`;
}

/** Moving time to the nearest half hour, or minutes for short outings. */
export function durationText(seconds: number): string {
	if (seconds < 50 * 60) return `${Math.max(1, Math.round(seconds / 60))} minutes`;
	const hours = Math.round((seconds / 3600) * 2) / 2;
	return hours === 1 ? "1 hour" : `${hours} hours`;
}

/** Strava gives local start times with a "Z", so format them as UTC to keep the local date. */
export function dateText(startedAt: string): string {
	return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
		Date.parse(startedAt),
	);
}

/** Decodes a Google-encoded polyline (Strava's summary_polyline) to [latitude, longitude] points. */
export function decodePolyline(encoded: string): [number, number][] {
	const points: [number, number][] = [];
	let index = 0;
	const position = [0, 0];
	while (index < encoded.length) {
		for (const axis of [0, 1]) {
			let shift = 0;
			let result = 0;
			let byte: number;
			do {
				byte = encoded.charCodeAt(index++) - 63;
				result |= (byte & 0x1f) << shift;
				shift += 5;
			} while (byte >= 0x20 && index < encoded.length);
			position[axis]! += result & 1 ? ~(result >> 1) : result >> 1;
		}
		points.push([position[0]! / 1e5, position[1]! / 1e5]);
	}
	return points;
}

/** A file name for the route file, from the activity's name. */
export function routeFileName(name: string): string {
	const slug = name
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
	return `${slug || "strava-route"}.geojson`;
}

const WALKING_TYPES = new Set(["Walk", "Hike"]);

export function isWalkOrHike(activity: ActivitySummary): boolean {
	return WALKING_TYPES.has(activity.sportType);
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

const normalise = (text: string) =>
	text
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "");

/** The month (0–11) a word names, if it's a month name or its first three letters */
function monthNamed(word: string): number | undefined {
	if (word.length < 3) return undefined;
	const index = MONTHS.findIndex((month) => month.startsWith(word));
	return index >= 0 ? index : undefined;
}

/**
 * Whether an activity matches a search: every word must be in its title, or
 * be the year ("2019") or month ("june", "jun") it was recorded.
 */
export function matchesSearch(activity: ActivitySummary, search: string): boolean {
	const title = normalise(activity.name);
	const started = new Date(Date.parse(activity.startedAt));
	return normalise(search)
		.split(/\s+/)
		.filter(Boolean)
		.every((word) => {
			if (title.includes(word)) return true;
			if (/^\d{4}$/.test(word)) return started.getUTCFullYear() === Number(word);
			const month = monthNamed(word);
			return month !== undefined && started.getUTCMonth() === month;
		});
}
