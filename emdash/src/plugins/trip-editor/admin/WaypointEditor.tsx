/**
 * The full-screen waypoint editor: the route map above the list of waypoints.
 * The panel that opens it holds the waypoints being edited.
 */
import { MediaPickerModal, type MediaItem } from "@emdash-cms/admin";
import { Button } from "@cloudflare/kumo";
import * as React from "react";
import { WaypointCard } from "./WaypointCard";
import { WaypointMap } from "./WaypointMap";
import {
	addPhotos,
	moveWaypoint,
	newWaypoint,
	placeWaypoint,
	removePhoto,
	removeWaypoint,
	updateWaypoint,
	type Position,
	type Waypoint,
} from "./waypoints";

interface WaypointEditorProps {
	waypoints: Waypoint[];
	setWaypoints: React.Dispatch<React.SetStateAction<Waypoint[]>>;
	routeUrl: string | undefined;
	onDone: () => void;
}

export function WaypointEditor({ waypoints, setWaypoints, routeUrl, onDone }: WaypointEditorProps) {
	const [selectedKey, setSelectedKey] = React.useState(waypoints[0]?._key);
	const [choosingPhotosFor, setChoosingPhotosFor] = React.useState<string>();

	const place = React.useCallback(
		(key: string, position: Position) => {
			setWaypoints((current) => placeWaypoint(current, key, position));
			setSelectedKey(key);
		},
		[setWaypoints],
	);

	const addWaypoint = () => {
		const waypoint = newWaypoint();
		setWaypoints((current) => [...current, waypoint]);
		setSelectedKey(waypoint._key);
	};

	return (
		<div className="trip-editor">
			<header className="trip-editor-header">
				<Button variant="primary" onClick={onDone}>
					Done
				</Button>
			</header>

			<WaypointMap
				waypoints={waypoints}
				selectedKey={selectedKey}
				routeUrl={routeUrl}
				onPlace={place}
				onSelect={setSelectedKey}
			/>

			<div className="trip-editor-list">
				{waypoints.length === 0 && <p>No waypoints yet. Add one, then tap the map where it is.</p>}
				{waypoints.map((waypoint, index) => (
					<WaypointCard
						key={waypoint._key}
						waypoint={waypoint}
						number={index + 1}
						selected={waypoint._key === selectedKey}
						isFirst={index === 0}
						isLast={index === waypoints.length - 1}
						onSelect={() => setSelectedKey(waypoint._key)}
						onChange={(changes) => setWaypoints((current) => updateWaypoint(current, waypoint._key, changes))}
						onSelectPhotos={() => setChoosingPhotosFor(waypoint._key)}
						onRemovePhoto={(photoKey) => setWaypoints((current) => removePhoto(current, waypoint._key, photoKey))}
						onMove={(offset) => setWaypoints((current) => moveWaypoint(current, waypoint._key, offset))}
						onRemove={() => setWaypoints((current) => removeWaypoint(current, waypoint._key))}
					/>
				))}
				<Button variant="secondary" onClick={addWaypoint}>
					Add waypoint
				</Button>
			</div>

			<MediaPickerModal
				open={choosingPhotosFor !== undefined}
				onOpenChange={(open) => !open && setChoosingPhotosFor(undefined)}
				multiple
				onSelect={() => {}}
				onSelectMany={(items: MediaItem[]) => {
					if (choosingPhotosFor) setWaypoints((current) => addPhotos(current, choosingPhotosFor, items));
					setChoosingPhotosFor(undefined);
				}}
				mimeTypeFilter="image/"
				title="Select photos"
			/>
		</div>
	);
}
