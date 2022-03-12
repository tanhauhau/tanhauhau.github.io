import fs from 'fs/promises';
import path from 'path';

export async function getContent(type: string | string[]) {
	const types = new Set<string>(Array.isArray(type) ? type : [type]);
	const folder = path.join(__PROJECT_ROOT__, 'src/routes');
	const folders = await fs.readdir(folder);
	const result = await Promise.all(
		folders.map(async (url) => {
			try {
				const filepath = path.join(folder, url, 'index.md');
				const content = await fs.readFile(filepath, 'utf8');
				const [, frontmatter] = /---([\s\S]+?)---/m.exec(content);
				const result = parseFrontmatter(frontmatter.split('\n'));
				result.url = '/' + url;
				return result;
			} catch {
				// ignore
			}
		})
	);

	return result
		.filter((item) => !!item && !item.wip && types.has(item.label))
		.sort((a, b) => (a.date > b.date ? -1 : 1));
}

type Frontmatter = {
	title: string;
	date: string;
	lastUpdated: string;
	description: string;
	label: 'blog' | 'talk';
	url: string;
	tags?: string[];
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
