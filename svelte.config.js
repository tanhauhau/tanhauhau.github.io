import preprocess from 'svelte-preprocess';
import { mdsvex } from 'mdsvex';
import remarkTableOfContents from './plugins/remark-table-of-content.js';
import remarkImageExternal from './plugins/remark-image-external.js';
import remarkTwitterOg from './plugins/remark-twitter-og.js';
import adapter from '@sveltejs/adapter-static';
import customPrismHighlight from './plugins/prism-highlight.js';
import path from 'path';
import { fileURLToPath } from 'url';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: [
		preprocess(),
		mdsvex({
			smartypants: false,
			extensions: ['.svx', '.md'],
			remarkPlugins: [remarkTableOfContents, remarkImageExternal, remarkTwitterOg],
			layout: {
				talk: './src/lib/TalkLayout.svelte',
				_: './src/lib/BlogLayout.svelte'
			},
			highlight: {
				highlighter: customPrismHighlight
			}
		})
	],

	kit: {
		adapter: adapter({
			// default options are shown
			pages: 'docs',
			assets: 'docs',
			fallback: null,
			precompress: false
		}),

		// hydrate the <div id="svelte"> element in src/app.html
		target: '#svelte',
		prerender: {
			crawl: false,
			entries: [
				'*',
				'/rss.xml',
			]
		},
		vite: {
			define: {
				__PROJECT_ROOT__: JSON.stringify(path.dirname(fileURLToPath(import.meta.url)))
			}
		}
	},
	extensions: ['.svelte', '.md']
};

export default config;
