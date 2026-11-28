/**
 * The route with a numbered pin for each placed waypoint. Tapping the map
 * places the selected waypoint there; pins can be dragged, and tapping one
 * selects its waypoint.
 */
import L from "leaflet";
import * as React from "react";
import { ACCENT, createMap, fetchGeoJson } from "../../../scripts/map-base";
import { positionOf, type Position, type Waypoint } from "./waypoints";

interface WaypointMapProps {
	waypoints: Waypoint[];
	selectedKey: string | undefined;
	routeUrl: string | undefined;
	onPlace: (key: string, position: Position) => void;
	onSelect: (key: string) => void;
}

const ROUTE_STYLE: L.PathOptions = { color: ACCENT, weight: 3, opacity: 0.8, className: "route-line" };

function pinIcon(number: number, selected: boolean) {
	return L.divIcon({
		className: `trip-editor-pin${selected ? " is-selected" : ""}`,
		// The number is for sighted users; screen readers get the pin's title
		html: `<span aria-hidden="true">${number}</span>`,
		iconSize: [28, 28],
		iconAnchor: [14, 14],
	});
}

/** Leaflet measures its container once; the dialog opens with an animation, so re-measure on resize. */
function useMapThatFollowsItsSize(container: React.RefObject<HTMLDivElement | null>) {
	const [map, setMap] = React.useState<L.Map>();
	React.useEffect(() => {
		if (!container.current) return;
		const created = createMap(container.current);
		const resizeObserver = new ResizeObserver(() => created.invalidateSize());
		resizeObserver.observe(container.current);
		setMap(created);
		return () => {
			resizeObserver.disconnect();
			created.remove();
		};
	}, [container]);
	return map;
}

function useRoute(map: L.Map | undefined, routeUrl: string | undefined) {
	const [routeBounds, setRouteBounds] = React.useState<L.LatLngBounds>();
	React.useEffect(() => {
		if (!map || !routeUrl) return;
		let route: L.GeoJSON | undefined;
		let cancelled = false;
		void fetchGeoJson(routeUrl).then((geoJson) => {
			if (cancelled || !geoJson) return;
			route = L.geoJSON(geoJson, { style: ROUTE_STYLE, interactive: false }).addTo(map);
			setRouteBounds(route.getBounds());
		});
		return () => {
			cancelled = true;
			route?.remove();
		};
	}, [map, routeUrl]);
	return routeBounds;
}

/** Frames the route, or the placed waypoints when there's no route, once when first known. */
function useInitialView(map: L.Map | undefined, routeBounds: L.LatLngBounds | undefined, waypoints: Waypoint[]) {
	const framed = React.useRef(false);
	React.useEffect(() => {
		if (!map || framed.current) return;
		const positions = waypoints.map(positionOf).filter((position) => position !== undefined);
		const bounds = routeBounds ?? (positions.length ? L.latLngBounds(positions.map(toLatLng)) : undefined);
		if (!bounds) return;
		map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
		framed.current = true;
	}, [map, routeBounds, waypoints]);
}

const toLatLng = ({ latitude, longitude }: Position): L.LatLngTuple => [latitude, longitude];
const fromLatLng = ({ lat, lng }: L.LatLng): Position => ({ latitude: lat, longitude: lng });

export function WaypointMap({ waypoints, selectedKey, routeUrl, onPlace, onSelect }: WaypointMapProps) {
	const container = React.useRef<HTMLDivElement>(null);
	const map = useMapThatFollowsItsSize(container);
	const routeBounds = useRoute(map, routeUrl);
	useInitialView(map, routeBounds, waypoints);

	React.useEffect(() => {
		if (!map || !selectedKey) return;
		const placeSelected = (event: L.LeafletMouseEvent) => onPlace(selectedKey, fromLatLng(event.latlng));
		map.on("click", placeSelected);
		return () => {
			map.off("click", placeSelected);
		};
	}, [map, selectedKey, onPlace]);

	React.useEffect(() => {
		if (!map) return;
		const pins = waypoints.flatMap((waypoint, index) => {
			const position = positionOf(waypoint);
			if (!position) return [];
			const selected = waypoint._key === selectedKey;
			const pin = L.marker(toLatLng(position), {
				icon: pinIcon(index + 1, selected),
				draggable: true,
				title: waypoint.title || `Waypoint ${index + 1}`,
				zIndexOffset: selected ? 1000 : 0,
			});
			pin.on("click", () => onSelect(waypoint._key));
			pin.on("dragend", () => onPlace(waypoint._key, fromLatLng(pin.getLatLng())));
			return [pin.addTo(map)];
		});
		return () => {
			for (const pin of pins) pin.remove();
		};
	}, [map, waypoints, selectedKey, onPlace, onSelect]);

	return <div ref={container} className="trip-editor-map" role="region" aria-label="Map of the route" />;
}
