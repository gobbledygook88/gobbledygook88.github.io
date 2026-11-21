/** EmDash's route for files in the media library (R2 on Cloudflare). */
const MEDIA_FILE_ROUTE = "/_emdash/api/media/file/";

interface FileReference {
	id: string;
	src?: string;
	url?: string;
	meta?: { storageKey?: unknown };
}

/**
 * The URL a browser can fetch a `file` field from. EmDash stores media-library
 * files with their storage key (e.g. "01M7…X.geojson", not the media item's
 * ID) and drops any cached URL, so: a provider's direct URL, else the storage
 * key under EmDash's media route, else a cached URL, else the media ID.
 */
export function fileUrl(file: FileReference | null | undefined): string | undefined {
	if (!file) return undefined;
	const storageKey = typeof file.meta?.storageKey === "string" ? file.meta.storageKey : undefined;
	if (file.src) return file.src;
	if (storageKey) return `${MEDIA_FILE_ROUTE}${storageKey}`;
	return file.url ?? `${MEDIA_FILE_ROUTE}${file.id}`;
}
