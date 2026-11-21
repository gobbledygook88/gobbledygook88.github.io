/**
 * Old post bodies (Markdown with raw HTML, Jekyll tags and $$…$$ maths) to
 * Portable Text: Markdown → HTML with markdown-it, then EmDash's own
 * HTML → Portable Text converter, then fix-ups for what it doesn't know.
 */
import { htmlToPortableText } from "@emdash-cms/gutenberg-to-portable-text";
import MarkdownIt from "markdown-it";
import type { MediaFiles } from "./media-files.ts";

export type Block = { _type: string; _key?: string; [field: string]: any };

/** A file in the old site that needs uploading, by path under the site root. */
export type AssetRef = { $asset: string };

const markdown = new MarkdownIt({ html: true });
// A line break inside a paragraph is just a space in Markdown (the old site rendered it so);
// left as a newline, the Portable Text renderer would show a visible break
markdown.renderer.rules.softbreak = () => " ";

type Alignment = "left" | "center" | "right" | undefined;
const ALIGNMENT = /text-align:\s*(left|center|right)/;

/**
 * Column alignments of each table in the document, in order. The HTML
 * converter drops markdown-it's `style="text-align:…"`, so they're read from
 * the parse tokens instead. Raw HTML tables take a slot with no alignments.
 */
function tableAlignments(source: string): Alignment[][] {
	const tables: Alignment[][] = [];
	let header: Alignment[] | undefined;
	for (const token of markdown.parse(source, {})) {
		if (token.type === "html_block" && token.content.includes("<table")) tables.push([]);
		if (token.type === "thead_open") header = [];
		if (token.type === "th_open" && header) {
			header.push(ALIGNMENT.exec(token.attrGet("style") ?? "")?.[1] as Alignment);
		}
		if (token.type === "thead_close" && header) {
			tables.push(header);
			header = undefined;
		}
	}
	return tables;
}

function withAlignments(table: Block, alignments: Alignment[]): Block {
	if (!alignments.some(Boolean)) return table;
	return {
		...table,
		rows: table.rows.map((row: Block) => ({
			...row,
			cells: row.cells.map((cell: Block, column: number) =>
				alignments[column] ? { ...cell, textAlign: alignments[column] } : cell,
			),
		})),
	};
}

/** Shiki's names for languages the old posts' `language-…` classes spell differently. */
const LANGUAGE_NAMES: Record<string, string> = { "c++": "cpp", protobuf: "proto" };

const POST_URL = /\{%\s*post_url\s+\d{4}-\d{2}-\d{2}-([^\s%]+)\s*%\}/g;
const RAW_TAG = /\{%\s*(?:end)?raw\s*%\}\r?\n?/g;
const DISPLAY_OR_INLINE_MATH = /\$\$([\s\S]+?)\$\$/g;
const MATH_PLACEHOLDER = /MATHPLACEHOLDER(\d+)X/g;

let keyCounter = 0;
const newKey = (prefix: string) => `${prefix}-${(keyCounter++).toString(36)}`;

/**
 * Jekyll leftovers the old Python build never processed (they show as
 * literal text on the live site), and maths, which Markdown would mangle.
 */
function preprocess(source: string, formulas: string[]): string {
	return source
		.replace(POST_URL, (_tag, slug: string) => `/blog/${slug}/`)
		.replace(RAW_TAG, "")
		.replace(DISPLAY_OR_INLINE_MATH, (_math, latex: string) => {
			formulas.push(latex.trim());
			return `MATHPLACEHOLDER${formulas.length - 1}X`;
		});
}

/** Splits text spans around maths placeholders into spans and inline `math` objects. */
function withInlineMath(children: Block[], formulas: string[]): Block[] {
	return children.flatMap((child) => {
		if (child._type !== "span" || !MATH_PLACEHOLDER.test(child.text)) return [child];
		MATH_PLACEHOLDER.lastIndex = 0;
		return child.text
			.split(MATH_PLACEHOLDER)
			.map((part: string, index: number) =>
				index % 2 === 1
					? { _type: "math", _key: newKey("math"), latex: formulas[Number(part)] }
					: part && { ...child, _key: newKey("span"), text: part },
			)
			.filter(Boolean);
	});
}

function fixUpBlock(block: Block, formulas: string[], media: MediaFiles, source: string): Block | undefined {
	if (block._type === "block") {
		const children = withInlineMath(block.children ?? [], formulas);
		// A paragraph that is nothing but one formula is display maths
		if (block.style === "normal" && !block.listItem && children.length === 1 && children[0]!._type === "math") {
			return { _type: "math", _key: block._key, latex: children[0]!.latex };
		}
		return { ...block, children };
	}

	if (block._type === "code") {
		const language = block.language?.toLowerCase();
		return {
			...block,
			code: String(block.code ?? "").replace(/\r?\n$/, ""),
			...(language ? { language: LANGUAGE_NAMES[language] ?? language } : {}),
		};
	}

	if (block._type === "image") {
		const url: string = block.asset?.url ?? block.asset?._ref ?? "";
		if (url.startsWith("/img/")) {
			const path = url.slice(1);
			if (!media.use(path, source)) return undefined;
			const { asset: _asset, ...rest } = block;
			return { ...rest, asset: { $asset: path } satisfies AssetRef };
		}
	}

	return block;
}

/** Converts an old post body (from `source`); images it shows are recorded in `media`. */
export function markdownToPortableText(body: string, media: MediaFiles, source: string): Block[] {
	if (!body.trim()) return [];
	const formulas: string[] = [];
	const markdownSource = preprocess(body, formulas);
	const alignments = tableAlignments(markdownSource);
	return (htmlToPortableText(markdown.render(markdownSource)) as Block[]).flatMap((block) => {
		const fixed = fixUpBlock(block, formulas, media, source);
		if (fixed?._type === "table") return withAlignments(fixed, alignments.shift() ?? []);
		return fixed ?? [];
	});
}
