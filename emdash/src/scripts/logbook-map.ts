/**
 * Logbook maps. Each is created, and its (large) GeoJSON downloaded, only
 * when the reader scrolls near it.
 *
 * Layers come in three kinds:
 * - areas:  visited countries/states/counties/boroughs, outlined in orange
 * - places: thousands of named points, drawn as dots on one canvas
 * - pins:   a handful of named points with standard markers
 * Every named feature shows its name in a pop-up.
 */
import L from "leaflet";
import { ACCENT, createMap, fetchGeoJson, ICONS, viewFrom } from "./map-base";

type LayerKind = "areas" | "places" | "pins";

const nameOf = (feature: GeoJSON.Feature | undefined): string | undefined =>
	typeof feature?.properties?.name === "string" ? feature.properties.name : undefined;

function layerFor(kind: LayerKind, geoJson: GeoJSON.GeoJsonObject): L.GeoJSON {
	const canvas = L.canvas();

	return L.geoJSON(geoJson, {
		style: { color: ACCENT, weight: 1, opacity: 0.65, className: "visited" },
		pointToLayer: (feature, latlng) => {
			const name = nameOf(feature) ?? "";
			return kind === "places"
				? L.circleMarker(latlng, { renderer: canvas, radius: 3, color: ACCENT, weight: 1, fillOpacity: 0.65 })
				: L.marker(latlng, { icon: ICONS.pin, alt: name, title: name });
		},
		onEachFeature: (feature, layer) => {
			const name = nameOf(feature);
			if (name) layer.bindPopup(name);
		},
	});
}

async function showLayer(element: HTMLElement) {
	const map = createMap(element, viewFrom(element.dataset));
	const { layerUrl, kind = "areas" } = element.dataset;
	if (!layerUrl) return;

	const geoJson = await fetchGeoJson(layerUrl);
	if (!geoJson) return;
	const layer = layerFor(kind as LayerKind, geoJson).addTo(map);
	// Keep a fixed starting view (e.g. the whole world) when one is given
	if (!viewFrom(element.dataset)) map.fitBounds(layer.getBounds());
}

export function initLogbookMaps(elements: Iterable<HTMLElement>) {
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				observer.unobserve(entry.target);
				void showLayer(entry.target as HTMLElement);
			}
		},
		{ rootMargin: "200px 0px" },
	);
	for (const element of elements) observer.observe(element);
}
