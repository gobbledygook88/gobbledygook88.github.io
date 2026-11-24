/**
 * How the landscape's world maps onto the drawing.
 *
 * x runs across the 1000-unit-wide drawing. Depth z runs from the farthest ridgeline (0) to
 * the nearest (1). Things shrink and rows bunch up towards the horizon, and the ground rises
 * from each row's baseline by its height.
 */
import { lerp } from "./maths";

export const VIEW_WIDTH = 1000;
export const VIEW_HEIGHT = 260;
export const ROW_COUNT = 30;

const HORIZON_Y = 120;
const GROUND_DROP = 145;
const FAR_DEPTH = 3;
const HEIGHT_SCALE = 165;
const FAR_PERSPECTIVE = 1 / FAR_DEPTH;

/** How large something at depth z is drawn, relative to the nearest row. */
export const perspective = (z: number) => 1 / lerp(FAR_DEPTH, 1, z);

const rowBaseY = (z: number) =>
	HORIZON_Y + (GROUND_DROP * (perspective(z) - FAR_PERSPECTIVE)) / (1 - FAR_PERSPECTIVE);

export const screenY = (z: number, height: number) => rowBaseY(z) - height * HEIGHT_SCALE * perspective(z);

export const rowDepth = (index: number) => index / (ROW_COUNT - 1);
