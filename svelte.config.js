import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import remarkTableOfContents from './plugins/remark-table-of-content.js';
import remarkImageExternal from './plugins/remark-image-external.js';
import remarkTwitterOg from './plugins/remark-twitter-og.js';
import remarkScript from './plugins/remark-script.js';
import remarkDescription from './plugins/remark-description.js';
import rehypeInlineCode from './plugins/rehype-inline-code.js';
import adapter from '@sveltejs/adapter-static';
import customCodeHighlight from './plugins/code-highlight.js';
import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: [
		vitePreprocess(),
		mdsvex({
			smartypants: false,
			extensions: ['.svx', '.md', '.mdx'],
			remarkPlugins: [
				remarkDescription,
				[remarkTableOfContents, { exclude: /\/slides\// }],
				remarkImageExternal,
				[remarkTwitterOg, { exclude: /\/slides\// }],
				remarkScript
			],
			rehypePlugins: [rehypeInlineCode],
			layout: {
				talk: './src/lib/TalkLayout.svelte',
				slide: './src/lib/SlideLayout.svelte',
				_: './src/lib/BlogLayout.svelte'
			},
			highlight: {
				highlighter: customCodeHighlight
			}
		})
	],

	kit: {
		adapter: adapter({
			// default options are shown
			pages: 'docs',
			assets: 'docs',
			fallback: null,
			// NOTE? fallback 404 page?
			// fallback: '404.html',
			precompress: false
		}),

		prerender: {
			entries: ['*', '/rss.xml', '/series', '/tags'],
			handleMissingId: 'warn',
		},
		paths: {
			assets: 'https://lihautan.com'
		}
		// routes: (filepath) => !/(?:(?:^_|\/_)|(?:^\.|\/\.)(?!well-known)|(\/_\/))/.test(filepath),
		// trailingSlash: 'always'
	},
	extensions: ['.svelte', '.md', '.mdx', '.svx']
};

export default config;
