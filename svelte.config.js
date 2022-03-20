import preprocess from 'svelte-preprocess';
import { mdsvex } from 'mdsvex';
import remarkTableOfContents from './plugins/remark-table-of-content.js';
import remarkImageExternal from './plugins/remark-image-external.js';
import remarkTwitterOg from './plugins/remark-twitter-og.js';
import rehypeInlineCode from './plugins/rehype-inline-code.js';
import adapter from '@sveltejs/adapter-static';
import customCodeHighlight from './plugins/code-highlight.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { imagetools } from 'vite-imagetools';
import viteSlides from './plugins/vite-slides.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: [
		preprocess(),
		mdsvex({
			smartypants: false,
			extensions: ['.svx', '.md', '.mdx'],
			remarkPlugins: [
				[remarkTableOfContents, { exclude: /\/slides\// }],
				remarkImageExternal,
				[remarkTwitterOg, { exclude: /\/slides\// }]
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
			default: true,
			entries: ['*', '/rss.xml', '/series', '/tags'],
			crawl: true
		},
		routes: (filepath) => !/(?:(?:^_|\/_)|(?:^\.|\/\.)(?!well-known)|(\/_\/))/.test(filepath),
		vite: {
			plugins: [
				imagetools(),
				viteSlides({
					includes: [/\/slides\/[^/]+\/index\.mdx$/]
				})
			],
			define: {
				__PROJECT_ROOT__: JSON.stringify(path.dirname(fileURLToPath(import.meta.url)))
			},
			server: {
				fs: {
					strict: false
				}
			}
		},
		trailingSlash: 'always'
	},
	extensions: ['.svelte', '.md', '.mdx']
};

export default config;
