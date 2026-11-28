/**
 * A panel in the walk/trip editor's sidebar that opens the waypoint editor.
 *
 * EmDash doesn't allow custom editors for blocks fields, so the panel reads
 * the waypoints and route from the open form (unsaved changes included) and
 * puts the edited waypoints back into the form, where they're saved as usual.
 */
import type { ContentEditorPanelContext } from "@emdash-cms/admin";
import { Button, Dialog } from "@cloudflare/kumo";
import * as React from "react";
import { fileUrl } from "../../../lib/media";
import { WaypointEditor } from "./WaypointEditor";
import { positionOf, waypointsFrom, type Waypoint } from "./waypoints";
import "./trip-editor.css";

interface RouteFile {
	id: string;
	src?: string;
	meta?: { storageKey?: unknown };
}

/** Inline, so it wins over the dialog's own size classes */
const FULL_SCREEN: React.CSSProperties = {
	width: "100vw",
	maxWidth: "100vw",
	height: "100dvh",
	maxHeight: "100dvh",
	borderRadius: 0,
};

function summarise(waypoints: Waypoint[]): string {
	if (waypoints.length === 0) return "No waypoints yet.";
	const placed = waypoints.filter((waypoint) => positionOf(waypoint)).length;
	const total = waypoints.length === 1 ? "1 waypoint" : `${waypoints.length} waypoints`;
	return `${total}, ${placed} on the map.`;
}

export function WaypointsPanel({ editorDraft }: ContentEditorPanelContext) {
	const [editing, setEditing] = React.useState<Waypoint[]>();
	const [routeUrl, setRouteUrl] = React.useState<string>();
	const [problem, setProblem] = React.useState<string>();

	if (!editorDraft) return <p>This version of EmDash can't open the waypoint editor.</p>;
	const draft = editorDraft.get();
	const waypoints = waypointsFrom(draft.fields.waypoints);

	const open = () => {
		const current = editorDraft.get();
		setProblem(undefined);
		setRouteUrl(fileUrl(current.fields.map_data as RouteFile | null));
		setEditing(waypointsFrom(current.fields.waypoints));
	};

	const putIntoForm = () => {
		if (!editing) return;
		// Read the latest revision: the form can't change while the editor covers it
		const { revision } = editorDraft.get();
		const result = editorDraft.patch([{ op: "set", field: "waypoints", value: editing }], {
			expectedRevision: revision,
		});
		if (!result.ok) setProblem("The waypoints couldn't be added to the form. Open the editor and try again.");
		setEditing(undefined);
	};

	return (
		<div className="trip-editor-panel">
			<p>{summarise(waypoints)}</p>
			{draft.readOnly ? (
				<p>The walk can't be edited right now.</p>
			) : (
				<Button variant="secondary" onClick={open}>
					Edit waypoints
				</Button>
			)}
			{problem && <p role="alert">{problem}</p>}

			<Dialog.Root open={editing !== undefined} onOpenChange={(isOpen) => !isOpen && putIntoForm()}>
				<Dialog size="xl" className="trip-editor-dialog" style={FULL_SCREEN}>
					<Dialog.Title>Waypoints</Dialog.Title>
					{editing && (
						<WaypointEditor
							waypoints={editing}
							setWaypoints={setEditing as React.Dispatch<React.SetStateAction<Waypoint[]>>}
							routeUrl={routeUrl}
							onDone={putIntoForm}
						/>
					)}
				</Dialog>
			</Dialog.Root>
		</div>
	);
}
