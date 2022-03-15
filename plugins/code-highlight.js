import './setupPrismJs.js';
import Prism from 'prismjs';

import 'prism-svelte';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-yaml.js';
import 'prismjs/components/prism-jsx.js';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-sql.js';
import 'prismjs/components/prism-scss.js';
import 'prismjs/components/prism-sass.js';
import 'prismjs/components/prism-diff.js';
import 'prismjs/plugins/diff-highlight/prism-diff-highlight.js';
import { createShikiHighlighter, renderCodeToHTML, runTwoSlash } from 'shiki-twoslash';
import * as shiki from 'shiki';

Prism.languages['diff-js'] = Prism.languages['diff'];
Prism.languages['diff-svelte'] = Prism.languages['diff'];
Prism.languages['sh'] = Prism.languages['bash'];

const TO_REMOVE_LINE = {};

const includes = new Map();

const SHIKI_BUNDLED_LANGUAGE = new Set(
	shiki.BUNDLED_LANGUAGES.flatMap((_) => [_.id].concat(_.aliases))
);
// NOTE: svelte has issue with parsing on:event attribute
SHIKI_BUNDLED_LANGUAGE.delete('svelte');

/**
 *
 * @param {string} code
 * @param {string} lang
 * @returns {string}
 */
export default async function highlight(code, lang, meta) {
	lang = lang ?? '';
	meta = meta ?? '';
	if (lang === 'twoslash') {
		let match = meta.match(/^include (.+)$/);
		if (match) {
			addIncludes(includes, match[1], code);
		}
		return '';
	}
	if (lang.startsWith('diff-') && SHIKI_BUNDLED_LANGUAGE.has(lang.slice(5))) {
		lang = lang.slice(5);
		meta = meta + ' diff';
	}

	const options = parseMeta(code, lang, meta);

	code = code.replace(/\/\/\/ (.+?): (.+)\n/gm, (match, key, value) => {
		value = value.trim();
		try {
			value = JSON.parse(value);
		} catch {}
		options[key] = value;
		return '';
	});

	code = parseSpecialComments(code, options);

	let originalCode = code;

	if (options.cutLines > 0) {
		const cutCode = code.split('\n').slice(options.cutLines).join('\n');
		if (!options.twoslash) originalCode = code = cutCode;
		// if twoslash, let `twoslash` cut the code, as uncut code is useful for types
		else originalCode = cutCode;
	}

	if (options.diff) {
		options.lineOptions = options.lineOptions ?? [];
		code = code
			.split('\n')
			.map((line, index) => {
				if (line[0] === '+' || line[0] === '-') {
					options.lineOptions.push({
						line: index + 1,
						classes: [line[0] === '+' ? 'inserted' : 'deleted']
					});
					line = ' ' + line.slice(1);
				}
				return line;
			})
			.join('\n');

		originalCode = originalCode
			.split('\n')
			.map((line) => {
				// remove the first character / padding
				if (line[0] === '+' || line[0] === ' ') return line.slice(1);
				else if (line[0] === '-') return TO_REMOVE_LINE;
				return line;
			})
			.filter((line) => line !== TO_REMOVE_LINE)
			.join('\n');
	}

	if (options.twoslash) {
		code = replaceIncludesInCode(includes, code);
	}

	let html;
	if ((lang === 'js' || lang === 'ts') && options.twoslash) {
		const twoSlash = runTwoSlash(code, lang, {
			defaultCompilerOptions: {
				allowJs: true,
				checkJs: true,
				target: 'es2021',
				lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'],
				types: ['node', 'jest']
			}
		});
		const highlighter = await createShikiHighlighter({ theme: 'css-variables' });
		html = renderCodeToHTML(twoSlash.code, 'ts', options, {}, highlighter, twoSlash);
	} else if (SHIKI_BUNDLED_LANGUAGE.has(lang)) {
		const highlighter = await getShikiHighlighter(lang);
		html = highlighter.codeToHtml(code, options);
	} else if (Prism.languages[lang]) {
		const highlighted = highlightWrap(
			Prism.highlight(code, Prism.languages[lang], lang),
			options.lineOptions
		);
		html = `<pre class="prism language-${lang}"><code>${highlighted}</code></pre>`;
	} else {
		html = `<pre class="prism language-${lang}"><code>${basicHighlight(
			code,
			options
		)}</code></pre>`;
	}

	const extras = [];
	if (options.filename) {
		extras.push(`<div class="filename">${options.filename}</div>`);
	}
	if (options.copy) {
		extras.push(
			`<div class="copy" data-copy="${originalCode}"><svg viewBox="64 64 896 896" focusable="false" data-icon="copy" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M832 64H296c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h496v688c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8V96c0-17.7-14.3-32-32-32zM704 192H192c-17.7 0-32 14.3-32 32v530.7c0 8.5 3.4 16.6 9.4 22.6l173.3 173.3c2.2 2.2 4.7 4 7.4 5.5v1.9h4.2c3.5 1.3 7.2 2 11 2H704c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32zM350 856.2L263.9 770H350v86.2zM664 888H414V746c0-22.1-17.9-40-40-40H232V264h432v624z"></path></svg></div>`
		);
	}

	html = `{@html \`${escape_svelty(extras.join('') + html)}\`}`;
	return `<div class="code-section">${html}</div>`;
}

function escape_svelty(str) {
	return str
		.replace(/[{}`]/g, (c) => ({ '{': '&#123;', '}': '&#125;', '`': '&#96;' }[c]))
		.replace(/\\([trn])/g, '&#92;$1');
}

// inspired from https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-remark-prismjs/src/directives.js

const HIGHLIGHT_DIRECTIVE = new RegExp(`highlight-(next-line|line|start|end|range)({([^}]+)})?`);
const MULTILINE_TOKEN_SPAN = /<span class="token ([^"]+)">[^<]*\n[^<]*<\/span>/g;
const cutString = /^\s*\/\/ ---cut---/;

function highlightWrap(code, lineOptions) {
	// HACK split multiline spans with line separators inside into multiple spans
	// separated by line separator - this fixes line highlighting behaviour for
	//  - plain-text in jsx,
	//  - tripple-quoted-string in python,
	//  - comment in c-like languages (including javascript), etc.
	code = code.replace(MULTILINE_TOKEN_SPAN, (match, token) =>
		match.replace(/\n/g, `</span>\n<span class="token ${token}">`)
	);

	const getClass = getLineClass(lineOptions);
	const lines = code.split('\n');

	return lines.map((line, index) => `<div class="${getClass(index)}">${line}</div>`).join('');
}

const matchHtmlRegExp = /["'&<>]/;

function escapeHtml(string) {
	var str = '' + string;
	var match = matchHtmlRegExp.exec(str);

	if (!match) {
		return str;
	}

	var escape;
	var html = '';
	var index = 0;
	var lastIndex = 0;

	for (index = match.index; index < str.length; index++) {
		switch (str.charCodeAt(index)) {
			case 34: // "
				escape = '&quot;';
				break;
			case 38: // &
				escape = '&amp;';
				break;
			case 39: // '
				escape = '&#39;';
				break;
			case 60: // <
				escape = '&lt;';
				break;
			case 62: // >
				escape = '&gt;';
				break;
			default:
				continue;
		}

		if (lastIndex !== index) {
			html += str.substring(lastIndex, index);
		}

		lastIndex = index + 1;
		html += escape;
	}

	return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
}

// includes system
// copied from https://github.com/shikijs/twoslash/blob/main/packages/remark-shiki-twoslash/src/includes.ts
/**
 *
 * @param {Map<string, string>} map
 * @param {string} name
 * @param {string} code
 */
function addIncludes(map, name, code) {
	/** @type {string[]} */
	const lines = [];

	code.split('\n').forEach((l, _i) => {
		const trimmed = l.trim();

		if (trimmed.startsWith('// - ')) {
			const key = trimmed.split('// - ')[1].split(' ')[0];
			map.set(name + '-' + key, lines.join('\n'));
		} else {
			lines.push(l);
		}
	});
	map.set(name, lines.join('\n'));
}

/**
 *
 * @param {Map<string, string>} _map
 * @param {string} code
 * @returns
 */
function replaceIncludesInCode(_map, code) {
	const includes = /\/\/ @include: (.*)$/gm;

	// Basically run a regex over the code replacing any // @include: thing with
	// 'thing' from the map

	// const toReplace: [index:number, length: number, str: string][] = []
	const toReplace = [];

	let match;
	while ((match = includes.exec(code)) !== null) {
		// This is necessary to avoid infinite loops with zero-width matches
		if (match.index === includes.lastIndex) {
			includes.lastIndex++;
		}
		const key = match[1];
		const replaceWith = _map.get(key);

		if (!replaceWith) {
			const msg = `Could not find an include with the key: '${key}'.\nThere is: ${Array.from(
				_map.keys()
			)}.`;
			throw new Error(msg);
		}

		toReplace.push([match.index, match[0].length, replaceWith]);
	}

	let newCode = code.toString();
	// Go backwards through the found changes so that we can retain index position
	toReplace.reverse().forEach((r) => {
		newCode = newCode.substring(0, r[0]) + r[2] + newCode.substring(r[0] + r[1]);
	});
	return newCode;
}

/**
 * @param {string} code
 * @param {string} lang
 * @param {string} meta
 */
function parseMeta(code, lang, meta) {
	const options = { lang };
	const highlight = {};
	meta = meta.replace(/\{([0-9, -]+)\}/, (_, hl) => {
		hl.split(/[ ,]/).forEach((part) => {
			if (part) highlight[part] = true;
		});
		return '';
	});
	meta.split(' ').forEach((part) => {
		options[part] = true;
	});
	const highlightRange = parseHighlightFence(highlight);
	if (highlightRange.size > 0) {
		options.highlight = highlight;
		options.lineOptions = [];
		const lines = code.split('\n').length;
		for (let i = 0; i < lines; i++) {
			options.lineOptions.push({
				line: i + 1,
				classes: [highlightRange.has(i) ? 'highlight' : 'dim']
			});
		}
	}

	return options;
}

/**
 *
 * @param {Record<string, boolean>} highlightRange eg: { '1': true, '4-5': true }
 * @returns {Set<number>} 0-based line number
 */
function parseHighlightFence(highlightRange) {
	const toHighlight = new Set();
	if (typeof highlightRange === 'object') {
		// populate from the fence meta
		for (const key of Object.keys(highlightRange)) {
			if (key.indexOf('-') > -1) {
				const [start, end] = key.split('-').map(Number);
				for (let i = start; i <= end; i++) {
					toHighlight.add(i - 1);
				}
			} else {
				toHighlight.add(Number(key) - 1);
			}
		}
	}
	return toHighlight;
}

function parseSpecialComments(code, options) {
	let offset = 0;
	let start = false;
	let numLinesLeft = 0;
	let cutLines = 0;
	const toHighlight = new Set();

	code = code
		.split('\n')
		.map((line, index) => {
			if (HIGHLIGHT_DIRECTIVE.test(line)) {
				const [, directive, directiveRange] = line.match(HIGHLIGHT_DIRECTIVE);
				switch (directive) {
					case 'next-line':
						toHighlight.add(index - offset++);
						break;
					case 'start':
						start = index - offset++;
						break;
					case 'end': {
						const end = index - offset++;
						for (let i = start; i < end; i++) {
							toHighlight.add(i);
						}
						break;
					}
				}
				return TO_REMOVE_LINE;
			} else {
				numLinesLeft++;
			}
			if (cutString.test(line)) {
				cutLines = index - offset + 1;
			}
			return line;
		})
		.filter((line) => line !== TO_REMOVE_LINE)
		.join('\n');

	if (toHighlight.size > 0) {
		options.lineOptions = options.lineOptions ?? [];
		options.highlight = options.highlight ?? {};
		for (let i = 0; i < numLinesLeft; i++) {
			const line = i + 1 - cutLines;
			options.lineOptions.push({
				line,
				classes: [toHighlight.has(i) ? 'highlight' : 'dim']
			});
			if (toHighlight.has(i)) options.highlight[line] = true;
		}
	}
	if (cutLines > 0) {
		options.cutLines = cutLines;
	}
	return code;
}

function basicHighlight(code, options) {
	const getClass = getLineClass(options.lineOptions);

	return code
		.split('\n')
		.map((line, index) => {
			return `<span class="${getClass(index)}">${escapeHtml(line)}</span>`;
		})
		.join('\n');
}

function getLineClass(lineOptions) {
	const classMap = new Map();
	lineOptions?.forEach?.(({ line, classes }) => {
		if (!classMap.has(line)) classMap.set(line, new Set());
		const set = classMap.get(line);
		classes.forEach((clz) => set.add(clz));
	});

	return (index) => ['line'].concat(Array.from(classMap.get(index + 1) ?? [])).join(' ');
}

// shiki higlighter cache
const shikiCache = new Map();
/**
 *
 * @param {string} lang
 * @returns {Promise<shiki.Highlighter>}
 */
function getShikiHighlighter(lang) {
	if (!shikiCache.has(lang)) {
		shikiCache.set(lang, shiki.getHighlighter({ theme: 'css-variables', languages: [lang] }));
	}
	return shikiCache.get(lang);
}
