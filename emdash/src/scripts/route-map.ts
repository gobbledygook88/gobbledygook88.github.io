/**
 * The trip map: the route line from the trip's GeoJSON (or the given centre),
 * and a marker that follows the waypoint the reader points at.
 */
import L from "leaflet";
import { ACCENT, createMap, fetchGeoJson, ICONS, numberFrom, viewFrom } from "./map-base";

const ROUTE_STYLE: L.PathOptions = { color: ACCENT, weight: 3, opacity: 0.65, className: "route-line" };

async function drawRoute(map: L.Map, url: string, zoom: number | undefined) {
	const geoJson = await fetchGeoJson(url);
	if (!geoJson) return;
	const route = L.geoJSON(geoJson, { style: ROUTE_STYLE }).addTo(map);
	map.fitBounds(route.getBounds());
	if (zoom !== undefined) map.setZoom(zoom);
}

function followWaypoints(map: L.Map, waypoints: Iterable<HTMLElement>) {
	let marker: L.Marker | undefined;

	const mark = (waypoint: HTMLElement) => {
		const latitude = numberFrom(waypoint.dataset.latitude);
		const longitude = numberFrom(waypoint.dataset.longitude);
		if (latitude === undefined || longitude === undefined) return;

		marker?.remove();
		const title = waypoint.dataset.title ?? "";
		marker = L.marker([latitude, longitude], {
			icon: ICONS[waypoint.dataset.icon ?? "pin"] ?? ICONS.pin,
			alt: title,
			title,
			keyboard: false,
		}).addTo(map);
	};

	for (const waypoint of waypoints) {
		// pointerenter covers mouse hover and touch taps
		waypoint.addEventListener("pointerenter", () => mark(waypoint));
	}
}

export function initRouteMap(element: HTMLElement) {
	const map = createMap(element, viewFrom(element.dataset));
	const { routeUrl, zoom } = element.dataset;

	if (routeUrl) void drawRoute(map, routeUrl, numberFrom(zoom));
	followWaypoints(map, document.querySelectorAll<HTMLElement>(".waypoint"));
}
