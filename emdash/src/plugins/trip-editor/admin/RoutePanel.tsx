/**
 * A panel in the walk/trip editor's sidebar for taking the route from Strava:
 * connect the site to Strava once, then choose the activity the walk was
 * recorded as. Its GPS track becomes the route file, and empty summary fields
 * are filled in. The route can still be uploaded as a file in the form.
 */
import type { ContentEditorPanelContext } from "@emdash-cms/admin";
import { Button } from "@cloudflare/kumo";
import * as React from "react";
import { putActivityRouteIntoForm } from "./put-activity-route";
import { StravaChooser } from "./StravaChooser";
import { disconnectStrava, StravaProblem, stravaSignInUrl, stravaStatus, type StravaStatus } from "./strava-api";
import type { ActivitySummary } from "./strava-activities";
import "./trip-editor.css";

function useStravaStatus() {
	const [status, setStatus] = React.useState<StravaStatus | "loading" | "unavailable">("loading");
	const refresh = React.useCallback(() => {
		stravaStatus().then(setStatus, () => setStatus("unavailable"));
	}, []);
	React.useEffect(refresh, [refresh]);
	return { status, refresh };
}

export function RoutePanel({ collection, editorDraft }: ContentEditorPanelContext) {
	const { status, refresh } = useStravaStatus();
	const [choosing, setChoosing] = React.useState(false);
	const [message, setMessage] = React.useState<{ text: string; problem?: boolean }>();

	if (!editorDraft) return <p>This version of EmDash can't take routes from Strava.</p>;
	if (status === "loading") return <p>Checking Strava…</p>;
	if (status === "unavailable") return <p role="alert">Strava couldn't be reached. Reload the page to try again.</p>;
	if (!status.configured) return <p>Strava isn't set up for this site yet.</p>;

	const connect = async () => {
		try {
			const { url } = await stravaSignInUrl(window.location.pathname + window.location.search);
			window.location.assign(url);
		} catch (error) {
			setMessage({ text: error instanceof StravaProblem ? error.message : "Strava couldn't be reached.", problem: true });
		}
	};

	if (!status.athlete) {
		return (
			<div className="trip-editor-panel">
				<p>Connect Strava to take a walk's route from the activity you recorded.</p>
				<Button variant="secondary" onClick={connect}>
					Connect Strava
				</Button>
				{message && <p role="alert">{message.text}</p>}
			</div>
		);
	}

	const choose = async (activity: ActivitySummary) => {
		try {
			const result = await putActivityRouteIntoForm(editorDraft, collection, activity);
			setChoosing(false);
			setMessage(
				result.ok
					? { text: `The route from “${activity.name}” is in the form. Save to keep it.` }
					: { text: "The route couldn't be added to the form. Try again.", problem: true },
			);
		} catch (error) {
			setChoosing(false);
			setMessage({ text: error instanceof StravaProblem ? error.message : "The route couldn't be added. Try again.", problem: true });
		}
	};

	return (
		<div className="trip-editor-panel">
			<p>Connected to Strava{status.athlete.trim() ? ` as ${status.athlete}` : ""}.</p>
			{editorDraft.get().readOnly ? (
				<p>The walk can't be edited right now.</p>
			) : (
				<Button variant="secondary" onClick={() => setChoosing(true)}>
					Choose from Strava
				</Button>
			)}
			{message && <p role={message.problem ? "alert" : "status"}>{message.text}</p>}
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
