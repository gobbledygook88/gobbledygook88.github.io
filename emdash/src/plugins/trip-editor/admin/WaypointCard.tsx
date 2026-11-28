/** One waypoint in the editor's list: its title, notes, photos and where it is on the map. */
import { Button, Input, InputArea } from "@cloudflare/kumo";
import * as React from "react";
import { photosOf, positionOf, thumbnailUrl, type Waypoint } from "./waypoints";

const MAP_ICONS = [
	{ value: "pin", label: "Pin" },
	{ value: "food", label: "Food" },
	{ value: "train", label: "Train" },
];

interface WaypointCardProps {
	waypoint: Waypoint;
	number: number;
	selected: boolean;
	isFirst: boolean;
	isLast: boolean;
	onSelect: () => void;
	onChange: (changes: Partial<Waypoint>) => void;
	onSelectPhotos: () => void;
	onRemovePhoto: (photoKey: string) => void;
	onMove: (offset: -1 | 1) => void;
	onRemove: () => void;
}

export function WaypointCard(props: WaypointCardProps) {
	const { waypoint, number, selected, onSelect, onChange } = props;
	const headingId = `trip-editor-waypoint-${waypoint._key}`;
	const name = waypoint.title || `Waypoint ${number}`;

	return (
		<section
			className={`trip-editor-card${selected ? " is-selected" : ""}`}
			aria-labelledby={headingId}
			aria-current={selected ? "true" : undefined}
			onFocusCapture={onSelect}
			onClick={onSelect}
		>
			<h3 id={headingId} className="trip-editor-card-heading">
				<span className="trip-editor-card-number" aria-hidden="true">
					{number}
				</span>
				{name}
			</h3>

			<WaypointPosition waypoint={waypoint} selected={selected} onClear={() => onChange({ latitude: null, longitude: null })} />

			<Input label="Title" value={waypoint.title ?? ""} onChange={(event) => onChange({ title: event.target.value })} />

			<label className="trip-editor-select">
				<span>Map icon</span>
				<select value={waypoint.icon ?? "pin"} onChange={(event) => onChange({ icon: event.target.value })}>
					{MAP_ICONS.map(({ value, label }) => (
						<option key={value} value={value}>
							{label}
						</option>
					))}
				</select>
			</label>

			<InputArea label="Notes" value={waypoint.text ?? ""} autoResize onValueChange={(text) => onChange({ text })} />

			<WaypointPhotos {...props} />

			<WaypointActions {...props} name={name} />
		</section>
	);
}

function WaypointPosition({ waypoint, selected, onClear }: { waypoint: Waypoint; selected: boolean; onClear: () => void }) {
	const position = positionOf(waypoint);
	if (!position) {
		return (
			<p className="trip-editor-position is-missing" role="status">
				{selected ? "Tap the map where this waypoint is." : "Not on the map yet."}
			</p>
		);
	}
	return (
		<p className="trip-editor-position" role="status">
			<span>
				On the map at {position.latitude}, {position.longitude}
				{selected ? ". Tap the map or drag its pin to move it." : ""}
			</span>
			<Button size="xs" variant="ghost" onClick={onClear}>
				Remove from map
			</Button>
		</p>
	);
}

function WaypointPhotos({ waypoint, onSelectPhotos, onRemovePhoto }: WaypointCardProps) {
	const photos = photosOf(waypoint);
	return (
		<div className="trip-editor-photos">
			<span className="trip-editor-label">Photos</span>
			{photos.length > 0 && (
				<ul aria-label="Photos">
					{photos.map((photo, index) => (
						<li key={photo._key}>
							<img src={thumbnailUrl(photo.image)} alt={photo.image.alt || `Photo ${index + 1}`} loading="lazy" />
							<Button
								size="xs"
								variant="secondary"
								shape="square"
								aria-label={`Remove photo ${index + 1}`}
								onClick={() => onRemovePhoto(photo._key)}
							>
								×
							</Button>
						</li>
					))}
				</ul>
			)}
			<Button variant="secondary" onClick={onSelectPhotos}>
				Select photos
			</Button>
		</div>
	);
}

function WaypointActions({ isFirst, isLast, onMove, onRemove, name }: WaypointCardProps & { name: string }) {
	const [confirming, setConfirming] = React.useState(false);
	if (confirming) {
		return (
			<div className="trip-editor-actions" role="group" aria-label="Confirm removal">
				<span>Remove {name}?</span>
				<Button size="sm" variant="destructive" onClick={onRemove}>
					Remove
				</Button>
				<Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
					Keep
				</Button>
			</div>
		);
	}
	return (
		<div className="trip-editor-actions">
			<Button size="sm" variant="ghost" disabled={isFirst} onClick={() => onMove(-1)}>
				Move up
			</Button>
			<Button size="sm" variant="ghost" disabled={isLast} onClick={() => onMove(1)}>
				Move down
			</Button>
			<Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
				Remove waypoint
			</Button>
		</div>
	);
}
