/** The admin's calls to the trip editor's Strava routes (see ../plugin.ts). */
import { apiFetch, parseApiResponse } from "emdash/plugin-utils";
import type { ActivitySummary } from "./strava-activities";

const BASE = "/_emdash/api/plugins/trip-editor/strava";

export interface StravaStatus {
	configured: boolean;
	athlete: string | null;
}

/** A failure Strava or the routes explained, worded for the person editing */
export class StravaProblem extends Error {
	constructor(
		readonly code: string,
		message: string,
	) {
		super(message);
	}
}

type Result<T> = T | { error: { code: string; message: string } };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await apiFetch(`${BASE}/${path}`, init);
	const result = await parseApiResponse<Result<T>>(response, "Strava couldn't be reached. Try again.");
	if (typeof result === "object" && result !== null && "error" in result) {
		throw new StravaProblem(result.error.code, result.error.message);
	}
	return result;
}

const post = (body: unknown): RequestInit => ({
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify(body),
});

export const stravaStatus = () => call<StravaStatus>("status");

/** Where to send the browser to approve the site; Strava then returns it to `returnTo`. */
export const stravaSignInUrl = (returnTo: string) => call<{ url: string }>("connect", post({ returnTo }));

export const disconnectStrava = () => call<{ disconnected: true }>("disconnect", post({}));

export const activityById = (id: string) =>
	call<{ activities: ActivitySummary[] }>(`activity?id=${encodeURIComponent(id)}`);

export const activityByShareLink = (shareLink: string) =>
	call<{ activities: ActivitySummary[] }>(`activity?shareLink=${encodeURIComponent(shareLink)}`);

export const walksOnDate = (date: string) =>
	call<{ activities: ActivitySummary[] }>(`walks-on-date?date=${encodeURIComponent(date)}`);

export const activityRoute = (activity: ActivitySummary) =>
	call<{ route: unknown }>(`route?id=${activity.id}&name=${encodeURIComponent(activity.name)}`);
