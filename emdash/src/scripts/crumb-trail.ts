/**
 * The "crumb trail": a wandering line drawn by midpoint displacement.
 *
 * Starting from a flat line, each round splits every segment at its midpoint
 * and nudges that midpoint up or down by a random amount. The nudge range
 * halves each round, so the line gets finer detail without growing wilder.
 */

export const TRAIL_WIDTH = 1000;
export const TRAIL_HEIGHT = 100;

const ROUNDS = 10;
const INITIAL_DISPLACEMENT = TRAIL_HEIGHT * 0.45;

type Point = [x: number, y: number];

export function drawCrumbTrail(random: () => number = Math.random): Point[] {
	const baseline = TRAIL_HEIGHT / 2;
	let points: Point[] = [
		[0, baseline],
		[TRAIL_WIDTH, baseline],
	];
	let displacement = INITIAL_DISPLACEMENT;

	for (let round = 0; round < ROUNDS; round++) {
		points = points.flatMap((point, index) => {
			const next = points[index + 1];
			if (!next) return [point];
			const midpoint: Point = [
				(point[0] + next[0]) / 2,
				(point[1] + next[1]) / 2 + (random() * 2 - 1) * displacement,
			];
			return [point, midpoint];
		});
		displacement /= 2;
	}

	return points;
}

/** Formats points for an SVG `points` attribute. */
export function toSvgPoints(points: Point[]): string {
	const round = (value: number) => Math.round(value * 10) / 10;
	return points.map(([x, y]) => `${round(x)},${round(y)}`).join(" ");
}
