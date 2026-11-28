/**
 * Waypoints as EmDash stores them in a walk's or trip's `waypoints` blocks
 * field, and the edits the waypoint editor makes to them. Every edit returns a
 * new list and keeps fields it doesn't know about (videos, photo layout, …).
 */
import type { MediaItem } from "@emdash-cms/admin";
import { fileUrl } from "../../../lib/media";

/** The `waypoint` block type version in seed/seed.json */
const WAYPOINT_BLOCK_VERSION = 1;
const COORDINATE_DECIMALS = 5;

export interface PhotoValue {
	id: string;
	provider?: string;
	src?: string;
	alt?: string;
	width?: number;
	height?: number;
	meta?: Record<string, unknown>;
	[field: string]: unknown;
}

export interface WaypointPhoto {
	_key: string;
	image: PhotoValue;
	[field: string]: unknown;
}

export interface Waypoint {
	_type: "waypoint";
	_version: number;
	_key: string;
	title?: string;
	latitude?: number | null;
	longitude?: number | null;
	icon?: string;
	text?: string;
	images?: WaypointPhoto[];
	[field: string]: unknown;
}

export interface Position {
	latitude: number;
	longitude: number;
}

export function waypointsFrom(value: unknown): Waypoint[] {
	if (!Array.isArray(value)) return [];
	return value.filter(
		(item): item is Waypoint => typeof item === "object" && item !== null && item._type === "waypoint",
	);
}

export function positionOf(waypoint: Waypoint): Position | undefined {
	const { latitude, longitude } = waypoint;
	if (typeof latitude !== "number" || typeof longitude !== "number") return undefined;
	return { latitude, longitude };
}

export function photosOf(waypoint: Waypoint): WaypointPhoto[] {
	return Array.isArray(waypoint.images) ? waypoint.images : [];
}

export function newKey(): string {
	return crypto.randomUUID().replaceAll("-", "").slice(0, 12);
}

export function newWaypoint(): Waypoint {
	return { _type: "waypoint", _version: WAYPOINT_BLOCK_VERSION, _key: newKey(), title: "", icon: "pin" };
}

export function updateWaypoint(waypoints: Waypoint[], key: string, changes: Partial<Waypoint>): Waypoint[] {
	return waypoints.map((waypoint) => (waypoint._key === key ? { ...waypoint, ...changes } : waypoint));
}

export function placeWaypoint(waypoints: Waypoint[], key: string, { latitude, longitude }: Position): Waypoint[] {
	const round = (value: number) => Number(value.toFixed(COORDINATE_DECIMALS));
	return updateWaypoint(waypoints, key, { latitude: round(latitude), longitude: round(longitude) });
}

export function removeWaypoint(waypoints: Waypoint[], key: string): Waypoint[] {
	return waypoints.filter((waypoint) => waypoint._key !== key);
}

/** Moves a waypoint up (-1) or down (+1) the list, if there's room. */
export function moveWaypoint(waypoints: Waypoint[], key: string, offset: -1 | 1): Waypoint[] {
	const from = waypoints.findIndex((waypoint) => waypoint._key === key);
	const to = from + offset;
	if (from < 0 || to < 0 || to >= waypoints.length) return waypoints;
	const reordered = [...waypoints];
	[reordered[from], reordered[to]] = [reordered[to]!, reordered[from]!];
	return reordered;
}

export function addPhotos(waypoints: Waypoint[], key: string, items: MediaItem[]): Waypoint[] {
	return waypoints.map((waypoint) =>
		waypoint._key === key ? { ...waypoint, images: [...photosOf(waypoint), ...items.map(photoFromMediaItem)] } : waypoint,
	);
}

export function removePhoto(waypoints: Waypoint[], key: string, photoKey: string): Waypoint[] {
	return waypoints.map((waypoint) =>
		waypoint._key === key
			? { ...waypoint, images: photosOf(waypoint).filter((photo) => photo._key !== photoKey) }
			: waypoint,
	);
}

/** The value EmDash's own image field stores for a photo picked from the media library. */
function photoFromMediaItem(item: MediaItem): WaypointPhoto {
	const isLocal = !item.provider || item.provider === "local";
	return {
		_key: newKey(),
		image: {
			id: item.id,
			provider: isLocal ? "local" : item.provider,
			src: isLocal ? undefined : item.url,
			alt: item.alt ?? "",
			width: item.width,
			height: item.height,
			filename: item.filename,
			mimeType: item.mimeType,
			blurhash: item.blurhash,
			dominantColor: item.dominantColor,
			meta: isLocal ? { ...item.meta, storageKey: item.storageKey } : item.meta,
		},
	};
}

const THUMBNAIL_WIDTH = 240;

/**
 * A small version of a photo for the editor, resized by Cloudflare like the
 * site's photos, so a phone doesn't download every full-size original.
 */
export function thumbnailUrl(photo: PhotoValue): string | undefined {
	const original = fileUrl(photo);
	if (!original || !photo.width || !photo.height || !original.startsWith("/")) return original;
	const height = Math.round((THUMBNAIL_WIDTH * photo.height) / photo.width);
	const href = encodeURIComponent(new URL(original, window.location.origin).href);
	return `/_image?href=${href}&w=${THUMBNAIL_WIDTH}&h=${height}&f=webp&q=75&fit=cover&position=center`;
}
