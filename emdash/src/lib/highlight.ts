/**
 * Server-side syntax highlighting with Shiki, replacing highlight.js in the
 * browser. Only the languages the posts use are bundled, and the JavaScript
 * regex engine avoids loading WebAssembly in the Worker.
 */
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import bash from "shiki/langs/bash.mjs";
import c from "shiki/langs/c.mjs";
import cpp from "shiki/langs/cpp.mjs";
import css from "shiki/langs/css.mjs";
import html from "shiki/langs/html.mjs";
import javascript from "shiki/langs/javascript.mjs";
import json from "shiki/langs/json.mjs";
import latex from "shiki/langs/latex.mjs";
import proto from "shiki/langs/proto.mjs";
import python from "shiki/langs/python.mjs";
import yaml from "shiki/langs/yaml.mjs";
import solarizedLight from "shiki/themes/solarized-light.mjs";

const THEME = "solarized-light";

/** Names used in the old posts' `language-…` classes that Shiki spells differently. */
const LANGUAGE_ALIASES: Record<string, string> = {
	"c++": "cpp",
	sh: "bash",
	shell: "bash",
	js: "javascript",
	protobuf: "proto",
	tex: "latex",
};

let highlighter: Promise<HighlighterCore> | undefined;

function getHighlighter() {
	highlighter ??= createHighlighterCore({
		themes: [solarizedLight],
		langs: [bash, c, cpp, css, html, javascript, json, latex, proto, python, yaml],
		engine: createJavaScriptRegexEngine(),
	});
	return highlighter;
}

/** Returns a highlighted `<pre><code>` block. Unknown languages render as plain text. */
export async function highlightCode(code: string, language?: string): Promise<string> {
	const shiki = await getHighlighter();
	const requested = language?.toLowerCase() ?? "text";
	const lang = LANGUAGE_ALIASES[requested] ?? requested;
	return shiki.codeToHtml(code, {
		lang: shiki.getLoadedLanguages().includes(lang) ? lang : "text",
		theme: THEME,
	});
}
