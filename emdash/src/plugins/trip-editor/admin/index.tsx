/** The trip editor's admin module: what it adds to EmDash's admin. */
import type { ContentEditorPanelExtension } from "@emdash-cms/admin";
import { RoutePanel } from "./RoutePanel";
import { WaypointsPanel } from "./WaypointsPanel";

const TRIP_COLLECTIONS = ["walks", "travel"];

export const contentEditorPanels = [
	{ id: "route", title: "Route", component: RoutePanel, collections: TRIP_COLLECTIONS, order: 1 },
	{ id: "waypoints", title: "Waypoints", component: WaypointsPanel, collections: TRIP_COLLECTIONS, order: 2 },
] satisfies readonly ContentEditorPanelExtension[];
