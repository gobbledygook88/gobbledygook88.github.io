/**
 * Sizes to offer the browser for a photo in the page's content column.
 *
 * Cloudflare resizes media-library photos on request, and its free plan allows
 * 5,000 distinct resized versions a month. So each photo gets at most three
 * sizes: enough for the column on a laptop and for a phone's sharp screen, and
 * never larger than the original.
 */
const PHOTO_WIDTHS = [640, 960, 1280];

/** The content column: 38em wide (see --content-width), the full screen on phones */
const PHOTO_SIZES = "(min-width: 40em) 38em, 100vw";

interface PhotoDimensions {
	width?: number;
	height?: number;
}

export interface PhotoSizing {
	width: number;
	height: number;
	widths: number[];
	sizes: string;
}

/** Photos without stored dimensions can't be resized and are sent as they are. */
export function photoSizing({ width, height }: PhotoDimensions): PhotoSizing | undefined {
	if (!width || !height) return undefined;

	const largestWidth = Math.min(width, PHOTO_WIDTHS.at(-1)!);
	const widths = [...new Set([...PHOTO_WIDTHS.filter((candidate) => candidate < largestWidth), largestWidth])];
	return {
		width: largestWidth,
		height: Math.round((largestWidth * height) / width),
		widths,
		sizes: PHOTO_SIZES,
	};
}
