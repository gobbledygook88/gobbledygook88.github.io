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
	sampleArray,
	sampleSmoothly,
	smoothstep,
	yAlongCurve,
} from "./maths";
import { perspective, ROW_COUNT, rowDepth, screenY, VIEW_WIDTH } from "./projection";

export const TRAIL_START = -60;
export const TRAIL_END = 1060;
const TRAIL_STEP = 2;
const TRAIL_POINTS = (TRAIL_END - TRAIL_START) / TRAIL_STEP + 1;

const HILL_TOP_MARGIN = 30;
const VALLEY_WIDTH = 45;
const BRIDGE_ARCH = 0.022;
const TREELINE = 0.78;

interface Hill {
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
	from: { x: number; z: number };
	to: { x: number; z: number };
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

export interface Trail {
	zAt(x: number): number;
	groundAt(x: number): number;
	/** The height underfoot: the ground, or the bridge's arched deck */
	surfaceAt(x: number): number;
	isOnBridge(x: number): boolean;
	bridge: Bridge;
}

export interface Forest {
	x: number;
	z: number;
	sx: number;
	sz: number;
	frontZ: number;
}

export interface Tree {
	x: number;
	z: number;
	/** Screen y of the tree's base */
	y: number;
	height: number;
	width: number;
	tiers: number;
	/** Per-branch length multipliers, four for each side */
	branchSpread: number[];
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
	seed: number;
	stream: Stream;
	forest: Forest;
	trail: Trail;
	trees: Tree[];
	tufts: Tuft[];
	sky: Sky;
	heightAt(x: number, z: number): number;
}

type Between = (a: number, b: number) => number;
type HeightField = (x: number, z: number) => number;

export const randomSeed = () => Math.floor(Math.random() * 1_000_000);

export function generateScene(seed: number): Scene {
	const random = createSeededRandom(seed);
	const between: Between = (a, b) => a + (b - a) * random();

	const hills = raiseHills(between);
	const detail = diamondSquare(random, 6, 0.55);
	const baseHeight: HeightField = (x, z) => {
		let hillTotal = 0;
		for (const hill of Object.values(hills)) hillTotal += hillHeight(hill, x, z);
		// A little rougher on the tops, gentler in the meadows
		const roughness = 0.1 * (1 - 0.7 * z) + 0.1 * hillTotal;
		return Math.max(0, 0.03 + 0.25 * (1 - z) ** 2 + hillTotal + roughness * detail(x / VIEW_WIDTH, z));
	};
	fitHillsInFrame(hills, baseHeight);

	const stream = layOutStream(random, between, hills, baseHeight);
	const shapedHeight: HeightField = (x, z) => carveStreamValley(baseHeight(x, z), x, z, stream);

	const forestZ = between(0.42, 0.5);
	const forest: Forest = {
		x: lerp(stream.from.x, hills.right.x, 0.55) + between(-5, 25),
		z: forestZ,
		sx: between(95, 125),
		sz: 0.14,
		frontZ: forestZ + 0.14 * 1.3,
	};

	const trail = layOutTrail(random, between, { stream, forest, hills }, shapedHeight);
	const heightAt: HeightField = (x, z) => {
		const height = shapedHeight(x, z);
		const trailZ = trail.zAt(x);
		// Keep the ground in front of the trail low enough that the hiker stays in view
		return z > trailZ ? Math.min(height, trail.groundAt(x) + 1.2 * (z - trailZ)) : height;
	};

	const trees = plantTrees(random, between, { forest, hills, stream, trail, heightAt });
	const tufts = scatterGrassTufts(between, { stream, trail, heightAt });
	const sky = paintSky(between, hills);

	return { seed, stream, forest, trail, trees, tufts, sky, heightAt };
}

const hillHeight = (hill: Hill, x: number, z: number) =>
	hill.amp * Math.exp(-(((x - hill.x) / hill.sx) ** 2) - (((z - hill.z) / hill.sz) ** 2));

/** Narrows faster than the landscape around it, so the stream tapers to a thread near its spring. */
export const streamHalfWidth = (z: number) => 6 * perspective(z) ** 2;

/**
 * Two hills frame the valley: a tall one on the right and one on the left at 45-52% of its
 * height, close enough to the middle that both peaks show on a phone. Low swells fill the edges.
 */
function raiseHills(between: Between): Hills {
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

/** Scales every hill down together, keeping their proportions, until the highest point clears the top edge. */
function fitHillsInFrame(hills: Hills, baseHeight: HeightField) {
	for (let attempt = 0; attempt < 40; attempt++) {
		let highestY = Infinity;
		for (let row = 0; row < ROW_COUNT; row++) {
			const z = rowDepth(row);
			for (let x = 0; x <= VIEW_WIDTH; x += 10) highestY = Math.min(highestY, screenY(z, baseHeight(x, z)));
		}
		if (highestY >= HILL_TOP_MARGIN) return;
		for (const hill of Object.values(hills)) hill.amp *= 0.96;
	}
}

/**
 * The dip in the skyline between the two hills, where the stream springs from. The skyline is
 * whichever row stands highest on screen at each x, so this also returns that row's depth.
 */
function findSaddle(hills: Hills, baseHeight: HeightField) {
	let dip = { x: lerp(hills.left.x, hills.right.x, 0.5), y: -Infinity, z: 0.3 };
	for (let x = hills.left.x; x <= hills.right.x; x += 2) {
		let skyline = { y: Infinity, z: 0 };
		for (let row = 0; row < ROW_COUNT; row++) {
			const z = rowDepth(row);
			const y = screenY(z, baseHeight(x, z));
			if (y < skyline.y) skyline = { y, z };
		}
		if (skyline.y > dip.y) dip = { x, ...skyline };
	}
	return dip;
}

/** A stream springs from just in front of the dip between the hills and winds towards the viewer. */
function layOutStream(random: Random, between: Between, hills: Hills, baseHeight: HeightField): Stream {
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

	return { from, to, xAt, levelAt, course, isFlowingAt: (z) => z >= from.z && z <= to.z };
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
	between: Between,
	{ stream, forest, hills }: { stream: Stream; forest: Forest; hills: Hills },
	shapedHeight: HeightField,
): Trail {
	const bridgeZ = between(0.8, 0.84);
	const bridgeX = stream.xAt(bridgeZ);
	const halfSpan = streamHalfWidth(bridgeZ) + 8 * perspective(bridgeZ);
	const controls: Point[] = [
		[TRAIL_START, between(0.84, 0.88)],
		[bridgeX - between(90, 140), between(0.83, 0.87)],
		[bridgeX, bridgeZ],
		[Math.max(forest.x - 25, bridgeX + 60), Math.min(0.8, forest.frontZ + 0.09)],
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
	const surfaceAt = (x: number) => (isOnBridge(x) ? deckHeight + archAt(x) : groundAt(x));

	return { zAt, groundAt, surfaceAt, isOnBridge, bridge: { x: bridgeX, z: bridgeZ, halfSpan, deckHeight, archAt } };
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
	between: Between,
	{
		forest,
		hills,
		stream,
		trail,
		heightAt,
	}: { forest: Forest; hills: Hills; stream: Stream; trail: Trail; heightAt: HeightField },
): Tree[] {
	const copses = [
		{ x: forest.x, z: forest.z, sx: forest.sx, sz: forest.sz, amp: 1 },
		{ x: hills.left.x + between(-50, 10), z: hills.left.z + between(0.08, 0.16), sx: between(45, 70), sz: 0.1, amp: 0.8 },
		{ x: hills.right.x + between(170, 240), z: between(0.22, 0.34), sx: between(40, 60), sz: 0.08, amp: 0.7 },
	];
	const thinning = diamondSquare(random, 5, 0.6);

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
			const branchSpread = Array.from({ length: 8 }, () => between(0.9, 1.1));
			trees.push({ x, z, y, height, width, tiers, branchSpread });
		}
	}
	return trees;
}

function scatterGrassTufts(
	between: Between,
	{ stream, trail, heightAt }: { stream: Stream; trail: Trail; heightAt: HeightField },
): Tuft[] {
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

function paintSky(between: Between, hills: Hills): Sky {
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
