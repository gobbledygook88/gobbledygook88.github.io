/**
 * A panel in the walk/trip editor's sidebar for adding the route: upload a GPX
 * file, or, when the site has a Strava app set up, choose the activity the walk
 * was recorded as. Either way the track becomes the route file and empty
 * summary fields are filled in.
 */
import type { ContentEditorPanelContext } from "@emdash-cms/admin";
import { Button } from "@cloudflare/kumo";
import * as React from "react";
import { GpxProblem, routeFromGpx } from "./gpx";
import { putActivityRouteIntoForm, putRouteIntoForm, type EditorDraft, type RouteForForm } from "./route-into-form";
import { StravaChooser } from "./StravaChooser";
import { disconnectStrava, StravaProblem, stravaSignInUrl, stravaStatus, type StravaStatus } from "./strava-api";
import type { ActivitySummary } from "./strava-activities";
import "./trip-editor.css";

interface Message {
	text: string;
	problem?: boolean;
}

const added = (name: string): Message => ({ text: `The route from “${name}” is in the form. Save to keep it.` });
const notAdded: Message = { text: "The route couldn't be added to the form. Try again.", problem: true };

export function RoutePanel({ collection, editorDraft }: ContentEditorPanelContext) {
	const [message, setMessage] = React.useState<Message>();

	if (!editorDraft) return <p>This version of EmDash can't add routes here.</p>;
	if (editorDraft.get().readOnly) return <p>The walk can't be edited right now.</p>;

	const putIntoForm = async (route: () => Promise<RouteForForm>) => {
		setMessage(undefined);
		try {
			const chosen = await route();
			const result = await putRouteIntoForm(editorDraft, collection, chosen);
			setMessage(result.ok ? added(chosen.name) : notAdded);
		} catch (error) {
			setMessage(error instanceof GpxProblem ? { text: error.message, problem: true } : notAdded);
		}
	};

	return (
		<div className="trip-editor-panel">
			<GpxUpload onFile={(file) => putIntoForm(async () => routeFromGpx(await file.text(), file.name))} />
			<StravaRoute editorDraft={editorDraft} collection={collection} onMessage={setMessage} />
			{message && <p role={message.problem ? "alert" : "status"}>{message.text}</p>}
		</div>
	);
}

function GpxUpload({ onFile }: { onFile: (file: File) => Promise<void> }) {
	const [reading, setReading] = React.useState(false);
	return (
		<label className={`trip-editor-file${reading ? " is-busy" : ""}`}>
			<input
				type="file"
				accept=".gpx,application/gpx+xml"
				disabled={reading}
				onChange={async (event) => {
					const file = event.target.files?.[0];
					event.target.value = "";
					if (!file) return;
					setReading(true);
					await onFile(file);
					setReading(false);
				}}
			/>
			<span>{reading ? "Adding the route…" : "Upload a GPX file"}</span>
		</label>
	);
}

function useStravaStatus() {
	const [status, setStatus] = React.useState<StravaStatus>();
	const refresh = React.useCallback(() => {
		stravaStatus().then(setStatus, () => setStatus(undefined));
	}, []);
	React.useEffect(refresh, [refresh]);
	return { status, refresh };
}

/** Choosing a Strava activity: shown only when the site has a Strava app set up. */
function StravaRoute({
	editorDraft,
	collection,
	onMessage,
}: {
	editorDraft: EditorDraft;
	collection: string;
	onMessage: (message: Message) => void;
}) {
	const { status, refresh } = useStravaStatus();
	const [choosing, setChoosing] = React.useState(false);
	if (!status?.configured) return null;

	const problem = (error: unknown, fallback: string): Message => ({
		text: error instanceof StravaProblem ? error.message : fallback,
		problem: true,
	});

	if (!status.athlete) {
		const connect = async () => {
			try {
				const { url } = await stravaSignInUrl(window.location.pathname + window.location.search);
				window.location.assign(url);
			} catch (error) {
				onMessage(problem(error, "Strava couldn't be reached."));
			}
		};
		return (
			<Button variant="secondary" onClick={connect}>
				Connect Strava
			</Button>
		);
	}

	const choose = async (activity: ActivitySummary) => {
		try {
			const result = await putActivityRouteIntoForm(editorDraft, collection, activity);
			onMessage(result.ok ? added(activity.name) : notAdded);
		} catch (error) {
			onMessage(problem(error, "The route couldn't be added. Try again."));
		}
		setChoosing(false);
	};

	return (
		<div className="trip-editor-strava">
			<Button variant="secondary" onClick={() => setChoosing(true)}>
				Choose from Strava
			</Button>
			<p>Connected to Strava{status.athlete.trim() ? ` as ${status.athlete}` : ""}.</p>
			<Button
				variant="ghost"
				size="xs"
				onClick={async () => {
					await disconnectStrava();
					refresh();
				}}
			>
				Disconnect Strava
			</Button>
			<StravaChooser open={choosing} onOpenChange={setChoosing} onChoose={choose} />
		</div>
	);
}
