/**
 * The trip map: OpenStreetMap tiles, the route line from the trip's GeoJSON,
 * and a marker that follows the waypoint the reader points at.
 */
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import pinIconUrl from "../icons/location-dot-solid.svg?url";
import foodIconUrl from "../icons/utensils-solid.svg?url";

// CARTO's basemaps (used by the old site) now return an "API key required"
// placeholder. OpenStreetMap's own tiles are free with attribution:
// https://operations.osmfoundation.org/policies/tiles/
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';
const ROUTE_STYLE: L.PathOptions = {
	color: "#ff7800",
	weight: 3,
	opacity: 0.65,
	className: "route-line",
};
const DEFAULT_VIEW = { center: L.latLng(51.505, -0.09), zoom: 13 };

const markerIcon = (iconUrl: string) =>
	L.icon({ iconUrl, iconSize: [12, 16], iconAnchor: [6, 16] });
const ICONS: Record<string, L.Icon> = {
	food: markerIcon(foodIconUrl),
	pin: markerIcon(pinIconUrl),
};

const numberFrom = (value: string | undefined) => {
	const parsed = Number.parseFloat(value ?? "");
	return Number.isFinite(parsed) ? parsed : undefined;
};

async function drawRoute(map: L.Map, url: string, zoom: number | undefined) {
	const response = await fetch(url);
	if (!response.ok) return;
	const route = L.geoJSON(await response.json(), { style: ROUTE_STYLE }).addTo(map);
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
	const { routeUrl, latitude, longitude, zoom } = element.dataset;
	const centre = numberFrom(latitude) !== undefined && numberFrom(longitude) !== undefined
		? L.latLng(numberFrom(latitude)!, numberFrom(longitude)!)
		: DEFAULT_VIEW.center;
	const zoomLevel = numberFrom(zoom);

	const map = L.map(element).setView(centre, zoomLevel ?? DEFAULT_VIEW.zoom);
	L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);

	if (routeUrl) void drawRoute(map, routeUrl, zoomLevel);
	followWaypoints(map, document.querySelectorAll<HTMLElement>(".waypoint"));
}
