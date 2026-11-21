/** What every map on the site shares: Leaflet, tiles, colours and marker icons. */
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import pinIconUrl from "../icons/location-dot-solid.svg?url";
import foodIconUrl from "../icons/utensils-solid.svg?url";

// CARTO's basemaps (used by the old site) now return an "API key required"
// placeholder. OpenStreetMap's own tiles are free with attribution:
// https://operations.osmfoundation.org/policies/tiles/
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';

export const ACCENT = "#ff7800";

const markerIcon = (iconUrl: string) => L.icon({ iconUrl, iconSize: [12, 16], iconAnchor: [6, 16] });

export const ICONS: Record<string, L.Icon> = {
	food: markerIcon(foodIconUrl),
	pin: markerIcon(pinIconUrl),
};

export interface MapView {
	centre: L.LatLngExpression;
	zoom: number;
}

const LONDON: MapView = { centre: [51.505, -0.09], zoom: 13 };

export function createMap(element: HTMLElement, view: MapView = LONDON, options: L.MapOptions = {}) {
	const map = L.map(element, options).setView(view.centre, view.zoom);
	L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
	return map;
}

/** Parses a numeric data attribute; undefined when missing or not a number. */
export function numberFrom(value: string | undefined): number | undefined {
	const parsed = Number.parseFloat(value ?? "");
	return Number.isFinite(parsed) ? parsed : undefined;
}

/** A view from latitude/longitude/zoom data attributes, if all are set. */
export function viewFrom(dataset: DOMStringMap): MapView | undefined {
	const latitude = numberFrom(dataset.latitude);
	const longitude = numberFrom(dataset.longitude);
	const zoom = numberFrom(dataset.zoom);
	if (latitude === undefined || longitude === undefined) return undefined;
	return { centre: [latitude, longitude], zoom: zoom ?? LONDON.zoom };
}

export async function fetchGeoJson(url: string): Promise<GeoJSON.GeoJsonObject | undefined> {
	const response = await fetch(url);
	return response.ok ? response.json() : undefined;
}
