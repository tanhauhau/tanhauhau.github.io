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

Prism.languages['diff-js'] = Prism.languages['diff'];
Prism.languages['diff-svelte'] = Prism.languages['diff'];
Prism.languages['sh'] = Prism.languages['bash'];

/**
 * 
 * @param {string} code 
 * @param {string} lang 
 * @returns {string}
 */
export default function highlight(code, lang) {
	if (Prism.languages[lang]) {
		const highlighted = highlightWrap(Prism.highlight(code, Prism.languages[lang], lang));
		return `<pre class="language-${lang}">{@html \`<code class="language-${
			lang || ''
		}">${escape_svelty(highlighted)}</code>\`}</pre>`;
	} else {
		return `<pre class="language-${lang}">{@html \`<code class="language-${
			lang || ''
		}">${escape_svelty(escapeHtml(code))}</code>\`}</pre>`;
	}
}

function escape_svelty(str) {
	return str
		.replace(/[{}`]/g, (c) => ({ '{': '&#123;', '}': '&#125;', '`': '&#96;' }[c]))
		.replace(/\\([trn])/g, '&#92;$1');
}

// inspired from https://github.com/gatsbyjs/gatsby/blob/master/packages/gatsby-remark-prismjs/src/directives.js

const HIGHLIGHTED_JSX_COMMENT_START = `<span class="token punctuation">\\{<\\/span><span class="token comment">\\/\\*`;
const HIGHLIGHTED_JSX_COMMENT_END = `\\*\\/<\\/span><span class="token punctuation">\\}</span>`;
const HIGHLIGHTED_HTML_COMMENT_START = `&lt;!--`;

const PRISMJS_COMMENT_OPENING_SPAN_TAG = `(<span\\sclass="token\\scomment">)?`;
const PRISMJS_COMMENT_CLOSING_SPAN_TAG = `(<\\/span>)?`;

const COMMENT_START = new RegExp(`(#|\\/\\/|\\{\\/\\*|\\/\\*+|${HIGHLIGHTED_HTML_COMMENT_START})`);

const createDirectiveRegExp = (featureSelector) =>
	new RegExp(`${featureSelector}-(next-line|line|start|end|range)({([^}]+)})?`);

const COMMENT_END = new RegExp(`(-->|\\*\\/\\}|\\*\\/)?`);
const HIGHLIGHT_DIRECTIVE = createDirectiveRegExp(`highlight`);

const END_DIRECTIVE = /highlight-end/;

const MULTILINE_TOKEN_SPAN = /<span class="token ([^"]+)">[^<]*\n[^<]*<\/span>/g;

function highlightWrap(code) {
	const toHighlight = new Set();
	const toHide = new Set();

	if (HIGHLIGHT_DIRECTIVE.test(code)) {
		// HACK split multiline spans with line separators inside into multiple spans
		// separated by line separator - this fixes line highlighting behaviour for
		//  - plain-text in jsx,
		//  - tripple-quoted-string in python,
		//  - comment in c-like languages (including javascript), etc.
		code = code.replace(MULTILINE_TOKEN_SPAN, (match, token) =>
			match.replace(/\n/g, `</span>\n<span class="token ${token}">`)
		);
	}
	const lines = code.split('\n');

	for (let i = 0; i < lines.length; i++) {
		if (HIGHLIGHT_DIRECTIVE.test(lines[i])) {
			const [, directive, directiveRange] = lines[i].match(HIGHLIGHT_DIRECTIVE);
			switch (directive) {
				case 'next-line':
					toHide.add(i);
					toHighlight.add(i + 1);
					break;
				case 'start': {
					let end = i + 1;
					while (end < lines.length && !END_DIRECTIVE.test(lines[end])) end++;
					toHide.add(i);
					toHide.add(end);
					for (let j = i + 1; j < end; j++) {
						toHighlight.add(j);
					}
				}
			}
		}
	}

	return lines
		.map((line, index) => {
			if (toHighlight.has(index)) return `<span class="prism-highlight-code-line">${line}</span>`;
			return line;
		})
		.filter((line, index) => !toHide.has(index))
		.join('\n');
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
