/**
 * Finding the Strava activity a walk was recorded as: search its title (with a
 * year or month to narrow it), paste its link, or pick its date.
 *
 * Title and date searches use the site's copy of the activity list, brought up
 * to date each time the chooser opens; a pasted link asks Strava directly.
 */
import { Button, Dialog, Input } from "@cloudflare/kumo";
import * as React from "react";
import { RouteOutline } from "./RouteOutline";
import {
	activityById,
	activityByShareLink,
	activityOutlines,
	copiedActivities,
	StravaProblem,
	syncActivities,
	walksOnDate,
} from "./strava-api";
import {
	activityIdFrom,
	dateText,
	distanceText,
	durationText,
	isStravaShareLink,
	isWalkOrHike,
	matchesSearch,
	type ActivitySummary,
} from "./strava-activities";

interface StravaChooserProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onChoose: (activity: ActivitySummary) => Promise<void>;
}

const MOST_RESULTS = 20;
/** Enough sync steps for years of activities, but not forever if Strava misbehaves */
const MOST_SYNC_STEPS = 60;

type ActivityList =
	| { state: "updating"; count: number }
	| { state: "ready"; activities: ActivitySummary[] }
	| { state: "failed"; message: string };

type Lookup =
	| { state: "none" }
	| { state: "searching" }
	| { state: "found"; activities: ActivitySummary[] }
	| { state: "failed"; message: string };

function problemMessage(error: unknown): string {
	return error instanceof StravaProblem ? error.message : "Strava couldn't be reached. Try again.";
}

/** The copied activity list, brought up to date with Strava while the chooser is open. */
function useActivityList(open: boolean): ActivityList {
	const [list, setList] = React.useState<ActivityList>({ state: "updating", count: 0 });
	React.useEffect(() => {
		if (!open) return;
		let cancelled = false;
		setList({ state: "updating", count: 0 });
		(async () => {
			try {
				for (let step = 0; step < MOST_SYNC_STEPS; step++) {
					const { done, count } = await syncActivities();
					if (cancelled) return;
					setList({ state: "updating", count });
					if (done) break;
				}
				const { activities } = await copiedActivities();
				if (!cancelled) setList({ state: "ready", activities });
			} catch (error) {
				if (!cancelled) setList({ state: "failed", message: problemMessage(error) });
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [open]);
	return list;
}

/** A single activity from a pasted link, which Strava is asked for directly. */
function useLinkLookup(text: string): Lookup {
	const [lookup, setLookup] = React.useState<Lookup>({ state: "none" });
	React.useEffect(() => {
		const id = activityIdFrom(text);
		const shareLink = !id && isStravaShareLink(text) ? text.trim() : undefined;
		if (!id && !shareLink) return setLookup({ state: "none" });
		let cancelled = false;
		setLookup({ state: "searching" });
		(id ? activityById(id) : activityByShareLink(shareLink!)).then(
			({ activities }) => !cancelled && setLookup({ state: "found", activities }),
			(error) => !cancelled && setLookup({ state: "failed", message: problemMessage(error) }),
		);
		return () => {
			cancelled = true;
		};
	}, [text]);
	return lookup;
}

/** Walks on a date, from Strava, for while the copied list is still being fetched. */
function useDateLookup(date: string, needed: boolean): Lookup {
	const [lookup, setLookup] = React.useState<Lookup>({ state: "none" });
	React.useEffect(() => {
		if (!date || !needed) return setLookup({ state: "none" });
		let cancelled = false;
		setLookup({ state: "searching" });
		walksOnDate(date).then(
			({ activities }) => !cancelled && setLookup({ state: "found", activities }),
			(error) => !cancelled && setLookup({ state: "failed", message: problemMessage(error) }),
		);
		return () => {
			cancelled = true;
		};
	}, [date, needed]);
	return lookup;
}

/** Route outlines for the activities being shown, fetched once each. */
function useOutlines(activities: ActivitySummary[]): Record<string, string> {
	const [outlines, setOutlines] = React.useState<Record<string, string>>({});
	const missing = activities.filter((activity) => !activity.polyline && !(activity.id in outlines)).map((activity) => activity.id);
	const missingKey = missing.join(",");
	React.useEffect(() => {
		if (!missingKey) return;
		activityOutlines(missing).then(
			({ outlines: found }) => setOutlines((current) => ({ ...current, ...found })),
			() => {},
		);
	}, [missingKey]); // eslint-disable-line react-hooks/exhaustive-deps
	return outlines;
}

export function StravaChooser({ open, onOpenChange, onChoose }: StravaChooserProps) {
	const [text, setText] = React.useState("");
	const [date, setDate] = React.useState("");
	const [includeOthers, setIncludeOthers] = React.useState(false);
	const list = useActivityList(open);
	const linkLookup = useLinkLookup(text);
	const dateLookup = useDateLookup(date, list.state !== "ready");

	React.useEffect(() => {
		if (open) return;
		setText("");
		setDate("");
	}, [open]);

	const wanted = (activity: ActivitySummary) => includeOthers || isWalkOrHike(activity);
	const results = ((): Lookup | { state: "note"; message: string } => {
		if (linkLookup.state !== "none") return linkLookup;
		if (date) {
			if (list.state !== "ready") return dateLookup;
			return { state: "found", activities: list.activities.filter((a) => a.startedAt.startsWith(date) && wanted(a)) };
		}
		if (!text.trim()) return { state: "note", message: "Search the title, paste the activity's Strava link, or pick the date of the walk." };
		if (list.state === "failed") return { state: "failed", message: `Title search isn't available: ${list.message}` };
		if (list.state === "updating") return { state: "note", message: "Fetching your Strava activities to search…" };
		return { state: "found", activities: list.activities.filter((a) => matchesSearch(a, text) && wanted(a)) };
	})();

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog size="lg" className="trip-editor-chooser">
				<Dialog.Title>Choose a Strava activity</Dialog.Title>
				<div className="trip-editor-chooser-search">
					<Input
						label="Search"
						placeholder="Words from the title, or a Strava link"
						value={text}
						onChange={(event) => {
							setText(event.target.value);
							setDate("");
						}}
					/>
					<Input
						label="Date"
						type="date"
						value={date}
						onChange={(event) => {
							setDate(event.target.value);
							setText("");
						}}
					/>
				</div>
				<label className="trip-editor-checkbox">
					<input type="checkbox" checked={includeOthers} onChange={(event) => setIncludeOthers(event.target.checked)} />
					Include runs, rides and other activities
				</label>
				<ActivityListStatus list={list} />
				<SearchResults results={results} date={date} onChoose={onChoose} />
			</Dialog>
		</Dialog.Root>
	);
}

function ActivityListStatus({ list }: { list: ActivityList }) {
	if (list.state !== "updating") return null;
	const fetched = list.count ? ` ${list.count} so far.` : "";
	return <p className="trip-editor-chooser-note">Updating your Strava activities from Strava…{fetched}</p>;
}

function SearchResults({
	results,
	date,
	onChoose,
}: {
	results: Lookup | { state: "note"; message: string };
	date: string;
	onChoose: StravaChooserProps["onChoose"];
}) {
	if (results.state === "none") return null;
	if (results.state === "note") return <p className="trip-editor-chooser-note">{results.message}</p>;
	if (results.state === "searching") return <p className="trip-editor-chooser-note">Searching Strava…</p>;
	if (results.state === "failed") return <p role="alert">{results.message}</p>;
	if (results.activities.length === 0) {
		const where = date ? `on ${dateText(`${date}T12:00:00Z`)}` : "that match";
		return <p className="trip-editor-chooser-note">No activities {where}.</p>;
	}
	return <ActivityResults activities={results.activities} onChoose={onChoose} />;
}

function ActivityResults({ activities, onChoose }: { activities: ActivitySummary[]; onChoose: StravaChooserProps["onChoose"] }) {
	const shown = activities.slice(0, MOST_RESULTS);
	const outlines = useOutlines(shown);
	return (
		<>
			<ul className="trip-editor-activities" aria-label="Strava activities">
				{shown.map((activity) => (
					<ActivityResult
						key={activity.id}
						activity={{ ...activity, polyline: activity.polyline ?? outlines[activity.id] ?? null }}
						onChoose={onChoose}
					/>
				))}
			</ul>
			{activities.length > shown.length && (
				<p className="trip-editor-chooser-note">
					Showing the newest {shown.length} of {activities.length}. Add words, a year or a month to narrow it.
				</p>
			)}
		</>
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
