#!/usr/bin/env node
// A stand-in for the parts of Strava's API the site uses: OAuth sign-in, the
// athlete's activity list, one activity, and an activity's GPS streams. The
// test server points the site at it (STRAVA_ORIGIN in e2e/serve.sh), so tests
// run offline with known activities.
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 8790);

const SEVEN_SISTERS = [
	[50.7695, 0.2819],
	[50.7378, 0.2421],
	[50.7412, 0.2032],
	[50.7558, 0.1527],
	[50.7713, 0.1395],
];

export const ACTIVITIES = [
	activity(1001, "Seven Sisters", "Walk", "2022-08-14T09:00:00Z", 11_234, 10_800, SEVEN_SISTERS),
	activity(1002, "Morning run", "Run", "2022-08-14T07:00:00Z", 5_012, 1_620, SEVEN_SISTERS.slice(0, 2)),
	activity(1003, "Box Hill and the stepping stones", "Hike", "2021-05-02T10:30:00Z", 8_900, 9_000, SEVEN_SISTERS),
];

function activity(id, name, sportType, startDate, distance, movingTime, points) {
	return {
		id,
		name,
		sport_type: sportType,
		start_date: startDate,
		// The fixtures happen in the UK in summer: an hour ahead of UTC
		start_date_local: new Date(Date.parse(startDate) + 3_600_000).toISOString().replace(".000", ""),
		distance,
		moving_time: movingTime,
		map: { summary_polyline: encodePolyline(points) },
		points,
	};
}

/** Google's polyline encoding, as Strava uses for summary_polyline. */
function encodePolyline(points) {
	let previous = [0, 0];
	let encoded = "";
	for (const point of points) {
		const scaled = point.map((value) => Math.round(value * 1e5));
		for (const index of [0, 1]) {
			let delta = scaled[index] - previous[index];
			delta = delta < 0 ? ~(delta << 1) : delta << 1;
			while (delta >= 0x20) {
				encoded += String.fromCharCode((0x20 | (delta & 0x1f)) + 63);
				delta >>= 5;
			}
			encoded += String.fromCharCode(delta + 63);
		}
		previous = scaled;
	}
	return encoded;
}

const summary = ({ points: _points, ...rest }) => rest;

function listActivities(query) {
	const after = Number(query.get("after") ?? 0);
	const before = Number(query.get("before") ?? Number.MAX_SAFE_INTEGER);
	const perPage = Number(query.get("per_page") ?? 30);
	const page = Number(query.get("page") ?? 1);
	return ACTIVITIES.filter((item) => {
		const started = Date.parse(item.start_date) / 1000;
		return started > after && started < before;
	})
		.toSorted((a, b) => Date.parse(b.start_date) - Date.parse(a.start_date))
		.slice((page - 1) * perPage, page * perPage)
		.map(summary);
}

function respond(response, status, body, headers = {}) {
	response.writeHead(status, { "Content-Type": "application/json", ...headers });
	response.end(body === undefined ? "" : JSON.stringify(body));
}

createServer((request, response) => {
	const url = new URL(request.url ?? "/", `http://localhost:${port}`);
	const path = url.pathname;

	if (path === "/oauth/authorize") {
		// Strava asks the athlete to approve, then sends them back with a code
		const back = new URL(url.searchParams.get("redirect_uri") ?? "");
		back.searchParams.set("code", "fake-authorization-code");
		back.searchParams.set("state", url.searchParams.get("state") ?? "");
		back.searchParams.set("scope", "read,activity:read_all");
		return respond(response, 302, undefined, { Location: back.href });
	}
	if (path === "/oauth/token" && request.method === "POST") {
		return respond(response, 200, {
			access_token: "fake-access-token",
			refresh_token: "fake-refresh-token",
			expires_at: Math.floor(Date.now() / 1000) + 6 * 3600,
			athlete: { firstname: "Test", lastname: "Walker" },
		});
	}
	if (request.headers.authorization !== "Bearer fake-access-token") {
		return respond(response, 401, { message: "Authorization Error" });
	}
	if (path === "/api/v3/athlete/activities") {
		return respond(response, 200, listActivities(url.searchParams));
	}
	const match = path.match(/^\/api\/v3\/activities\/(\d+)(\/streams)?$/);
	const found = match && ACTIVITIES.find((item) => item.id === Number(match[1]));
	if (!found) return respond(response, 404, { message: "Record Not Found" });
	if (match[2]) {
		return respond(response, 200, {
			latlng: { data: found.points },
			altitude: { data: found.points.map((_, index) => 10 + index) },
		});
	}
	return respond(response, 200, summary(found));
}).listen(port, () => console.log(`Fake Strava on http://localhost:${port}`));
