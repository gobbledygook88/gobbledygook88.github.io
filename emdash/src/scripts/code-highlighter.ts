/**
 * Syntax highlighting in the reader's browser. Highlighting on the server
 * took up to ~500 ms of CPU per post, far beyond the Workers Free plan's
 * 10 ms per request. Loaded only on pages that contain code.
 */
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import latex from "highlight.js/lib/languages/latex";
import protobuf from "highlight.js/lib/languages/protobuf";
import python from "highlight.js/lib/languages/python";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
// The theme the old site used
import "highlight.js/styles/base16/solarized-light.css";

const LANGUAGES = { bash, c, cpp, css, javascript, json, latex, protobuf, python, xml, yaml };
for (const [name, language] of Object.entries(LANGUAGES)) hljs.registerLanguage(name, language);

/** Names stored on code blocks that highlight.js spells differently */
const ALIASES: Record<string, string> = { "c++": "cpp", proto: "protobuf", html: "xml", sh: "bash", shell: "bash" };

export function highlightCodeBlocks(root: ParentNode = document) {
	for (const code of root.querySelectorAll<HTMLElement>("pre code[data-language]")) {
		const requested = code.dataset.language ?? "";
		const language = ALIASES[requested] ?? requested;
		if (!hljs.getLanguage(language)) continue;
		code.classList.add(`language-${language}`);
		hljs.highlightElement(code);
	}
}

highlightCodeBlocks();
