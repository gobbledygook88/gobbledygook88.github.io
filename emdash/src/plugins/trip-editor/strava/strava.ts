/**
 * Strava for the trip editor: connecting the site to the owner's Strava
 * account, finding their activities, and turning an activity's GPS track into
 * the GeoJSON route file trips use.
 *
 * Runs in the Worker. The app's credentials are Worker secrets/vars:
 * STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET. STRAVA_ORIGIN replaces
 * https://www.strava.com in tests (e2e/support/fake-strava.mjs).
 */
import type { PluginContext } from "emdash";

const CONNECTION_KEY = "strava:connection";
const SIGN_IN_PREFIX = "strava:sign-in:";
const SIGN_IN_LIFETIME_MS = 15 * 60 * 1000;
/** Refresh a little before Strava's access token expires */
const TOKEN_MARGIN_SECONDS = 120;
const SCOPE = "read,activity:read_all";
/** The activity types the date search lists; a pasted link can be any activity */
const WALKING_TYPES = new Set(["Walk", "Hike"]);

interface Connection {
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
	athleteName: string;
}

interface SignIn {
	returnTo: string;
	expiresAt: number;
}

export interface StravaActivity {
	id: number;
	name: string;
	sport_type: string;
	/** UTC */
	start_date: string;
	start_date_local: string;
	distance: number;
	moving_time: number;
	map?: { summary_polyline?: string | null };
}

/** What the admin shows for an activity */
export interface ActivitySummary {
	id: number;
	name: string;
	sportType: string;
	/** Local date and time it started, e.g. "2022-08-14T10:00:00Z" (Strava's "Z" is not UTC here) */
	startedAt: string;
	distanceMetres: number;
	movingSeconds: number;
	polyline: string | null;
}

export class StravaError extends Error {
	constructor(
		readonly code: "NOT_CONFIGURED" | "NOT_CONNECTED" | "NOT_FOUND" | "STRAVA_UNAVAILABLE",
		message: string,
	) {
		super(message);
	}
}

function settings() {
	return {
		origin: process.env.STRAVA_ORIGIN || "https://www.strava.com",
		clientId: process.env.STRAVA_CLIENT_ID,
		clientSecret: process.env.STRAVA_CLIENT_SECRET,
	};
}

export function isConfigured(): boolean {
	const { clientId, clientSecret } = settings();
	return Boolean(clientId && clientSecret);
}

export async function connectedAthlete(ctx: PluginContext): Promise<string | undefined> {
	const connection = await ctx.kv.get<Connection>(CONNECTION_KEY);
	return connection?.athleteName;
}

export function callbackUrl(request: Request): string {
	return `${new URL(request.url).origin}/_emdash/api/plugins/trip-editor/strava/callback`;
}

/** Where to send the browser to approve the site in Strava. */
export async function startSignIn(ctx: PluginContext, request: Request, returnTo: string): Promise<string> {
	const { origin, clientId } = settings();
	if (!isConfigured() || !clientId) throw new StravaError("NOT_CONFIGURED", "Strava isn't set up for this site");

	const state = crypto.randomUUID();
	await ctx.kv.set(`${SIGN_IN_PREFIX}${state}`, { returnTo, expiresAt: Date.now() + SIGN_IN_LIFETIME_MS } satisfies SignIn);

	const authorize = new URL("/oauth/authorize", origin);
	authorize.searchParams.set("client_id", clientId);
	authorize.searchParams.set("redirect_uri", callbackUrl(request));
	authorize.searchParams.set("response_type", "code");
	authorize.searchParams.set("approval_prompt", "auto");
	authorize.searchParams.set("scope", SCOPE);
	authorize.searchParams.set("state", state);
	return authorize.href;
}

/**
 * Strava sends the browser back here after approval. Returns the admin page
 * to go back to; throws when the sign-in isn't one this site started.
 */
export async function finishSignIn(ctx: PluginContext, query: URLSearchParams): Promise<string> {
	const state = query.get("state") ?? "";
	const key = `${SIGN_IN_PREFIX}${state}`;
	const signIn = state ? await ctx.kv.get<SignIn>(key) : null;
	if (!signIn) throw new StravaError("NOT_CONNECTED", "Unknown Strava sign-in");
	await ctx.kv.delete(key);
	if (signIn.expiresAt < Date.now()) throw new StravaError("NOT_CONNECTED", "The Strava sign-in expired");

	const code = query.get("code");
	const grantedScopes = (query.get("scope") ?? "").split(",");
	if (!code || !grantedScopes.includes("activity:read_all")) {
		throw new StravaError("NOT_CONNECTED", "Strava didn't allow reading activities");
	}

	const tokens = await requestTokens({ grant_type: "authorization_code", code });
	const athlete = tokens.athlete ? [tokens.athlete.firstname, tokens.athlete.lastname].filter(Boolean).join(" ") : "";
	await saveConnection(ctx, tokens, athlete);
	return signIn.returnTo;
}

export async function disconnect(ctx: PluginContext) {
	await ctx.kv.delete(CONNECTION_KEY);
}

interface TokenResponse {
	access_token: string;
	refresh_token: string;
	expires_at: number;
	athlete?: { firstname?: string; lastname?: string };
}

async function requestTokens(grant: Record<string, string>): Promise<TokenResponse> {
	const { origin, clientId, clientSecret } = settings();
	const response = await fetch(new URL("/oauth/token", origin), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, ...grant }),
	});
	if (!response.ok) throw new StravaError("STRAVA_UNAVAILABLE", `Strava refused the sign-in (${response.status})`);
	return response.json();
}

async function saveConnection(ctx: PluginContext, tokens: TokenResponse, athleteName: string) {
	await ctx.kv.set(CONNECTION_KEY, {
		accessToken: tokens.access_token,
		refreshToken: tokens.refresh_token,
		expiresAt: tokens.expires_at,
		athleteName,
	} satisfies Connection);
}

/** A current access token, refreshing it (Strava's last six hours) when needed. */
async function accessToken(ctx: PluginContext): Promise<string> {
	const connection = await ctx.kv.get<Connection>(CONNECTION_KEY);
	if (!connection) throw new StravaError("NOT_CONNECTED", "Connect Strava first");
	if (connection.expiresAt - TOKEN_MARGIN_SECONDS > Date.now() / 1000) return connection.accessToken;

	// Strava may issue a new refresh token: always keep the latest
	const tokens = await requestTokens({ grant_type: "refresh_token", refresh_token: connection.refreshToken });
	await saveConnection(ctx, tokens, connection.athleteName);
	return tokens.access_token;
}

async function stravaGet<T>(ctx: PluginContext, path: string, query: Record<string, string> = {}): Promise<T> {
	const url = new URL(`/api/v3${path}`, settings().origin);
	for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);
	const response = await fetch(url, { headers: { Authorization: `Bearer ${await accessToken(ctx)}` } });
	if (response.status === 404) throw new StravaError("NOT_FOUND", "Strava has no activity with that link");
	if (response.status === 401) throw new StravaError("NOT_CONNECTED", "Strava needs connecting again");
	if (!response.ok) throw new StravaError("STRAVA_UNAVAILABLE", `Strava didn't answer (${response.status})`);
	return response.json() as Promise<T>;
}

function summarise(activity: StravaActivity): ActivitySummary {
	return {
		id: activity.id,
		name: activity.name,
		sportType: activity.sport_type,
		startedAt: activity.start_date_local,
		distanceMetres: activity.distance,
		movingSeconds: activity.moving_time,
		polyline: activity.map?.summary_polyline ?? null,
	};
}

const SHARE_LINK = /^https:\/\/strava\.app\.link\/\w+$/;
const ACTIVITY_IN_TEXT = /strava\.com\/activities\/(\d+)/;

/**
 * The activity ID behind a short share link from Strava's app
 * (strava.app.link/…), which redirects to the activity's page.
 */
export async function activityIdFromShareLink(link: string): Promise<string> {
	if (!SHARE_LINK.test(link)) throw new StravaError("NOT_FOUND", "That isn't a Strava activity link");
	const response = await fetch(link, { redirect: "follow" });
	const id = response.url.match(ACTIVITY_IN_TEXT)?.[1] ?? (await response.text()).match(ACTIVITY_IN_TEXT)?.[1];
	if (!id) throw new StravaError("NOT_FOUND", "That link doesn't lead to a Strava activity");
	return id;
}

export async function findActivity(ctx: PluginContext, id: string): Promise<ActivitySummary> {
	return summarise(await stravaGet<StravaActivity>(ctx, `/activities/${encodeURIComponent(id)}`));
}

/** One page of the athlete's activities, newest first unless `after` is given. */
export function listActivities(ctx: PluginContext, query: Record<string, string>): Promise<StravaActivity[]> {
	return stravaGet<StravaActivity[]>(ctx, "/athlete/activities", query);
}

const HOUR_SECONDS = 3600;

/** The walks and hikes that started on a local date ("2022-08-14"), in any timezone. */
export async function walksOnDate(ctx: PluginContext, date: string): Promise<ActivitySummary[]> {
	const midnightUtc = Date.parse(`${date}T00:00:00Z`) / 1000;
	// Local midnight is between UTC-12 and UTC+14; filter on the local date below
	const activities = await listActivities(ctx, {
		after: String(midnightUtc - 14 * HOUR_SECONDS),
		before: String(midnightUtc + 36 * HOUR_SECONDS),
		per_page: "50",
	});
	return activities
		.filter((activity) => activity.start_date_local.startsWith(date) && WALKING_TYPES.has(activity.sport_type))
		.map(summarise);
}

interface Streams {
	latlng?: { data: [number, number][] };
	altitude?: { data: number[] };
}

/** The activity's GPS track as a GeoJSON route, as trips' route files are. */
export async function routeOf(ctx: PluginContext, id: string, name: string) {
	const streams = await stravaGet<Streams>(ctx, `/activities/${encodeURIComponent(id)}/streams`, {
		keys: "latlng,altitude",
		key_by_type: "true",
	});
	const points = streams.latlng?.data ?? [];
	if (points.length < 2) throw new StravaError("NOT_FOUND", "That activity has no GPS track");
	const altitudes = streams.altitude?.data;
	return {
		type: "FeatureCollection",
		features: [
			{
				type: "Feature",
				properties: { name, source: `https://www.strava.com/activities/${id}` },
				geometry: {
					type: "LineString",
					coordinates: points.map(([latitude, longitude], index) =>
						altitudes?.[index] === undefined ? [longitude, latitude] : [longitude, latitude, altitudes[index]],
					),
				},
			},
		],
	};
}
