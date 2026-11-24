/**
 * Generates a landscape from a seed: two hills with a stream springing from the dip between
 * them, a forest on the taller hill's flank, and a trail crossing the stream by a footbridge.
 * The same seed always gives the same landscape.
 */
import {
	catmullRom,
	clamp,
	createSeededRandom,
	diamondSquare,
	lerp,
	midpointDisplace,
	type Point,
	type Random,
	rangeFrom,
	sampleArray,
	sampleSmoothly,
	smoothstep,
	yAlongCurve,
} from "./maths";
import { perspective, ROW_COUNT, rowDepth, screenY, VIEW_WIDTH } from "./projection";

const TRAIL_START = -60;
const TRAIL_END = 1060;
const TRAIL_STEP = 2;
const TRAIL_POINTS = (TRAIL_END - TRAIL_START) / TRAIL_STEP + 1;

const HILL_TOP_MARGIN = 30;
const VALLEY_WIDTH = 45;
const BRIDGE_ARCH = 0.022;
const TREELINE = 0.78;

/** A rounded rise in the ground, also used to say where trees grow thickest. */
export interface Hill {
	x: number;
	z: number;
	/** Spread across and into the scene */
	sx: number;
	sz: number;
	/** Peak height */
	amp: number;
}

interface Hills {
	right: Hill;
	left: Hill;
	farLeft: Hill;
	farRight: Hill;
}

interface StreamPoint {
	x: number;
	y: number;
	z: number;
	/** Half the stream's width on screen */
	half: number;
}

export interface Stream {
	/** Where the stream springs from */
	from: { x: number; z: number };
	xAt(z: number): number;
	levelAt(z: number): number;
	isFlowingAt(z: number): boolean;
	/** The stream's course on screen, from its spring to the front edge */
	course: StreamPoint[];
}

export interface Bridge {
	x: number;
	z: number;
	halfSpan: number;
	deckHeight: number;
	archAt(x: number): number;
}

export interface TrailPoint {
	x: number;
	y: number;
	z: number;
}

/** The trail as drawn on screen, measured by distance along it. */
export interface TrailPath {
	length: number;
	at(distance: number): TrailPoint;
	distanceAtX(x: number): number;
}

export interface Trail {
	zAt(x: number): number;
	groundAt(x: number): number;
	isOnBridge(x: number): boolean;
	bridge: Bridge;
	path: TrailPath;
}

export interface Tree {
	x: number;
	z: number;
	/** Screen y of the tree's base */
	y: number;
	height: number;
	width: number;
	tiers: number;
	/** Branch length multipliers for each side, one per tier */
	branchSpread: { right: number[]; left: number[] };
}

export interface Tuft {
	x: number;
	y: number;
	z: number;
	size: number;
}

export interface Cloud {
	y: number;
	scale: number;
	flip: number;
	duration: number;
	progress: number;
}

export interface Sky {
	sun: { x: number; y: number; r: number };
	clouds: Cloud[];
}

export interface Scene {
	stream: Stream;
	forest: Hill;
	trail: Trail;
	trees: Tree[];
	tufts: Tuft[];
	sky: Sky;
	heightAt(x: number, z: number): number;
}

type HeightField = (x: number, z: number) => number;

export const randomSeed = () => Math.floor(Math.random() * 1_000_000);

export function generateScene(seed: number): Scene {
	const random = createSeededRandom(seed);
	const between = rangeFrom(random);

	const risenHills = raiseHills(random);
	const detail = diamondSquare(random, 6, 0.55);
	const terrainOver = (hills: Hills): HeightField => (x, z) => terrainHeight(hills, detail, x, z);
	const hills = fitHillsInFrame(risenHills, terrainOver);
	const baseHeight = terrainOver(hills);

	const stream = layOutStream(random, hills, baseHeight);
	const shapedHeight: HeightField = (x, z) => carveStreamValley(baseHeight(x, z), x, z, stream);

	const forestZ = between(0.42, 0.5);
	const forest: Hill = {
		x: lerp(stream.from.x, hills.right.x, 0.55) + between(-5, 25),
		z: forestZ,
		sx: between(95, 125),
		sz: 0.14,
		amp: 1,
	};

	const trail = layOutTrail(random, { stream, forest, hills }, shapedHeight);
	const heightAt: HeightField = (x, z) => {
		const height = shapedHeight(x, z);
		const trailZ = trail.zAt(x);
		// Keep the ground in front of the trail low enough that the hiker stays in view
		return z > trailZ ? Math.min(height, trail.groundAt(x) + 1.2 * (z - trailZ)) : height;
	};

	const trees = plantTrees(random, { forest, hills, stream, trail, heightAt });
	const tufts = scatterGrassTufts(random, { stream, trail, heightAt });
	const sky = paintSky(random, hills);

	return { stream, forest, trail, trees, tufts, sky, heightAt };
}

const hillHeight = (hill: Hill, x: number, z: number) =>
	hill.amp * Math.exp(-(((x - hill.x) / hill.sx) ** 2) - (((z - hill.z) / hill.sz) ** 2));

function terrainHeight(hills: Hills, detail: (u: number, v: number) => number, x: number, z: number) {
	let hillTotal = 0;
	for (const hill of Object.values(hills)) hillTotal += hillHeight(hill, x, z);
	// A little rougher on the tops, gentler in the meadows
	const roughness = 0.1 * (1 - 0.7 * z) + 0.1 * hillTotal;
	return Math.max(0, 0.03 + 0.25 * (1 - z) ** 2 + hillTotal + roughness * detail(x / VIEW_WIDTH, z));
}

/** Narrows faster than the landscape around it, so the stream tapers to a thread near its spring. */
export const streamHalfWidth = (z: number) => 6 * perspective(z) ** 2;

/**
 * Two hills frame the valley: a tall one on the right and one on the left at 45-52% of its
 * height, close enough to the middle that both peaks show on a phone. Low swells fill the edges.
 */
function raiseHills(random: Random): Hills {
	const between = rangeFrom(random);
	const right = { x: between(625, 655), z: between(0.2, 0.26), sx: between(98, 110), sz: 0.2, amp: between(1.6, 1.8) };
	const left = {
		x: between(345, 370),
		z: between(0.24, 0.3),
		sx: between(74, 86),
		sz: 0.18,
		amp: right.amp * between(0.45, 0.52),
	};
	return {
		right,
		left,
		farLeft: { x: between(40, 140), z: between(0.04, 0.1), sx: between(100, 140), sz: 0.16, amp: between(0.3, 0.45) },
		farRight: { x: between(880, 980), z: between(0.04, 0.1), sx: between(100, 140), sz: 0.16, amp: between(0.3, 0.45) },
	};
}

function scaleHills({ right, left, farLeft, farRight }: Hills, factor: number): Hills {
	const scaled = (hill: Hill) => ({ ...hill, amp: hill.amp * factor });
	return { right: scaled(right), left: scaled(left), farLeft: scaled(farLeft), farRight: scaled(farRight) };
}

/** Scales every hill down together, keeping their proportions, until the highest point clears the top edge. */
function fitHillsInFrame(hills: Hills, terrainOver: (hills: Hills) => HeightField): Hills {
	let fitted = hills;
	for (let attempt = 0; attempt < 40; attempt++) {
		const height = terrainOver(fitted);
		let highestY = Infinity;
		for (let x = 0; x <= VIEW_WIDTH; x += 10) highestY = Math.min(highestY, skylineAt(height, x).y);
		if (highestY >= HILL_TOP_MARGIN) return fitted;
		fitted = scaleHills(fitted, 0.96);
	}
	return fitted;
}

/** The highest point on screen at x, across every ridgeline, and the depth of the row it is on. */
function skylineAt(height: HeightField, x: number) {
	let skyline = { y: Infinity, z: 0 };
	for (let row = 0; row < ROW_COUNT; row++) {
		const z = rowDepth(row);
		const y = screenY(z, height(x, z));
		if (y < skyline.y) skyline = { y, z };
	}
	return skyline;
}

/** The dip in the skyline between the two hills, where the stream springs from. */
function findSaddle(hills: Hills, baseHeight: HeightField) {
	let dip = { x: lerp(hills.left.x, hills.right.x, 0.5), y: -Infinity, z: 0.3 };
	for (let x = hills.left.x; x <= hills.right.x; x += 2) {
		const skyline = skylineAt(baseHeight, x);
		if (skyline.y > dip.y) dip = { x, ...skyline };
	}
	return dip;
}

/** A stream springs from just in front of the dip between the hills and winds towards the viewer. */
function layOutStream(random: Random, hills: Hills, baseHeight: HeightField): Stream {
	const between = rangeFrom(random);
	const saddle = findSaddle(hills, baseHeight);
	const from = { x: saddle.x, z: clamp(saddle.z + between(0.02, 0.04), 0.24, 0.34) };
	const to = { x: from.x - between(90, 170), z: 1.08 };
	const meander = midpointDisplace(random, 5, 40);
	const progress = (z: number) => (z - from.z) / (to.z - from.z);
	const xAt = (z: number) => lerp(from.x, to.x, progress(z)) + sampleSmoothly(meander, progress(z));

	// Water only runs downhill: its level is the running minimum of the ground beneath it
	const levels: number[] = [];
	let level = Infinity;
	for (let i = 0; i <= 300; i++) {
		const z = lerp(from.z, to.z, i / 300);
		level = Math.min(level, baseHeight(xAt(z), z) - 0.02);
		levels.push(level);
	}
	const levelAt = (z: number) => sampleArray(levels, progress(z));

	const course: StreamPoint[] = [];
	for (let z = from.z; z <= 1.06; z += 0.003) {
		const spring = smoothstep(from.z, from.z + 0.12, z);
		course.push({ z, x: xAt(z), y: screenY(z, levelAt(z) + 0.004), half: streamHalfWidth(z) * spring });
	}

	return { from, xAt, levelAt, course, isFlowingAt: (z) => z >= from.z && z <= to.z };
}

function carveStreamValley(height: number, x: number, z: number, stream: Stream) {
	if (!stream.isFlowingAt(z)) return height;
	const offset = x - stream.xAt(z);
	if (Math.abs(offset) > 150) return height;
	const level = stream.levelAt(z);
	if (height <= level) return height;
	// A smooth trough: deepest along the stream, easing back to the hillside either side
	const springFade = smoothstep(stream.from.z, stream.from.z + 0.06, z);
	const trough = Math.exp(-((offset / VALLEY_WIDTH) ** 2));
	return height - (height - level) * trough * springFade;
}

/** A footpath from the left edge, over the stream, along the forest and up the far shoulder. */
function layOutTrail(
	random: Random,
	{ stream, forest, hills }: { stream: Stream; forest: Hill; hills: Hills },
	shapedHeight: HeightField,
): Trail {
	const between = rangeFrom(random);
	const bridgeZ = between(0.8, 0.84);
	const bridgeX = stream.xAt(bridgeZ);
	const halfSpan = streamHalfWidth(bridgeZ) + 8 * perspective(bridgeZ);
	const forestFrontZ = forest.z + 1.3 * forest.sz;
	const controls: Point[] = [
		[TRAIL_START, between(0.84, 0.88)],
		[bridgeX - between(90, 140), between(0.83, 0.87)],
		[bridgeX, bridgeZ],
		[Math.max(forest.x - 25, bridgeX + 60), Math.min(0.8, forestFrontZ + 0.09)],
		[hills.right.x + 150, between(0.6, 0.65)],
		[hills.right.x + 260, between(0.48, 0.53)],
		[TRAIL_END, between(0.4, 0.45)],
	];
	const curve = catmullRom(controls, 30);
	const wiggle = midpointDisplace(random, 7, 0.012);

	const depths: number[] = [];
	const ground: number[] = [];
	for (let i = 0; i < TRAIL_POINTS; i++) {
		const x = TRAIL_START + i * TRAIL_STEP;
		const steadyNearBridge = smoothstep(halfSpan, halfSpan + 40, Math.abs(x - bridgeX));
		const z = yAlongCurve(curve, x) + sampleArray(wiggle, i / (TRAIL_POINTS - 1)) * steadyNearBridge;
		depths.push(z);
		ground.push(shapedHeight(x, z));
	}

	const alongTrail = (values: number[], x: number) => sampleArray(values, (x - TRAIL_START) / (TRAIL_END - TRAIL_START));
	const zAt = (x: number) => alongTrail(depths, x);
	const groundAt = (x: number) => alongTrail(ground, x);
	const deckHeight = Math.max(groundAt(bridgeX - halfSpan), groundAt(bridgeX + halfSpan)) + 0.008;
	const isOnBridge = (x: number) => Math.abs(x - bridgeX) <= halfSpan;
	const archAt = (x: number) => BRIDGE_ARCH * Math.sin((Math.PI * (x - (bridgeX - halfSpan))) / (2 * halfSpan));
	// The height underfoot: the ground, or the bridge's arched deck
	const surfaceAt = (x: number) => (isOnBridge(x) ? deckHeight + archAt(x) : groundAt(x));

	return {
		zAt,
		groundAt,
		isOnBridge,
		bridge: { x: bridgeX, z: bridgeZ, halfSpan, deckHeight, archAt },
		path: traceScreenPath(zAt, surfaceAt),
	};
}

/** Follows the trail across the drawing, measuring how far along it each point lies on screen. */
function traceScreenPath(zAt: (x: number) => number, surfaceAt: (x: number) => number): TrailPath {
	const points: (TrailPoint & { distance: number })[] = [];
	let length = 0;
	for (let x = TRAIL_START; x <= TRAIL_END; x += TRAIL_STEP) {
		const z = zAt(x);
		const y = screenY(z, surfaceAt(x));
		const previous = points.at(-1);
		if (previous) length += Math.hypot(x - previous.x, y - previous.y);
		points.push({ x, y, z, distance: length });
	}

	function at(distance: number): TrailPoint {
		const wanted = clamp(distance, 0, length);
		let low = 0;
		let high = points.length - 1;
		while (high - low > 1) {
			const middle = (low + high) >> 1;
			if (points[middle].distance <= wanted) low = middle;
			else high = middle;
		}
		const a = points[low];
		const b = points[high];
		const t = b.distance === a.distance ? 0 : (wanted - a.distance) / (b.distance - a.distance);
		return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) };
	}

	const distanceAtX = (x: number) =>
		points[clamp(Math.round((x - TRAIL_START) / TRAIL_STEP), 0, points.length - 1)].distance;

	return { length, at, distanceAtX };
}

/** True when any part of a tree's outline would touch the stream on screen. */
function overlapsStream(stream: Stream, x: number, y: number, height: number, width: number) {
	const margin = 1.5;
	const top = y - height;
	return stream.course.some(
		(point) =>
			point.y >= top - margin && point.y <= y + margin && Math.abs(point.x - x) < point.half + width / 2 + margin,
	);
}

function plantTrees(
	random: Random,
	{
		forest,
		hills,
		stream,
		trail,
		heightAt,
	}: { forest: Hill; hills: Hills; stream: Stream; trail: Trail; heightAt: HeightField },
): Tree[] {
	const between = rangeFrom(random);
	const copses: Hill[] = [
		forest,
		{ x: hills.left.x + between(-50, 10), z: hills.left.z + between(0.08, 0.16), sx: between(45, 70), sz: 0.1, amp: 0.8 },
		{ x: hills.right.x + between(170, 240), z: between(0.22, 0.34), sx: between(40, 60), sz: 0.08, amp: 0.7 },
	];
	const thinning = diamondSquare(random, 5, 0.6);
	const branchSpreads = () => Array.from({ length: 4 }, () => between(0.9, 1.1));

	const trees: Tree[] = [];
	for (let row = 0.06; row < 0.85; row += 0.025) {
		for (let column = -10; column < 1010; column += 9) {
			const x = column + between(-3.5, 3.5);
			const z = row + between(-0.009, 0.009);
			let density = 0.008;
			for (const copse of copses) density = Math.max(density, Math.min(1, 1.3 * hillHeight(copse, x, z)));
			density *= 0.6 + 0.4 * thinning(x / VIEW_WIDTH, z);
			const roll = random();
			const sizeRoll = random();
			const widthRoll = random();
			if (roll > density) continue;

			const ground = heightAt(x, z);
			if (ground > TREELINE || z > trail.zAt(x) - 0.06) continue;
			// Trees higher up the hill grow smaller
			const altitudeShrink = 1 - 0.45 * smoothstep(0.15, TREELINE, ground);
			const height = lerp(30, 48, sizeRoll) * perspective(z) * altitudeShrink;
			const width = height * lerp(0.36, 0.46, widthRoll);
			const y = screenY(z, ground);
			if (overlapsStream(stream, x, y, height, width)) continue;

			const tiers = height > 17 ? 4 : height > 9 ? 3 : 2;
			const branchSpread = { right: branchSpreads(), left: branchSpreads() };
			trees.push({ x, z, y, height, width, tiers, branchSpread });
		}
	}
	return trees;
}

function scatterGrassTufts(
	random: Random,
	{ stream, trail, heightAt }: { stream: Stream; trail: Trail; heightAt: HeightField },
): Tuft[] {
	const between = rangeFrom(random);
	const tufts: Tuft[] = [];
	for (let attempt = 0; attempt < 70 && tufts.length < 36; attempt++) {
		const x = between(-10, 1010);
		const z = between(0.68, 1.02);
		if (Math.abs(z - trail.zAt(x)) < 0.035) continue;
		if (Math.abs(x - stream.xAt(z)) < 12) continue;
		tufts.push({ x, z, y: screenY(z, heightAt(x, z)), size: 1.3 * perspective(z) });
	}
	return tufts;
}

function paintSky(random: Random, hills: Hills): Sky {
	const between = rangeFrom(random);
	return {
		sun: { x: hills.right.x + between(80, 140), y: between(22, 34), r: 10 },
		clouds: [0, 1].map(() => ({
			y: between(16, 50),
			scale: between(0.8, 1.25),
			flip: between(0, 1) < 0.5 ? -1 : 1,
			duration: between(220, 320),
			progress: between(0, 1),
		})),
	};
}
