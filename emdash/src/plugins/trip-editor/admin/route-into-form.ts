/**
 * Puts a route into the open walk or trip: it becomes the route file (saved in
 * the entry's media folder, like photos), and the distance, duration and route
 * link are filled in where they're still empty. Nothing is saved: the editor
 * saves the form as usual.
 *
 * The route comes from a Strava activity or an uploaded GPX file.
 */
import { createMediaFolder, fetchCollection, fetchMediaFolders, uploadMedia, type MediaItem } from "@emdash-cms/admin";
import { activityRoute } from "./strava-api";
import { activityUrl, distanceText, durationText, routeFileName, type ActivitySummary } from "./strava-activities";

/** Media folders are named per entry: walk-<slug>, travel-<slug> */
const FOLDER_PREFIX: Record<string, string> = { walks: "walk", travel: "travel" };

export interface EditorDraft {
	get(): { revision: string; fields: Record<string, unknown> };
	patch(
		operations: { op: "set"; field: string; value: unknown }[],
		options: { expectedRevision: string },
	): { ok: true } | { ok: false; code: string; message: string };
}

export interface RouteForForm {
	/** Shown to the editor and used for the file name */
	name: string;
	geoJson: unknown;
	distanceMetres?: number;
	movingSeconds?: number;
	link?: { url: string; text: string };
}

async function folderFor(collection: string, slug: unknown): Promise<string | undefined> {
	const prefix = FOLDER_PREFIX[collection];
	if (!prefix || typeof slug !== "string" || !slug) return undefined;
	const name = `${prefix}-${slug}`;
	const { items } = await fetchMediaFolders({ search: name });
	return (items.find((folder) => folder.name === name) ?? (await createMediaFolder(name))).id;
}

/** The route file field's ID, which lets the upload accept GeoJSON */
async function routeFieldId(collection: string): Promise<string | undefined> {
	const { fields } = await fetchCollection(collection, true);
	return fields.find((field) => field.slug === "map_data")?.id;
}

/** The value EmDash's own file field stores for a media-library file */
function fileValue(item: MediaItem) {
	return {
		id: item.id,
		provider: "local",
		filename: item.filename,
		mimeType: item.mimeType,
		size: item.size,
		meta: { ...item.meta, storageKey: item.storageKey },
	};
}

const isEmpty = (value: unknown) => value === null || value === undefined || value === "";

export async function putRouteIntoForm(editorDraft: EditorDraft, collection: string, route: RouteForForm) {
	const file = new File([JSON.stringify(route.geoJson)], routeFileName(route.name), { type: "application/geo+json" });
	const { fields } = editorDraft.get();
	const [folderId, fieldId] = await Promise.all([folderFor(collection, fields.slug), routeFieldId(collection)]);
	const uploaded = await uploadMedia(file, { folderId, fieldId });

	// Read the form again: it may have changed while the route uploaded
	const current = editorDraft.get();
	const fillIfEmpty = (field: string, value: string | undefined) =>
		value !== undefined && isEmpty(current.fields[field]) ? [{ op: "set" as const, field, value }] : [];
	// The route link and its text go together: keep a link that's already there, such as AllTrails
	const routeLink =
		route.link && isEmpty(current.fields.gpx_url)
			? [{ op: "set" as const, field: "gpx_url", value: route.link.url }, ...fillIfEmpty("gpx_url_text", route.link.text)]
			: [];
	return editorDraft.patch(
		[
			{ op: "set", field: "map_data", value: fileValue(uploaded) },
			...fillIfEmpty("distance", route.distanceMetres === undefined ? undefined : distanceText(route.distanceMetres)),
			...fillIfEmpty("duration", route.movingSeconds === undefined ? undefined : durationText(route.movingSeconds)),
			...routeLink,
		],
		{ expectedRevision: current.revision },
	);
}

export async function putActivityRouteIntoForm(editorDraft: EditorDraft, collection: string, activity: ActivitySummary) {
	const { route } = await activityRoute(activity);
	return putRouteIntoForm(editorDraft, collection, {
		name: activity.name,
		geoJson: route,
		distanceMetres: activity.distanceMetres,
		movingSeconds: activity.movingSeconds,
		link: { url: activityUrl(activity.id), text: "Strava" },
	});
}
