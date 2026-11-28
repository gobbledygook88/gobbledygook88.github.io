/**
 * A copy of the athlete's Strava activity list (name, date, type, distance,
 * time and route outline), so the admin can search titles over years of
 * activities: Strava's API can only list them newest first.
 *
 * Each sync step asks Strava for one page, to stay within the Workers Free
 * plan's 10 ms of CPU per request: first every activity before the first
 * sync began, then, once that's complete, the ones after the newest copied.
 * Each pass pages through a fixed time window, so it doesn't depend on the
 * order Strava lists activities in.
 */
import type { PluginContext, StorageCollection } from "emdash";
import { listActivities, type ActivitySummary, type StravaActivity } from "./strava";

const SYNC_KEY = "strava:index";
const PAGE_SIZE = 100;
/** Storage queries return at most 100 items per page */
const QUERY_PAGE = 100;

/** The index's storage collections, declared in plugin.ts */
export const ACTIVITY_STORAGE = {
	activities: { indexes: ["startedEpoch"] },
	// Outlines are kept apart so reading the whole list stays small
	outlines: { indexes: [] },
};

interface IndexedActivity extends Omit<ActivitySummary, "polyline"> {
	/** When it started, in seconds since 1970 (UTC), for Strava's before/after */
	startedEpoch: number;
}

/** A pass through Strava's list: pages of activities after/before fixed times */
interface Pass {
	after?: number;
	before?: number;
	page: number;
	newestSeen: number;
}

interface SyncState {
	historyComplete: boolean;
	newestEpoch: number;
	/** The pass in progress, if any */
	pass: Pass | null;
}

const nowEpoch = () => Math.floor(Date.now() / 1000);

function collections(ctx: PluginContext) {
	return {
		activities: ctx.storage.activities as StorageCollection<IndexedActivity>,
		outlines: ctx.storage.outlines as StorageCollection<{ polyline: string }>,
	};
}

const epochOf = (activity: StravaActivity) => Math.floor(Date.parse(activity.start_date) / 1000);

async function store(ctx: PluginContext, page: StravaActivity[]) {
	if (page.length === 0) return;
	const { activities, outlines } = collections(ctx);
	await activities.putMany(
		page.map((activity) => ({
			id: String(activity.id),
			data: {
				id: activity.id,
				name: activity.name,
				sportType: activity.sport_type,
				startedAt: activity.start_date_local,
				startedEpoch: epochOf(activity),
				distanceMetres: activity.distance,
				movingSeconds: activity.moving_time,
			},
		})),
	);
	const withOutlines = page.filter((activity) => activity.map?.summary_polyline);
	if (withOutlines.length) {
		await outlines.putMany(
			withOutlines.map((activity) => ({ id: String(activity.id), data: { polyline: activity.map!.summary_polyline! } })),
		);
	}
}

/** Copies one more page from Strava. `done` once the copy is up to date. */
export async function syncStep(ctx: PluginContext): Promise<{ done: boolean; count: number }> {
	const state = await ctx.kv.get<SyncState>(SYNC_KEY);
	// History: everything before the first sync. Afterwards: everything after the newest copied.
	const pass: Pass =
		state?.pass ??
		(state?.historyComplete
			? { after: state.newestEpoch, page: 1, newestSeen: state.newestEpoch }
			: { before: nowEpoch(), page: 1, newestSeen: 0 });

	const page = await listActivities(ctx, {
		per_page: String(PAGE_SIZE),
		page: String(pass.page),
		...(pass.after === undefined ? {} : { after: String(pass.after) }),
		...(pass.before === undefined ? {} : { before: String(pass.before) }),
	});
	await store(ctx, page);
	const newestSeen = Math.max(pass.newestSeen, ...page.map(epochOf));

	const passComplete = page.length < PAGE_SIZE;
	const wasForwardPass = pass.after !== undefined;
	await ctx.kv.set(SYNC_KEY, {
		historyComplete: Boolean(state?.historyComplete) || passComplete,
		newestEpoch: passComplete ? Math.max(state?.newestEpoch ?? 0, newestSeen) : (state?.newestEpoch ?? 0),
		pass: passComplete ? null : { ...pass, page: pass.page + 1, newestSeen },
	} satisfies SyncState);

	// Up to date once a pass for activities after the newest copied finds no more
	return { done: passComplete && wasForwardPass, count: await collections(ctx).activities.count() };
}

/** Every copied activity, newest first, without outlines. */
export async function allActivities(ctx: PluginContext): Promise<ActivitySummary[]> {
	const { activities } = collections(ctx);
	const found: ActivitySummary[] = [];
	let cursor: string | undefined;
	do {
		const page = await activities.query({ orderBy: { startedEpoch: "desc" }, limit: QUERY_PAGE, cursor });
		for (const { data } of page.items) {
			const { startedEpoch: _startedEpoch, ...summary } = data;
			found.push({ ...summary, polyline: null });
		}
		cursor = page.hasMore ? page.cursor : undefined;
	} while (cursor);
	return found;
}

/** Route outlines for the activities the admin is showing. */
export async function outlinesOf(ctx: PluginContext, ids: string[]): Promise<Record<string, string>> {
	const found = await collections(ctx).outlines.getMany(ids);
	return Object.fromEntries([...found].map(([id, { polyline }]) => [id, polyline]));
}

/** Forgets the copy, as when Strava is disconnected. */
export async function clearIndex(ctx: PluginContext) {
	const { activities, outlines } = collections(ctx);
	for (const collection of [activities, outlines] as StorageCollection<unknown>[]) {
		let page;
		do {
			page = await collection.query({ limit: QUERY_PAGE });
			if (page.items.length) await collection.deleteMany(page.items.map((item) => item.id));
		} while (page.hasMore);
	}
	await ctx.kv.delete(SYNC_KEY);
}
