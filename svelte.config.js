import preprocess from 'svelte-preprocess';
import { mdsvex } from 'mdsvex';
import remarkShikiTwoslash from 'remark-shiki-twoslash';
import remarkTableOfContents from './plugins/remark-table-of-content.js';
import remarkImageExternal from './plugins/remark-image-external.js';
import remarkTwitterOg from './plugins/remark-twitter-og.js';
import adapter from '@sveltejs/adapter-static';
import customCodeHighlight from './plugins/code-highlight.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { imagetools } from 'vite-imagetools';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: [
		preprocess(),
		mdsvex({
			smartypants: false,
			extensions: ['.svx', '.md'],
			remarkPlugins: [
				remarkTableOfContents,
				remarkImageExternal,
				remarkTwitterOg,
				[remarkShikiTwoslash, { theme: 'dark-plus' }]
			],
			layout: {
				talk: './src/lib/TalkLayout.svelte',
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
			precompress: false
		}),

		prerender: {
			entries: ['*', '/rss.xml']
		},
		vite: {
			plugins: [imagetools()],
			define: {
				__PROJECT_ROOT__: JSON.stringify(path.dirname(fileURLToPath(import.meta.url)))
			},
			server: {
				fs: {
					strict: false
				}
			}
		}
	},
	extensions: ['.svelte', '.md']
};

export default config;
