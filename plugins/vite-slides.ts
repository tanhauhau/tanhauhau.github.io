import fs from 'fs/promises';

export default function viteSlides({
	includes = []
}: {
	includes?: RegExp[];
} = {}): import('vite').Plugin {
	const cache = new Map();
	const fileCache = new Set<string>();

	return {
		name: 'vite-slides',
		enforce: 'pre',
		async load(id) {
			// console.log("load", id);
			const { filename, rawQuery } = splitId(id);
			const query = parseQuery(rawQuery);
			if (query.svelte) {
				// console.log({ id, fileCache, has: fileCache.has(filename) });
				if (query.type === 'style' && fileCache.has(filename)) {
					// console.log('!!!!!!!');
					return '';
				}
				return null;
			}

			if (query.page) {
				return cache.get(filename)[Number(query.page)];
			}

			if (includes.some((regex) => regex.test(id))) {
				fileCache.add(filename);
				const code = await fs.readFile(id, 'utf-8');
				return transform({ code, id, cache });
			}
		},
		handleHotUpdate(ctx) {
			if (includes.some((regex) => regex.test(ctx.file))) {
				const oldRead = ctx.read;
				ctx.read = async () => {
					const code = await oldRead();
					return transform({ code, id: ctx.file, cache });
				};
			}
		}
	};
}

function splitId(id: string) {
	const parts = id.split(`?`, 2);
	const filename = parts[0];
	const rawQuery = parts[1];
	return { filename, rawQuery };
}

function parseQuery(rawQuery: string) {
	const query = Object.fromEntries(new URLSearchParams(rawQuery));
	for (const key in query) {
		if (query[key] === '') {
			query[key] = true;
		}
	}
	return query;
}

function transform({ id, code, cache }) {
	const pages = code
		.split('+++\n')
		.map((page) => page.trim())
		.filter(Boolean);

	cache.set(id, pages);

	return [
		'---',
		'layout: slide',
		'---',
		'<script>',
		...pages.map((_, index) => `import Slides${index} from '${id}?page=${index}';`),
		'',
		'const slides = [',
		...pages.map((_, index) => `Slides${index}, `),
		'];',
		`import Slide from '$lib/slides/Slides.svelte';`,
		'</script>',
		'<Slide {slides} />'
	].join('\n');
}
