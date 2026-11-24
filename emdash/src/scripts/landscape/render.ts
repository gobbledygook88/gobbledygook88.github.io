/**
 * Draws a generated landscape as SVG markup: the ridgelines back to front, with the stream,
 * trees, grass, trail and bridge each painted in the layer for their depth, so nearer ground
 * hides what is behind it.
 */
import { formatPoints, type Point, round1, smoothstep } from "./maths";
import {
	ABOVE_STREAM_LIFT,
	flockGroup,
	layerGroup,
	layerOf,
	STREAM_LAYER_LIFT,
	TRAIL_LAYER_LIFT,
} from "./painting";
import { perspective, ROW_COUNT, rowDepth, screenY } from "./projection";
import type { Scene, Sky, Tree, Tuft } from "./scene";

const ROW_SAMPLE_STEP = 8;
const CRUMB_SPACING = 6.4;
const CLOUD_SHAPE = "M0,0 C-2,-5 5,-8 9,-5 C10,-11 21,-12 23,-6 C26,-9 33,-7 32,-2 C36,-2 37,0 37,0 Z";

type Place = (z: number, markup: string) => void;

export function renderScene(scene: Scene): string {
	const layers = Array.from({ length: ROW_COUNT }, (_, index) => ({
		ridge: renderRidgeRow(scene, rowDepth(index)),
		items: [] as { z: number; markup: string }[],
	}));
	const place: Place = (z, markup) => layers[layerOf(z)].items.push({ z, markup });

	renderStream(scene, place);
	for (const tree of scene.trees) place(tree.z, renderTree(tree));
	for (const tuft of scene.tufts) place(tuft.z, renderTuft(tuft));
	renderTrail(scene, place);
	renderBridge(scene, place);

	const layerMarkup = layers
		.map(({ ridge, items }) => {
			const sortedItems = items.sort((a, b) => a.z - b.z).map((item) => item.markup);
			return layerGroup(`${ridge}${sortedItems.join("")}`);
		})
		.join("");

	// The sun sets behind the hills; clouds drift in front of them
	const { sun, clouds } = renderSky(scene.sky);
	return `${sun}${layerMarkup}${clouds}${flockGroup()}`;
}

/** Distant things are drawn fainter, like haze, so the near ground stands forward. */
const hazeOpacity = (z: number, nearest = 1, farthest = 0.4) =>
	(farthest + (nearest - farthest) * smoothstep(0.1, 0.8, z)).toFixed(2);

/** Ridgelines fade steadily towards the horizon, so the far hills recede. */
const ridgeOpacity = (z: number) => (0.14 + 0.36 * z).toFixed(2);

function renderSky({ sun, clouds }: Sky) {
	const cloudMarkup = clouds.map(
		(cloud) =>
			`<g class="cloud" style="animation-duration:${round1(cloud.duration)}s;animation-delay:-${round1(cloud.duration * cloud.progress)}s">` +
			`<path transform="translate(0,${round1(cloud.y)}) scale(${round1(cloud.flip * cloud.scale)},${round1(cloud.scale)})" d="${CLOUD_SHAPE}"/></g>`,
	);
	return {
		sun: `<circle class="sun" cx="${round1(sun.x)}" cy="${round1(sun.y)}" r="${sun.r}"/>`,
		clouds: cloudMarkup.join(""),
	};
}

/** One ridgeline, filled below so it hides the rows behind it. Far rows fade towards the horizon. */
function renderRidgeRow({ stream, heightAt }: Scene, z: number) {
	const xs: number[] = [];
	for (let x = -16; x <= 1016; x += ROW_SAMPLE_STEP) xs.push(x);
	// Sample the stream's valley exactly so the notch reads crisply
	if (stream.isFlowingAt(z)) {
		const centre = stream.xAt(z);
		xs.push(centre - 3, centre, centre + 3);
	}
	xs.sort((a, b) => a - b);

	const points = xs.map((x): Point => [x, screenY(z, heightAt(x, z))]);
	return `<path class="ridge" stroke-opacity="${ridgeOpacity(z)}" d="M-16,300 L${formatPoints(points)} L1016,300 Z"/>`;
}

/** The stream is a ribbon between two banks that clears the ridgelines beneath it. */
function renderStream({ stream }: Scene, place: Place) {
	const runs: (typeof stream.course)[] = [];
	for (const point of stream.course) {
		const current = runs.at(-1);
		const previous = current?.at(-1);
		if (current && previous && layerOf(previous.z + STREAM_LAYER_LIFT) === layerOf(point.z + STREAM_LAYER_LIFT)) {
			current.push(point);
		} else {
			runs.push(previous ? [previous, point] : [point]);
		}
	}

	for (const run of runs) {
		if (run.length < 2) continue;
		const left = run.map((p): Point => [p.x - p.half, p.y]);
		const right = run.map((p): Point => [p.x + p.half, p.y]);
		const opacity = hazeOpacity(run[0].z);
		place(
			run[0].z + STREAM_LAYER_LIFT,
			`<path class="ground" d="M${formatPoints([...left, ...[...right].reverse()])} Z"/>` +
				`<polyline class="stream-bank" stroke-opacity="${opacity}" points="${formatPoints(left)}"/>` +
				`<polyline class="stream-bank" stroke-opacity="${opacity}" points="${formatPoints(right)}"/>`,
		);
	}
}

/** A conifer with slightly irregular branches on each side, their tips drooping below the notches. */
function renderTree({ x, y, z, height, width, tiers, branchSpread }: Tree) {
	const top = y - height;
	const skirt = y - height * 0.14;
	const tierHeight = (skirt - top) / tiers;

	function side(direction: 1 | -1, spread: number[]) {
		const points: Point[] = [];
		for (let tier = 1; tier <= tiers; tier++) {
			const tierY = top + tierHeight * tier;
			const half = (width / 2) * (0.3 + (0.7 * tier) / tiers) * spread[tier - 1];
			points.push([x + direction * half, tierY]);
			if (tier < tiers) points.push([x + direction * half * 0.45, tierY - tierHeight * 0.18]);
		}
		return points;
	}

	const outline = [...side(1, branchSpread.right), ...side(-1, branchSpread.left).reverse()];
	return (
		`<path class="tree" stroke-opacity="${hazeOpacity(z)}" d="M${round1(x)},${round1(top)} L${formatPoints(outline)} Z ` +
		`M${round1(x)},${round1(skirt)} L${round1(x)},${round1(y)}"/>`
	);
}

function renderTuft({ x, y, z, size }: Tuft) {
	const blade = (x0: number, x1: number, bladeHeight: number) =>
		`M${round1(x0)},${round1(y)} L${round1(x1)},${round1(y - bladeHeight)}`;
	const blades = [
		blade(x - size, x - 2 * size, 2.2 * size),
		blade(x, x + 0.2 * size, 3 * size),
		blade(x + size, x + 2 * size, 2.2 * size),
	];
	return `<path class="tuft" stroke-opacity="${hazeOpacity(z, 0.7, 0.35)}" d="${blades.join(" ")}"/>`;
}

/**
 * The trail is a line of crumbs placed by distance along it on screen. Spacing and size shrink
 * with depth, and each crumb has its own small halo so it reads over the ridgelines.
 */
function renderTrail({ trail }: Scene, place: Place) {
	const crumbsByLayer = new Map<number, { z: number; points: Point[] }>();
	for (let distance = 0; distance <= trail.path.length; ) {
		const { x, y, z } = trail.path.at(distance);
		distance += CRUMB_SPACING * perspective(z);
		if (trail.isOnBridge(x)) continue;

		const layer = layerOf(z + TRAIL_LAYER_LIFT);
		const crumbs = crumbsByLayer.get(layer) ?? { z, points: [] };
		crumbs.points.push([x, y]);
		crumbsByLayer.set(layer, crumbs);
	}

	for (const { z, points } of crumbsByLayer.values()) {
		const crumbs = points.map(([px, py]) => `M${round1(px)},${round1(py)}h0`).join("");
		const size = 2.4 * perspective(z);
		place(
			z + TRAIL_LAYER_LIFT,
			`<path class="trail-halo" style="stroke-width:${(size + 1.8).toFixed(2)}px" d="${crumbs}"/>` +
				`<path class="trail" style="stroke-width:${size.toFixed(2)}px" d="${crumbs}"/>`,
		);
	}
}

/**
 * An arched plank footbridge seen from slightly above: a deck with a little depth, plank seams
 * across it, a visible edge on the near side, and a handrail on each side.
 */
function renderBridge({ trail }: Scene, place: Place) {
	const { x, z, halfSpan, deckHeight, archAt } = trail.bridge;
	const DECK_HALF_DEPTH = 0.007;
	const SAMPLES = 10;
	const railHeight = 4.2 * perspective(z);
	const edgeThickness = 0.8 * perspective(z);

	const edge = (side: 1 | -1) =>
		Array.from({ length: SAMPLES + 1 }, (_, i): Point => {
			const px = x - halfSpan + (2 * halfSpan * i) / SAMPLES;
			return [px, screenY(trail.zAt(px) + side * DECK_HALF_DEPTH, deckHeight + archAt(px))];
		});
	const near = edge(1);
	const far = edge(-1);
	const raised = (points: Point[], amount: number) => points.map(([px, py]): Point => [px, py - amount]);
	const post = ([px, py]: Point) => `M${round1(px)},${round1(py)} L${round1(px)},${round1(py - railHeight)}`;
	const handrail = (points: Point[]) =>
		`M${formatPoints(raised(points, railHeight))} ${post(points[0])} ${post(points[SAMPLES])}`;

	const deck = `M${formatPoints([...near, ...[...far].reverse()])} Z`;
	const nearEdge = `M${formatPoints([...near, ...raised([...near].reverse(), -edgeThickness)])} Z`;
	const seams = [2, 4, 6, 8]
		.map((i) => `M${round1(near[i][0])},${round1(near[i][1])} L${round1(far[i][0])},${round1(far[i][1])}`)
		.join(" ");

	place(
		z + ABOVE_STREAM_LIFT,
		`<g class="bridge">` +
			`<path class="bridge-rail" stroke-opacity="0.55" d="${handrail(far)}"/>` +
			`<path class="bridge-deck" d="${deck}"/>` +
			`<path class="bridge-seams" d="${seams}"/>` +
			`<path class="bridge-deck" d="${nearEdge}"/>` +
			`<path class="bridge-rail" d="${handrail(near)}"/>` +
			`</g>`,
	);
}
