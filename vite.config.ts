import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { imagetools } from 'vite-imagetools';
import viteSlides from './plugins/vite-slides.js';

export default defineConfig({
	plugins: [
		sveltekit(),
		imagetools(),
		viteSlides({
			includes: [/\/slides\/[^/]+\/\+page\.mdx$/]
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
});
