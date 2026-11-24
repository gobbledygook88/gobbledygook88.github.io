/**
 * Numeric helpers and the random-terrain algorithms the landscape is built from.
 */

export type Point = [x: number, y: number];
export type Random = () => number;
export type Between = (a: number, b: number) => number;

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function smoothstep(edge0: number, edge1: number, value: number) {
	const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
	return t * t * (3 - 2 * t);
}

/** Moves value towards target by at most maxChange. */
export const approach = (value: number, target: number, maxChange: number) =>
	value + clamp(target - value, -maxChange, maxChange);

export const round1 = (value: number) => Math.round(value * 10) / 10;

/** Formats points for an SVG `points` attribute or path data. */
export const formatPoints = (points: Point[]) => points.map(([x, y]) => `${round1(x)},${round1(y)}`).join(" ");

/** A small, fast seeded generator (mulberry32): the same seed always draws the same landscape. */
export function createSeededRandom(seed: number): Random {
	let state = seed >>> 0;
	return function next() {
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Picks values evenly at random between two bounds, using the given generator. */
export const rangeFrom =
	(random: Random): Between =>
	(a, b) =>
		lerp(a, b, random());

/**
 * Midpoint displacement, the home page's original crumb trail: starting from a flat line, each
 * round splits every segment at its midpoint and nudges that midpoint up or down. The nudge
 * halves each round, so the line gains finer detail without growing wilder. Returns offsets
 * from a flat line, 2^rounds + 1 of them, starting and ending at zero.
 */
export function midpointDisplace(random: Random, rounds: number, amplitude: number): number[] {
	let values = [0, 0];
	let displacement = amplitude;
	for (let round = 0; round < rounds; round++) {
		values = values.flatMap((value, index) => {
			const next = values[index + 1];
			if (next === undefined) return [value];
			return [value, (value + next) / 2 + (random() * 2 - 1) * displacement];
		});
		displacement /= 2;
	}
	return values;
}

/**
 * Midpoint displacement in two dimensions (the diamond-square algorithm). Returns a function
 * sampling the resulting noise, normalised to [-1, 1], anywhere over [0, 1]².
 */
export function diamondSquare(random: Random, exponent: number, roughness: number) {
	const size = (1 << exponent) + 1;
	const grid = new Float64Array(size * size);
	const at = (i: number, j: number) => j * size + i;
	const corners: Point[] = [
		[0, 0],
		[size - 1, 0],
		[0, size - 1],
		[size - 1, size - 1],
	];
	for (const [i, j] of corners) grid[at(i, j)] = random() * 2 - 1;

	let step = size - 1;
	let amplitude = 1;
	while (step > 1) {
		const half = step / 2;
		fillSquareCentres(grid, size, step, (average) => average + (random() * 2 - 1) * amplitude);
		fillEdgeMidpoints(grid, size, half, step, (average) => average + (random() * 2 - 1) * amplitude);
		step = half;
		amplitude *= roughness;
	}

	normaliseToUnitRange(grid);

	return function sample(u: number, v: number) {
		const x = clamp(u, 0, 1) * (size - 1);
		const y = clamp(v, 0, 1) * (size - 1);
		const i = Math.min(size - 2, Math.floor(x));
		const j = Math.min(size - 2, Math.floor(y));
		const top = lerp(grid[at(i, j)], grid[at(i + 1, j)], x - i);
		const bottom = lerp(grid[at(i, j + 1)], grid[at(i + 1, j + 1)], x - i);
		return lerp(top, bottom, y - j);
	};
}

/** The "diamond" step: each square's centre becomes the average of its corners, nudged. */
function fillSquareCentres(grid: Float64Array, size: number, step: number, nudge: (average: number) => number) {
	const half = step / 2;
	const at = (i: number, j: number) => j * size + i;
	for (let j = half; j < size; j += step) {
		for (let i = half; i < size; i += step) {
			const average =
				(grid[at(i - half, j - half)] +
					grid[at(i + half, j - half)] +
					grid[at(i - half, j + half)] +
					grid[at(i + half, j + half)]) /
				4;
			grid[at(i, j)] = nudge(average);
		}
	}
}

/** The "square" step: each edge midpoint becomes the average of its neighbours, nudged. */
function fillEdgeMidpoints(
	grid: Float64Array,
	size: number,
	half: number,
	step: number,
	nudge: (average: number) => number,
) {
	const at = (i: number, j: number) => j * size + i;
	const neighbours: Point[] = [
		[-half, 0],
		[half, 0],
		[0, -half],
		[0, half],
	];
	for (let j = 0; j < size; j += half) {
		for (let i = (j / half) % 2 === 0 ? half : 0; i < size; i += step) {
			let sum = 0;
			let count = 0;
			for (const [di, dj] of neighbours) {
				const ni = i + di;
				const nj = j + dj;
				if (ni < 0 || nj < 0 || ni >= size || nj >= size) continue;
				sum += grid[at(ni, nj)];
				count++;
			}
			grid[at(i, j)] = nudge(sum / count);
		}
	}
}

function normaliseToUnitRange(grid: Float64Array) {
	let min = Infinity;
	let max = -Infinity;
	for (const value of grid) {
		min = Math.min(min, value);
		max = Math.max(max, value);
	}
	for (let index = 0; index < grid.length; index++) {
		grid[index] = ((grid[index] - min) / (max - min)) * 2 - 1;
	}
}

/** Reads evenly spaced values at t in [0, 1], joining them with straight lines. */
export function sampleArray(values: number[], t: number) {
	const position = clamp(t, 0, 1) * (values.length - 1);
	const index = Math.min(values.length - 2, Math.floor(position));
	return lerp(values[index], values[index + 1], position - index);
}

/** Like sampleArray, but passes a smooth Catmull-Rom curve through the values. */
export function sampleSmoothly(values: number[], t: number) {
	const position = clamp(t, 0, 1) * (values.length - 1);
	const index = Math.min(values.length - 2, Math.floor(position));
	const at = (i: number) => values[clamp(i, 0, values.length - 1)];
	return catmullRomValue(at(index - 1), at(index), at(index + 1), at(index + 2), position - index);
}

function catmullRomValue(p0: number, p1: number, p2: number, p3: number, t: number) {
	return (
		0.5 *
		(2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
	);
}

/** A smooth curve through the given points. */
export function catmullRom(points: Point[], samplesPerSegment: number): Point[] {
	const padded = [points[0], ...points, points[points.length - 1]];
	const curve: Point[] = [];
	for (let i = 1; i < padded.length - 2; i++) {
		const [p0, p1, p2, p3] = [padded[i - 1], padded[i], padded[i + 1], padded[i + 2]];
		for (let s = 0; s < samplesPerSegment; s++) {
			const t = s / samplesPerSegment;
			curve.push([catmullRomValue(p0[0], p1[0], p2[0], p3[0], t), catmullRomValue(p0[1], p1[1], p2[1], p3[1], t)]);
		}
	}
	curve.push(points[points.length - 1]);
	return curve;
}

/** The curve's second coordinate where it first crosses x. */
export function yAlongCurve(curve: Point[], x: number) {
	for (let i = 0; i < curve.length - 1; i++) {
		const [x0, y0] = curve[i];
		const [x1, y1] = curve[i + 1];
		if ((x >= x0 && x <= x1) || (x <= x0 && x >= x1)) {
			return x1 === x0 ? y0 : lerp(y0, y1, (x - x0) / (x1 - x0));
		}
	}
	return x < curve[0][0] ? curve[0][1] : curve[curve.length - 1][1];
}
