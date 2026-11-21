/**
 * LaTeX to MathML on the server. Browsers render MathML natively, so pages
 * need no MathJax, no KaTeX stylesheet and no maths fonts.
 */
import katex from "katex";

/** First code point of each Unicode "Mathematical Alphanumeric Symbols" run. */
const ALPHANUMERIC_RUNS: Record<string, { upper: number; lower: number; digit: number }> = {
	bold: { upper: 0x1d400, lower: 0x1d41a, digit: 0x1d7ce },
	"double-struck": { upper: 0x1d538, lower: 0x1d552, digit: 0x1d7d8 },
};

/** Double-struck capitals that predate the run and live in Letterlike Symbols. */
const LETTERLIKE: Record<string, string> = {
	C: "ℂ",
	H: "ℍ",
	N: "ℕ",
	P: "ℙ",
	Q: "ℚ",
	R: "ℝ",
	Z: "ℤ",
};

function styledCharacter(character: string, variant: string): string {
	const run = ALPHANUMERIC_RUNS[variant];
	if (!run) return character;
	if (variant === "double-struck" && LETTERLIKE[character]) return LETTERLIKE[character];

	const code = character.charCodeAt(0);
	if (character >= "A" && character <= "Z") return String.fromCodePoint(run.upper + code - 65);
	if (character >= "a" && character <= "z") return String.fromCodePoint(run.lower + code - 97);
	if (character >= "0" && character <= "9") return String.fromCodePoint(run.digit + code - 48);
	return character;
}

/**
 * MathML Core (Chrome) ignores `mathvariant` other than "normal", so \mathbf
 * and \mathbb would render as plain letters. Swap in the styled characters.
 */
function applyMathVariants(mathml: string): string {
	return mathml.replace(
		/<(mi|mn) mathvariant="(bold|double-struck)">([A-Za-z0-9]+)<\/\1>/g,
		(_match, tag: string, variant: string, text: string) =>
			`<${tag}>${[...text].map((character) => styledCharacter(character, variant)).join("")}</${tag}>`,
	);
}

export function renderMath(latex: string, { display }: { display: boolean }): string {
	const mathml = katex.renderToString(latex, {
		displayMode: display,
		output: "mathml",
		throwOnError: false,
	});
	return applyMathVariants(mathml);
}
