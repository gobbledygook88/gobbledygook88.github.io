import { definePlugin, pluginResponse, type RouteContext } from "emdash";
import { TRIP_EDITOR_ID, TRIP_EDITOR_VERSION, type TripEditorOptions } from "./identity";
import {
	activityIdFromShareLink,
	connectedAthlete,
	disconnect,
	findActivity,
	finishSignIn,
	isConfigured,
	routeOf,
	startSignIn,
	StravaError,
	walksOnDate,
} from "./strava/strava";

/**
 * Runtime half of the trip editor: the routes its admin panels call, under
 * /_emdash/api/plugins/trip-editor/. The React admin module adds the panels.
 */
const EDITOR_PERMISSION = "content:edit_own";
const ACTIVITY_ID = /^\d{1,20}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function queryValue(ctx: RouteContext, name: string): string {
	const value = (ctx.input as Record<string, unknown> | undefined)?.[name];
	return typeof value === "string" ? value : "";
}

/** Expected Strava failures become `{ error }` results the panel explains; anything else is a server error. */
async function stravaResult<T>(work: () => Promise<T>): Promise<T | { error: { code: string; message: string } }> {
	try {
		return await work();
	} catch (error) {
		if (error instanceof StravaError) return { error: { code: error.code, message: error.message } };
		throw error;
	}
}

/** Only send the browser back into the admin, never to another site. */
function adminPath(returnTo: string): string {
	return returnTo.startsWith("/_emdash/admin") && !returnTo.startsWith("//") ? returnTo : "/_emdash/admin";
}

export function createPlugin(options: TripEditorOptions) {
	return definePlugin({
		id: TRIP_EDITOR_ID,
		version: TRIP_EDITOR_VERSION,
		admin: { entry: options.adminEntry },
		routes: {
			"strava/status": {
				methods: ["GET"],
				permission: EDITOR_PERMISSION,
				handler: async (ctx) => ({ configured: isConfigured(), athlete: (await connectedAthlete(ctx)) ?? null }),
			},
			"strava/connect": {
				methods: ["POST"],
				permission: EDITOR_PERMISSION,
				handler: (ctx) =>
					stravaResult(async () => ({
						url: await startSignIn(ctx, ctx.request, adminPath(queryValue(ctx, "returnTo"))),
					})),
			},
			"strava/disconnect": {
				methods: ["POST"],
				permission: EDITOR_PERMISSION,
				handler: async (ctx) => {
					await disconnect(ctx);
					return { disconnected: true };
				},
			},
			// Strava sends the browser here after approval, so it can't carry the admin's request header
			"strava/callback": {
				methods: ["GET"],
				public: true,
				response: "raw",
				handler: async (ctx) => {
					try {
						const returnTo = await finishSignIn(ctx, new URL(ctx.request.url).searchParams);
						return pluginResponse({ status: 302, headers: { Location: adminPath(returnTo) } });
					} catch (error) {
						const message = error instanceof StravaError ? error.message : "Connecting Strava failed";
						return pluginResponse({
							status: 400,
							headers: { "Content-Type": "text/plain; charset=utf-8" },
							body: { kind: "text", value: `${message}. Go back to the editor and try Connect Strava again.` },
						});
					}
				},
			},
			"strava/activity": {
				methods: ["GET"],
				permission: EDITOR_PERMISSION,
				handler: (ctx) =>
					stravaResult(async () => {
						const shareLink = queryValue(ctx, "shareLink");
						const id = shareLink ? await activityIdFromShareLink(shareLink) : queryValue(ctx, "id");
						if (!ACTIVITY_ID.test(id)) throw new StravaError("NOT_FOUND", "That isn't a Strava activity link");
						return { activities: [await findActivity(ctx, id)] };
					}),
			},
			"strava/walks-on-date": {
				methods: ["GET"],
				permission: EDITOR_PERMISSION,
				handler: (ctx) =>
					stravaResult(async () => {
						const date = queryValue(ctx, "date");
						if (!DATE.test(date)) throw new StravaError("NOT_FOUND", "Choose a date");
						return { activities: await walksOnDate(ctx, date) };
					}),
			},
			"strava/route": {
				methods: ["GET"],
				permission: EDITOR_PERMISSION,
				handler: (ctx) =>
					stravaResult(async () => {
						const id = queryValue(ctx, "id");
						if (!ACTIVITY_ID.test(id)) throw new StravaError("NOT_FOUND", "That isn't a Strava activity");
						return { route: await routeOf(ctx, id, queryValue(ctx, "name")) };
					}),
			},
		},
	});
}
