/**
 * The order the drawing is painted in, shared by the static scene and the figures animated over it.
 *
 * The drawing is painted back to front in layers, one per ridgeline, so nearer ground hides
 * whatever is behind it. Something at depth z is painted in the layer of the row just behind it.
 */
import { clamp } from "./maths";
import { ROW_COUNT } from "./projection";

const LAYER_CLASS = "layer";
const FLOCK_CLASS = "flock";

export const layerOf = (z: number) => clamp(Math.floor(z * (ROW_COUNT - 1)), 0, ROW_COUNT - 1);

/**
 * Painting the trail and stream a few rows further forward than their depth lets them clear the
 * ridgelines around them. The bridge and hiker go just after the stream so they sit on top of it.
 */
export const TRAIL_LAYER_LIFT = 0.05;
export const STREAM_LAYER_LIFT = 0.12;
export const ABOVE_STREAM_LIFT = STREAM_LAYER_LIFT + 0.002;

/** The layer a figure walking the trail at depth z is painted in, alongside the bridge. */
export const figureLayerOf = (z: number) => layerOf(z + ABOVE_STREAM_LIFT);

export const layerGroup = (content: string) => `<g class="${LAYER_CLASS}">${content}</g>`;
export const flockGroup = () => `<g class="${FLOCK_CLASS}"></g>`;

/** The groups a painted scene provides for animated figures: one per layer, and one for birds overhead. */
export function paintedGroups(svg: SVGSVGElement) {
	return {
		layers: svg.querySelectorAll<SVGGElement>(`.${LAYER_CLASS}`),
		flock: svg.querySelector<SVGGElement>(`.${FLOCK_CLASS}`),
	};
}
