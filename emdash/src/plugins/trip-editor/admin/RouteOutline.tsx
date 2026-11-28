/** A small outline of an activity's route, to tell similar walks apart at a glance. */
import * as React from "react";
import { decodePolyline } from "./strava-activities";

const WIDTH = 96;
const HEIGHT = 64;
const PADDING = 4;

/** Fits the points into the box, correcting longitude for latitude so shapes aren't stretched. */
function outlinePath(points: [number, number][]): string {
	const latitudes = points.map(([latitude]) => latitude);
	const middleLatitude = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
	const squash = Math.cos((middleLatitude * Math.PI) / 180);
	const projected = points.map(([latitude, longitude]) => [longitude * squash, -latitude] as const);
	const xs = projected.map(([x]) => x);
	const ys = projected.map(([, y]) => y);
	const [minX, minY] = [Math.min(...xs), Math.min(...ys)];
	const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1;
	const scale = Math.min(WIDTH, HEIGHT) - 2 * PADDING;
	return projected
		.map(([x, y], index) => `${index ? "L" : "M"}${(PADDING + ((x - minX) / span) * scale).toFixed(1)},${(PADDING + ((y - minY) / span) * scale).toFixed(1)}`)
		.join("");
}

export function RouteOutline({ polyline }: { polyline: string | null }) {
	const path = React.useMemo(() => {
		const points = polyline ? decodePolyline(polyline) : [];
		return points.length > 1 ? outlinePath(points) : undefined;
	}, [polyline]);
	return (
		<svg className="trip-editor-outline" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
			{path && <path d={path} />}
		</svg>
	);
}
