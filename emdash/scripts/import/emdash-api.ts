/**
 * The few EmDash REST calls the importer needs. (emdash/client's `update`
 * can't set taxonomies, and its `mediaUpload` can't name the field a file
 * is for, which GeoJSON needs to pass the upload allowlist.)
 *
 * Auth: EMDASH_TOKEN, or the token `emdash login --url <url>` saved in
 * ~/.config/emdash/auth.json, refreshed (and saved back) when it expires.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const AUTH_FILE = join(homedir(), ".config", "emdash", "auth.json");

export interface MediaItem {
	id: string;
	url: string;
	filename: string;
	mimeType: string;
	size?: number;
	width?: number | null;
	height?: number | null;
}

export interface ContentItem {
	id: string;
	slug: string;
	status: string;
}

interface StoredLogin {
	accessToken: string;
	refreshToken?: string;
	expiresAt?: string;
}

const TRANSIENT_STATUSES = new Set([502, 503, 504]);
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseJson(text: string): any {
	if (!text) return {};
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

class ApiError extends Error {
	readonly status: number;
	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

export class EmDashApi {
	readonly #baseUrl: string;
	#login: StoredLogin;

	constructor(baseUrl: string) {
		this.#baseUrl = baseUrl.replace(/\/$/, "");
		const token = process.env.EMDASH_TOKEN;
		this.#login = token ? { accessToken: token } : EmDashApi.#savedLogin(this.#baseUrl);
	}

	static #savedLogin(baseUrl: string): StoredLogin {
		try {
			const login = JSON.parse(readFileSync(AUTH_FILE, "utf8"))[baseUrl];
			if (login?.accessToken) return login;
		} catch {}
		throw new Error(`Not logged in to ${baseUrl}: run \`emdash login --url ${baseUrl}\` or set EMDASH_TOKEN`);
	}

	async #refresh(): Promise<boolean> {
		if (!this.#login.refreshToken) return false;
		const response = await fetch(`${this.#baseUrl}/_emdash/api/oauth/token/refresh`, {
			method: "POST",
			headers: { "Content-Type": "application/json", "X-EmDash-Request": "1" },
			body: JSON.stringify({ grant_type: "refresh_token", refresh_token: this.#login.refreshToken }),
		});
		if (!response.ok) return false;
		const body = await response.json();
		const token = body.data ?? body;
		this.#login = {
			...this.#login,
			accessToken: token.access_token,
			refreshToken: token.refresh_token ?? this.#login.refreshToken,
			...(token.expires_in ? { expiresAt: new Date(Date.now() + token.expires_in * 1000).toISOString() } : {}),
		};
		// Refresh tokens can rotate: save them so the CLI login keeps working
		const saved = JSON.parse(readFileSync(AUTH_FILE, "utf8"));
		saved[this.#baseUrl] = { ...saved[this.#baseUrl], ...this.#login };
		writeFileSync(AUTH_FILE, JSON.stringify(saved, null, 2), { mode: 0o600 });
		return true;
	}

	async #send(method: string, path: string, body?: unknown): Promise<Response> {
		const isForm = body instanceof FormData;
		return fetch(`${this.#baseUrl}/_emdash/api${path}`, {
			method,
			headers: {
				Authorization: `Bearer ${this.#login.accessToken}`,
				"X-EmDash-Request": "1",
				...(body && !isForm ? { "Content-Type": "application/json" } : {}),
			},
			body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
		});
	}

	/**
	 * Sends a request, refreshing the login on a 401 and retrying transient
	 * failures: on Workers Free a cold request can exceed the 10 ms CPU limit
	 * and come back as a 503 "error code: 1102" page instead of JSON.
	 */
	async #request<T>(method: string, path: string, body?: unknown): Promise<T> {
		let refreshed = false;
		for (let attempt = 1; ; attempt++) {
			const response = await this.#send(method, path, body);
			if (response.status === 401 && !refreshed && (await this.#refresh())) {
				refreshed = true;
				continue;
			}
			const text = await response.text();
			const json = parseJson(text);
			if (json === undefined || TRANSIENT_STATUSES.has(response.status)) {
				if (attempt < MAX_ATTEMPTS) {
					await sleep(RETRY_DELAY_MS * attempt);
					continue;
				}
				// Cloudflare's error pages name the limit hit, e.g. "Error 1102"
				const cloudflareError = /Error (?:code:? )?(\d{4})/.exec(text)?.[1];
				const detail = cloudflareError ? `Cloudflare error ${cloudflareError}` : text.slice(0, 120);
				throw new ApiError(response.status, `${method} ${path}: ${response.status} ${detail}`);
			}
			if (!response.ok) {
				throw new ApiError(response.status, `${method} ${path}: ${response.status} ${JSON.stringify(json.error ?? json)}`);
			}
			return (json.data ?? json) as T;
		}
	}

	/** Field IDs by slug for a collection (uploads name the field they're for). */
	async fieldIds(collection: string): Promise<Record<string, string>> {
		const { item } = await this.#request<{ item: { fields: { id: string; slug: string }[] } }>(
			"GET",
			`/schema/collections/${collection}?includeFields=true`,
		);
		return Object.fromEntries(item.fields.map((field) => [field.slug, field.id]));
	}

	/**
	 * Uploads a file; EmDash returns the existing item when the same bytes were
	 * uploaded before. For images, pass the dimensions and a small thumbnail
	 * (as the admin does): EmDash then builds the blurhash placeholder from the
	 * thumbnail instead of decoding the whole photo, which exceeds Workers
	 * Free's 10 ms CPU limit for photos over ~50 KB.
	 */
	async upload(
		file: Blob,
		filename: string,
		options: { fieldId?: string; width?: number; height?: number; thumbnail?: Blob } = {},
	): Promise<MediaItem> {
		const form = new FormData();
		form.append("file", file, filename);
		if (options.fieldId) form.append("fieldId", options.fieldId);
		if (options.width && options.height) {
			form.append("width", String(options.width));
			form.append("height", String(options.height));
		}
		if (options.thumbnail) form.append("thumbnail", options.thumbnail, `thumbnail-${filename}`);
		const { item } = await this.#request<{ item: MediaItem }>("POST", "/media", form);
		return item;
	}

	async find(collection: string, slug: string): Promise<ContentItem | undefined> {
		try {
			const { item } = await this.#request<{ item: ContentItem }>("GET", `/content/${collection}/${slug}`);
			return item;
		} catch (error) {
			if (error instanceof ApiError && error.status === 404) return undefined;
			throw error;
		}
	}

	async create(collection: string, input: Record<string, unknown>): Promise<ContentItem> {
		const { item } = await this.#request<{ item: ContentItem }>("POST", `/content/${collection}`, input);
		return item;
	}

	async update(collection: string, id: string, input: Record<string, unknown>): Promise<ContentItem> {
		const { item } = await this.#request<{ item: ContentItem }>("PUT", `/content/${collection}/${id}`, {
			...input,
			overrideLock: true,
		});
		return item;
	}

	async publish(collection: string, id: string, publishedAt: string): Promise<void> {
		await this.#request("POST", `/content/${collection}/${id}/publish`, { publishedAt, overrideLock: true });
	}

	async termSlugs(taxonomy: string): Promise<Set<string>> {
		const { terms } = await this.#request<{ terms: { slug: string }[] }>("GET", `/taxonomies/${taxonomy}/terms`);
		return new Set(terms.map((term) => term.slug));
	}

	async createTerm(taxonomy: string, slug: string): Promise<void> {
		await this.#request("POST", `/taxonomies/${taxonomy}/terms`, { slug, label: slug.replace(/-/g, " ") });
	}
}
