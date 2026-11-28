/** The trip editor's admin module: what it adds to EmDash's admin. */
import type { ContentEditorPanelExtension } from "@emdash-cms/admin";
import { WaypointsPanel } from "./WaypointsPanel";

export const contentEditorPanels = [
	{
		id: "waypoints",
		title: "Waypoints",
		component: WaypointsPanel,
		collections: ["walks", "travel"],
		order: 1,
	},
] satisfies readonly ContentEditorPanelExtension[];
