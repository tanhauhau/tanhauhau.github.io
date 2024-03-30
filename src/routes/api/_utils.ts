import fs from 'fs/promises';
import path from 'path';

let BUILD_CACHE;

export async function getContent(options: {
	filter?: {
		label?: Frontmatter['label'][];
		series?: string;
		tag?: Frontmatter['tags'];
	};
	field?: keyof Frontmatter;
	sort?: 'asc' | 'desc';
}) {
	let result;
	if (process.env.LIHAUTAN_BUILD && BUILD_CACHE) {
		result = BUILD_CACHE;
	} else {
		const folder = path.join(__PROJECT_ROOT__, 'src/routes/(blog)');
		const folders = await fs.readdir(folder);
		const blogs = await Promise.all(
			folders.map(async (url) => {
				try {
					const filepath = path.join(folder, url, '+page.md');
					const content = await fs.readFile(filepath, 'utf8');
					const [, frontmatter] = /---([\s\S]+?)---/m.exec(content);
					const result = parseFrontmatter(frontmatter.split('\n'));
					result.url = trailingSlash('/' + url);
					return result;
				} catch {
					// ignore
				}
			})
		);
		const noteFolder = path.join(__PROJECT_ROOT__, 'src/routes/(blog)/notes');
		const noteFolders = await fs.readdir(noteFolder);
		const notes = await Promise.all(
			noteFolders.map(async (url) => {
				try {
					const filepath = url.endsWith('.md')
						? path.join(noteFolder, url)
						: path.join(noteFolder, url, '+page.md');
					const content = await fs.readFile(filepath, 'utf8');
					const [, frontmatter] = /---([\s\S]+?)---/m.exec(content);
					const result = parseFrontmatter(frontmatter.split('\n'));
					result.label = 'note';
					result.url = trailingSlash('/notes/' + url.replace('.md', ''));
					return result;
				} catch {
					// ignore
				}
			})
		);
		result = [...blogs, ...notes];
	}
	if (process.env.LIHAUTAN_BUILD) {
		BUILD_CACHE = result;
	}

	let filteredResult: Frontmatter[];
	if (options.filter) {
		filteredResult = [];
		const labelRegex = options.filter.label
			? new RegExp(`^(${options.filter.label.join('|')})$`, 'i')
			: /.*/;
		const tagRegex = options.filter.tag
			? new RegExp(`^(${options.filter.tag.join('|')})$`, 'i')
			: /.*/;
		for (const item of result) {
			if (!item || item.wip) continue;
			if (options.filter.label && (!item.label || !labelRegex.test(item.label))) continue;
			if (options.filter.series && item.series !== options.filter.series) continue;
			if (options.filter.tag && (!item.tags || !item.tags.some((tag) => tagRegex.test(tag))))
				continue;
			filteredResult.push(item);
		}
	} else {
		filteredResult = result.filter((item) => item && !item.wip);
	}

	if (options.field) {
		const set = new Set();
		for (const item of filteredResult) {
			const value = item[options.field];
			if (Array.isArray(value)) value.forEach((v) => set.add(v));
			else if (value) set.add(value);
		}
		return Array.from(set);
	}

	const sortDirections = options.sort ?? 'desc';
	const sorter: (a: Frontmatter, b: Frontmatter) => number =
		sortDirections === 'asc'
			? (a, b) => (a.date > b.date ? 1 : -1)
			: (a, b) => (a.date > b.date ? -1 : 1);

	return filteredResult.sort(sorter);
}

type Frontmatter = {
	title: string;
	date: string;
	lastUpdated: string;
	description: string;
	label: 'blog' | 'talk' | 'note';
	url: string;
	tags?: string[];
	wip: boolean;
	series: string;
};

function parseFrontmatter(lines: string[]): Frontmatter {
	const result = {};
	let lastKey;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line.indexOf(':') > -1) {
			const index = line.indexOf(':');
			const key = line.slice(0, index).trim();
			const value = line.slice(index + 1).trim();
			result[key] = value.replace(/(^["']|["']$)/g, '');
			lastKey = key;
		} else if (line.startsWith('  -')) {
			const array = [];
			let j;
			for (j = i; j < lines.length; j++) {
				if (!lines[j].startsWith('  -')) break;
				array.push(lines[j].replace(/^\s+-\s*/, ''));
			}
			result[lastKey] = array;
			i = j - 1;
		}
	}
	return result as Frontmatter;
}

function trailingSlash(url: string) {
	if (url[url.length - 1] !== '/') url = url + '/';
	return url;
}
