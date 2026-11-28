/**
 * Reads a GPX file (from Strava's or Garmin Connect's export, AllTrails, …)
 * into the route file trips use, with its distance and, when the points have
 * times, how long was spent moving.
 */
import type { RouteForForm } from "./route-into-form";

interface TrackPoint {
	latitude: number;
	longitude: number;
	elevation?: number;
	time?: number;
}

export class GpxProblem extends Error {}

/** Slower than this between two points counts as stopped (a slow amble is ~0.8 m/s) */
const STOPPED_METRES_PER_SECOND = 0.3;
const EARTH_RADIUS_METRES = 6_371_008.8;

function metresBetween(a: TrackPoint, b: TrackPoint): number {
	const radians = (degrees: number) => (degrees * Math.PI) / 180;
	const latitudeChange = radians(b.latitude - a.latitude);
	const longitudeChange = radians(b.longitude - a.longitude);
	const h =
		Math.sin(latitudeChange / 2) ** 2 +
		Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitudeChange / 2) ** 2;
	return 2 * EARTH_RADIUS_METRES * Math.asin(Math.sqrt(h));
}

function pointFrom(element: Element): TrackPoint | undefined {
	const latitude = Number.parseFloat(element.getAttribute("lat") ?? "");
	const longitude = Number.parseFloat(element.getAttribute("lon") ?? "");
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
	const elevation = Number.parseFloat(element.getElementsByTagName("ele")[0]?.textContent ?? "");
	const time = Date.parse(element.getElementsByTagName("time")[0]?.textContent ?? "");
	return {
		latitude,
		longitude,
		...(Number.isFinite(elevation) ? { elevation } : {}),
		...(Number.isFinite(time) ? { time } : {}),
	};
}

/** Track segments, or a planned route's points when there's no recorded track */
function linesFrom(gpx: Document): TrackPoint[][] {
	const segments = [...gpx.getElementsByTagName("trkseg")].map((segment) =>
		[...segment.getElementsByTagName("trkpt")].map(pointFrom).filter((point) => point !== undefined),
	);
	const routes = [...gpx.getElementsByTagName("rte")].map((route) =>
		[...route.getElementsByTagName("rtept")].map(pointFrom).filter((point) => point !== undefined),
	);
	return [...segments, ...routes].filter((line) => line.length >= 2);
}

function distanceOf(lines: TrackPoint[][]): number {
	return lines.reduce((total, line) => total + line.slice(1).reduce((sum, point, i) => sum + metresBetween(line[i]!, point), 0), 0);
}

/** Time spent moving, leaving out stops; undefined when the points have no times. */
function movingSecondsOf(lines: TrackPoint[][]): number | undefined {
	let moving = 0;
	let timed = false;
	for (const line of lines) {
		for (let i = 1; i < line.length; i++) {
			const [from, to] = [line[i - 1]!, line[i]!];
			if (from.time === undefined || to.time === undefined || to.time <= from.time) continue;
			timed = true;
			const seconds = (to.time - from.time) / 1000;
			if (metresBetween(from, to) / seconds >= STOPPED_METRES_PER_SECOND) moving += seconds;
		}
	}
	return timed ? moving : undefined;
}

const coordinates = (line: TrackPoint[]) =>
	line.map(({ latitude, longitude, elevation }) =>
		elevation === undefined ? [longitude, latitude] : [longitude, latitude, elevation],
	);

export function routeFromGpx(text: string, fileName: string): RouteForForm {
	const gpx = new DOMParser().parseFromString(text, "application/xml");
	const lines = gpx.getElementsByTagName("parsererror").length ? [] : linesFrom(gpx);
	if (lines.length === 0) throw new GpxProblem("That file has no GPS track in it. Choose a GPX file of the walk.");

	const name =
		gpx.querySelector("trk > name")?.textContent?.trim() ||
		gpx.querySelector("metadata > name")?.textContent?.trim() ||
		fileName.replace(/\.gpx$/i, "");
	const geometry =
		lines.length === 1
			? { type: "LineString", coordinates: coordinates(lines[0]!) }
			: { type: "MultiLineString", coordinates: lines.map(coordinates) };

	return {
		name,
		geoJson: { type: "FeatureCollection", features: [{ type: "Feature", properties: { name }, geometry }] },
		distanceMetres: distanceOf(lines),
		movingSeconds: movingSecondsOf(lines),
	};
}
