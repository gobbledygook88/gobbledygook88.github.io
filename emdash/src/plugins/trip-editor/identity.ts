/** Shared by the build-time descriptor and the runtime plugin, which must agree */
export const TRIP_EDITOR_ID = "trip-editor";
export const TRIP_EDITOR_VERSION = "0.1.0";

export interface TripEditorOptions {
	/** The React admin module, resolved to a file path at build time */
	adminEntry: string;
}
