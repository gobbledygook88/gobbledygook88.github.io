/**
 * Brings a drawn landscape to life: a hiker walks the trail in a loop, pausing on the bridge,
 * and startles a few birds out of the forest on the way past.
 */
import { approach, clamp, lerp, type Point, smoothstep } from "./maths";
import { ABOVE_STREAM_LIFT, layerOf, perspective, screenY, VIEW_HEIGHT, VIEW_WIDTH } from "./projection";
import { type Scene, TRAIL_END, TRAIL_START, type Tree } from "./scene";

const HIKER_SIZE = 1.48;
const WALK_SPEED = 32;
const STEP_LENGTH = 4.4;
const BRIDGE_PAUSE_SECONDS = 2.4;
const REST_BETWEEN_LAPS_SECONDS = 1.5;
const ROUTE_STEP = 2;

const BIRD_SPAN = 3.8;
const BIRD_CEILING_Y = 16;
const BIRD_FADE_SCALE = { gone: 0.3, solid: 0.5 };

const SVG_NS = "http://www.w3.org/2000/svg";

export interface Walk {
	stop(): void;
}

export function startWalk(scene: Scene, svg: SVGSVGElement): Walk {
	const layers = svg.querySelectorAll<SVGGElement>(".layer");
	const flock = svg.querySelector<SVGGElement>(".flock");
	const hiker = createHikerFigure();
	const route = traceRoute(scene);
	const birds: Bird[] = [];
	const walk = {
		distance: 0,
		endDistance: route.length,
		phase: 0,
		stride: 1,
		pauseLeft: 0,
		restLeft: 0,
		pausedOnBridge: false,
		birdsFlushed: false,
		layer: -1,
	};

	/** Each lap starts just off the visible left edge and ends just past the right one. */
	function startLap({ startInView = false } = {}) {
		const visible = visibleRangeOf(svg);
		const startX = startInView ? visible.left + 0.06 * (visible.right - visible.left) : visible.left - 20;
		walk.distance = route.distanceAtX(startX);
		walk.endDistance = route.distanceAtX(visible.right + 25);
		walk.pausedOnBridge = startX >= scene.trail.bridge.x;
		walk.birdsFlushed = startX >= scene.forest.x - 30;
	}

	function moveHiker(dt: number) {
		if (walk.restLeft > 0) {
			walk.restLeft -= dt;
			if (walk.restLeft <= 0) startLap();
			return;
		}

		const here = route.at(walk.distance);
		const figureScale = HIKER_SIZE * perspective(here.z);

		if (walk.pauseLeft > 0) {
			walk.pauseLeft -= dt;
			walk.stride = approach(walk.stride, 0, dt * 3);
		} else {
			walk.stride = approach(walk.stride, 1, dt * 2);
			// Slower uphill, and slower on screen the further away
			const ahead = route.at(walk.distance + 3);
			const climb = Math.max(0, (here.y - ahead.y) / 3);
			const step = ((WALK_SPEED * perspective(here.z)) / (1 + 3 * climb)) * dt;
			walk.distance += step;
			walk.phase += (step / figureScale / STEP_LENGTH) * Math.PI;
		}

		if (!walk.pausedOnBridge && here.x >= scene.trail.bridge.x) {
			walk.pausedOnBridge = true;
			walk.pauseLeft = BRIDGE_PAUSE_SECONDS;
		}
		if (!walk.birdsFlushed && here.x >= scene.forest.x - 30) {
			walk.birdsFlushed = true;
			birds.push(...flushBirds(scene.trees, here.x));
		}
		if (walk.distance >= walk.endDistance) walk.restLeft = REST_BETWEEN_LAPS_SECONDS;

		poseHiker(hiker, walk.phase, walk.stride);
		hiker.group.setAttribute(
			"transform",
			`translate(${here.x.toFixed(2)},${here.y.toFixed(2)}) scale(${figureScale.toFixed(3)})`,
		);
		const layer = layerOf(here.z + ABOVE_STREAM_LIFT);
		if (layer !== walk.layer) {
			layers[layer]?.appendChild(hiker.group);
			walk.layer = layer;
		}
	}

	let lastTime: number | undefined;
	let frameId = 0;
	function frame(time: number) {
		const dt = lastTime === undefined ? 0 : Math.min(0.1, (time - lastTime) / 1000);
		lastTime = time;
		moveHiker(dt);
		if (flock) moveBirds(birds, flock, dt);
		frameId = requestAnimationFrame(frame);
	}

	// The hiker is on screen and walking from the first frame, wherever the screen crops the scene
	startLap({ startInView: true });
	moveHiker(0);
	frameId = requestAnimationFrame(frame);

	return { stop: () => cancelAnimationFrame(frameId) };
}

/** The slice of the scene that is actually on screen: phones crop the sides. */
function visibleRangeOf(svg: SVGSVGElement) {
	const { width, height } = svg.getBoundingClientRect();
	if (!width || !height) return { left: 0, right: VIEW_WIDTH };
	const visibleWidth = width / Math.max(width / VIEW_WIDTH, height / VIEW_HEIGHT);
	return { left: (VIEW_WIDTH - visibleWidth) / 2, right: (VIEW_WIDTH + visibleWidth) / 2 };
}

/** The trail as the hiker walks it: positions on screen, measured by distance along the way. */
function traceRoute({ trail }: Scene) {
	const points: { x: number; y: number; z: number; distance: number }[] = [];
	let distance = 0;
	for (let x = TRAIL_START; x <= TRAIL_END; x += ROUTE_STEP) {
		const z = trail.zAt(x);
		const y = screenY(z, trail.surfaceAt(x));
		const previous = points.at(-1);
		if (previous) distance += Math.hypot(x - previous.x, y - previous.y);
		points.push({ x, y, z, distance });
	}

	function at(target: number) {
		const wanted = clamp(target, 0, distance);
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
		points[clamp(Math.round((x - TRAIL_START) / ROUTE_STEP), 0, points.length - 1)].distance;

	return { at, length: distance, distanceAtX };
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(name: K, className: string) {
	const element = document.createElementNS(SVG_NS, name);
	element.setAttribute("class", className);
	return element;
}

// ---------------------------------------------------------------------------
// The hiker
// ---------------------------------------------------------------------------

const HIKER_PARTS = ["pole", "armBack", "legBack", "pack", "body", "legFront", "armFront", "head"] as const;
type HikerPart = (typeof HIKER_PARTS)[number];

interface HikerFigure {
	group: SVGGElement;
	/** Each part is drawn twice: a paper-coloured halo beneath, then the ink line */
	parts: Record<HikerPart, SVGElement[]>;
}

function createHikerFigure(): HikerFigure {
	const group = createSvgElement("g", "hiker");
	const halos: SVGElement[] = [];
	const inks: SVGElement[] = [];
	const parts = {} as Record<HikerPart, SVGElement[]>;
	for (const name of HIKER_PARTS) {
		const shape = name === "head" ? "circle" : "path";
		const filled = name === "pack" || name === "head" ? `${name}` : "";
		const halo = createSvgElement(shape, `halo ${filled}`.trim());
		const ink = createSvgElement(shape, filled);
		halos.push(halo);
		inks.push(ink);
		parts[name] = [halo, ink];
	}
	// Halos go first so every ink line sits above every halo
	for (const element of [...halos, ...inks]) group.appendChild(element);
	return { group, parts };
}

/** Poses the stick figure in its own units: feet on y = 0, about 12 units tall, facing right. */
function poseHiker({ parts }: HikerFigure, phase: number, stride: number) {
	const hip: Point = [0, -5.2];
	const shoulder: Point = [0.75, -9.3];
	const fromAngle = ([x, y]: Point, length: number, angle: number): Point => [
		x + length * Math.sin(angle),
		y + length * Math.cos(angle),
	];

	function leg(offset: number): Point[] {
		const swing = phase + offset;
		const thigh = 0.42 * stride * Math.sin(swing);
		// The knee bends as the leg swings forward
		const kneeBend = 0.8 * stride * Math.max(0, Math.cos(swing));
		const knee = fromAngle(hip, 2.7, thigh);
		const foot = fromAngle(knee, 2.6, thigh - kneeBend);
		return [hip, knee, foot, [foot[0] + 0.8, foot[1]]];
	}

	const frontLeg = leg(0);
	const backLeg = leg(Math.PI);
	// Keep the lower foot on the ground, which gives the walk its bob
	const lift = -Math.max(frontLeg[2][1], backLeg[2][1]);
	const line = (points: Point[]) => `M${points.map(([x, y]) => `${x.toFixed(2)},${(y + lift).toFixed(2)}`).join(" L")}`;

	const backArmAngle = -0.55 * stride * Math.sin(phase + Math.PI);
	const backElbow = fromAngle(shoulder, 2.0, backArmAngle);
	const backHand = fromAngle(backElbow, 1.9, backArmAngle + 0.5);

	const poleArmAngle = 0.5 + 0.3 * stride * Math.sin(phase);
	const poleElbow = fromAngle(shoulder, 2.0, poleArmAngle);
	const poleHand = fromAngle(poleElbow, 1.7, poleArmAngle + 1.0);
	const poleTip: Point = [poleHand[0] + 1.5 + 0.8 * stride * Math.sin(phase), -lift];

	const shapes: Record<Exclude<HikerPart, "head">, string> = {
		pole: line([[poleHand[0] - 0.3, poleHand[1] - 1.1], poleTip]),
		armBack: line([shoulder, backElbow, backHand]),
		legBack: line(backLeg),
		pack: `${line([
			[-1.9, -9.7],
			[0.2, -9.9],
			[0.55, -6.1],
			[-1.6, -5.9],
		])} Z`,
		body: line([hip, shoulder, [0.95, -9.9]]),
		legFront: line(frontLeg),
		armFront: line([shoulder, poleElbow, poleHand]),
	};
	for (const [name, d] of Object.entries(shapes) as [HikerPart, string][]) {
		for (const element of parts[name]) element.setAttribute("d", d);
	}
	for (const element of parts.head) {
		element.setAttribute("cx", "1.05");
		element.setAttribute("cy", (-11.05 + lift).toFixed(2));
		element.setAttribute("r", "1.25");
	}
}

// ---------------------------------------------------------------------------
// The birds
// ---------------------------------------------------------------------------

interface Bird {
	x: number;
	y: number;
	vx: number;
	vy: number;
	delay: number;
	age: number;
	wing: number;
	burstFlapRate: number;
	cruiseFlapRate: number;
	element?: SVGPathElement;
}

const randomBetween = (a: number, b: number) => a + (b - a) * Math.random();

/** Five to seven birds burst from the tallest trees near the hiker, mostly heading one way. */
function flushBirds(trees: Tree[], hikerX: number): Bird[] {
	const treeTop = (tree: Tree) => tree.y - tree.height;
	const nearby = trees
		.filter((tree) => Math.abs(tree.x - hikerX) < 150)
		.sort((a, b) => treeTop(a) - treeTop(b))
		.slice(0, 14)
		.sort(() => Math.random() - 0.5);
	const count = Math.min(nearby.length, 5 + Math.floor(Math.random() * 3));
	const heading = Math.random() < 0.6 ? 1 : -1;

	return nearby.slice(0, count).map((tree) => ({
		x: tree.x + randomBetween(-2, 2),
		y: tree.y - tree.height * 0.8,
		vx: heading * randomBetween(14, 30) + randomBetween(-6, 6),
		vy: -randomBetween(38, 55),
		delay: randomBetween(0, 0.5),
		age: 0,
		wing: randomBetween(0, Math.PI * 2),
		burstFlapRate: randomBetween(20, 26),
		cruiseFlapRate: randomBetween(11, 14),
	}));
}

/**
 * Birds burst out of the canopy, level off below the top edge and fly away into the distance:
 * they shrink and fade rather than leaving the frame. Their wings never stop.
 */
function moveBirds(birds: Bird[], flock: SVGGElement, dt: number) {
	const flying = birds.filter((bird) => bird.element);
	const centreX = flying.reduce((sum, bird) => sum + bird.x, 0) / (flying.length || 1);
	const centreY = flying.reduce((sum, bird) => sum + bird.y, 0) / (flying.length || 1);

	for (let i = birds.length - 1; i >= 0; i--) {
		const bird = birds[i];
		if (!bird.element) {
			bird.delay -= dt;
			if (bird.delay > 0) continue;
			bird.element = createSvgElement("path", "bird");
			flock.appendChild(bird.element);
		}

		bird.age += dt;
		const distanceScale = 1 / (1 + 0.45 * bird.age);

		bird.vy = Math.min(bird.vy + 26 * dt, -4);
		if (flying.length > 1) {
			bird.vx += (centreX - bird.x) * 0.25 * dt;
			bird.vy += (centreY - bird.y) * 0.25 * dt;
		}
		// Level off before the top edge instead of flying out of the frame
		const headroom = Math.max(0, bird.y - BIRD_CEILING_Y);
		const climb = Math.max(bird.vy, -headroom * 1.5);
		bird.x += bird.vx * distanceScale * dt;
		bird.y += climb * distanceScale * dt;

		const flapRate = lerp(bird.cruiseFlapRate, bird.burstFlapRate, smoothstep(2, 0.6, bird.age));
		bird.wing += flapRate * dt;
		const lift = (Math.sin(bird.wing) * 0.8 + 0.25) * BIRD_SPAN;
		const opacity = smoothstep(BIRD_FADE_SCALE.gone, BIRD_FADE_SCALE.solid, distanceScale);

		bird.element.setAttribute("d", birdPath(lift));
		bird.element.setAttribute("opacity", opacity.toFixed(2));
		bird.element.setAttribute(
			"transform",
			`translate(${bird.x.toFixed(1)},${bird.y.toFixed(1)}) scale(${distanceScale.toFixed(3)})`,
		);

		if (distanceScale <= BIRD_FADE_SCALE.gone) {
			bird.element.remove();
			birds.splice(i, 1);
		}
	}
}

/** A gull-wing "v": wing tips up when lift is positive, down when negative. */
function birdPath(lift: number) {
	const span = BIRD_SPAN;
	const control = -lift * 0.3 - span * 0.35;
	return (
		`M${-span},${(-lift).toFixed(2)} Q${(-span * 0.45).toFixed(2)},${control.toFixed(2)} 0,0 ` +
		`Q${(span * 0.45).toFixed(2)},${control.toFixed(2)} ${span},${(-lift).toFixed(2)}`
	);
}
