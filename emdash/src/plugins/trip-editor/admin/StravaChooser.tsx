/**
 * Finding the Strava activity a walk was recorded as: paste its link, or pick
 * the date to list the walks and hikes recorded that day.
 */
import { Button, Dialog, Input } from "@cloudflare/kumo";
import * as React from "react";
import { RouteOutline } from "./RouteOutline";
import { activityById, activityByShareLink, StravaProblem, walksOnDate } from "./strava-api";
import {
	activityIdFrom,
	dateText,
	distanceText,
	durationText,
	isStravaShareLink,
	type ActivitySummary,
} from "./strava-activities";

interface StravaChooserProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onChoose: (activity: ActivitySummary) => Promise<void>;
}

type Search =
	| { state: "idle"; hint: string }
	| { state: "searching" }
	| { state: "found"; activities: ActivitySummary[]; emptyMessage: string }
	| { state: "failed"; message: string };

const START: Search = { state: "idle", hint: "Paste the activity's Strava link, or pick the date of the walk." };

function problemMessage(error: unknown): string {
	return error instanceof StravaProblem ? error.message : "Strava couldn't be reached. Try again.";
}

function useActivitySearch() {
	const [search, setSearch] = React.useState<Search>(START);
	const latest = React.useRef(0);

	const run = React.useCallback(async (find: () => Promise<{ activities: ActivitySummary[] }>, emptyMessage: string) => {
		const attempt = ++latest.current;
		setSearch({ state: "searching" });
		try {
			const { activities } = await find();
			if (attempt === latest.current) setSearch({ state: "found", activities, emptyMessage });
		} catch (error) {
			if (attempt === latest.current) setSearch({ state: "failed", message: problemMessage(error) });
		}
	}, []);

	const searchText = (text: string) => {
		const id = activityIdFrom(text);
		if (id) return run(() => activityById(id), "");
		if (isStravaShareLink(text)) return run(() => activityByShareLink(text.trim()), "");
		latest.current++;
		setSearch(text.trim() ? { state: "idle", hint: "That doesn't look like a Strava activity link." } : START);
	};

	const searchDate = (date: string) => {
		if (!date) return setSearch(START);
		run(() => walksOnDate(date), `No walks or hikes were recorded on ${dateText(`${date}T12:00:00Z`)}.`);
	};

	return { search, searchText, searchDate, reset: () => setSearch(START) };
}

export function StravaChooser({ open, onOpenChange, onChoose }: StravaChooserProps) {
	const { search, searchText, searchDate, reset } = useActivitySearch();
	const [text, setText] = React.useState("");
	const [date, setDate] = React.useState("");

	React.useEffect(() => {
		if (open) return;
		setText("");
		setDate("");
		reset();
	}, [open]); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog size="lg" className="trip-editor-chooser">
				<Dialog.Title>Choose a Strava activity</Dialog.Title>
				<div className="trip-editor-chooser-search">
					<Input
						label="Search"
						placeholder="Paste a Strava link"
						value={text}
						onChange={(event) => {
							setText(event.target.value);
							setDate("");
							void searchText(event.target.value);
						}}
					/>
					<Input
						label="Date"
						type="date"
						value={date}
						onChange={(event) => {
							setDate(event.target.value);
							setText("");
							searchDate(event.target.value);
						}}
					/>
				</div>
				<SearchResults search={search} onChoose={onChoose} />
			</Dialog>
		</Dialog.Root>
	);
}

function SearchResults({ search, onChoose }: { search: Search; onChoose: StravaChooserProps["onChoose"] }) {
	if (search.state === "idle") return <p className="trip-editor-chooser-note">{search.hint}</p>;
	if (search.state === "searching") return <p className="trip-editor-chooser-note">Searching Strava…</p>;
	if (search.state === "failed") return <p role="alert">{search.message}</p>;
	if (search.activities.length === 0) return <p className="trip-editor-chooser-note">{search.emptyMessage}</p>;
	return (
		<ul className="trip-editor-activities" aria-label="Strava activities">
			{search.activities.map((activity) => (
				<ActivityResult key={activity.id} activity={activity} onChoose={onChoose} />
			))}
		</ul>
	);
}

function ActivityResult({ activity, onChoose }: { activity: ActivitySummary; onChoose: StravaChooserProps["onChoose"] }) {
	const [choosing, setChoosing] = React.useState(false);
	return (
		<li>
			<RouteOutline polyline={activity.polyline} />
			<div className="trip-editor-activity-details">
				<strong>{activity.name}</strong>
				<span>
					{dateText(activity.startedAt)} · {distanceText(activity.distanceMetres)} · {durationText(activity.movingSeconds)}
				</span>
			</div>
			<Button
				variant="primary"
				size="sm"
				loading={choosing}
				onClick={async () => {
					setChoosing(true);
					try {
						await onChoose(activity);
					} finally {
						setChoosing(false);
					}
				}}
			>
				Use this route
			</Button>
		</li>
	);
}
