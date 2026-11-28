import { definePlugin } from "emdash";
import { TRIP_EDITOR_ID, TRIP_EDITOR_VERSION, type TripEditorOptions } from "./identity";

/**
 * Runtime half of the trip editor. It has no hooks or routes: it only tells the
 * admin to load the React module, whose field widgets the schema opts into
 * with `"widget": "trip-editor:<name>"`.
 */
export function createPlugin(options: TripEditorOptions) {
	return definePlugin({
		id: TRIP_EDITOR_ID,
		version: TRIP_EDITOR_VERSION,
		admin: { entry: options.adminEntry },
	});
}
