/** EmDash's route for files in the media library (R2 on Cloudflare). */
const MEDIA_FILE_ROUTE = "/_emdash/api/media/file/";

interface FileReference {
	id: string;
	src?: string;
	url?: string;
}

/**
 * The URL a browser can fetch a `file` field from: a provider's direct URL,
 * else the cached URL, else EmDash's media route for the file's ID.
 */
export function fileUrl(file: FileReference | null | undefined): string | undefined {
	if (!file) return undefined;
	return file.src ?? file.url ?? `${MEDIA_FILE_ROUTE}${file.id}`;
}
