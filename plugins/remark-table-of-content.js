export default function tableOfContents(options) {
	return function (tree, { filename, data }) {
		if (options.exclude.test(filename)) return;

		if (data?.fm?.toc === false) return;

		const titles = [];
		const indexes = [];
		const links = new Set();
		tree.children.forEach((node, index) => {
			if (node.type !== 'heading') return;
			indexes.push(index);
			const { link, title } = getLinkAndTitle(node.children);
			if (!link || !title) {
				throw new Error('unable to get link or title');
			}
			const uniqueLink = makeLinkUnique(link, links);
			titles.push({ title, link: uniqueLink, depth: node.depth });
			node.children.unshift({
				type: 'html',
				value: `<a href="#${uniqueLink}" id="${uniqueLink}">`
			});
			node.children.push({
				type: 'html',
				value: '</a>'
			});
		});
		let offset = 0;
		let isStart = true;

		for (const idx of indexes) {
			if (!isStart) {
				tree.children.splice(idx + offset++, 0, {
					type: 'html',
					value: '</section>'
				});
			}
			tree.children.splice(idx + offset++, 0, {
				type: 'html',
				value: '<section>'
			});
			isStart = false;
		}
		if (indexes.length) {
			tree.children.splice(tree.children.length, 0, {
				type: 'html',
				value: '</section>'
			});
		}

		if (titles.length) {
			data.scripts = data.scripts ?? [];
			data.scripts.push(`import RemarkTableOfContent from '$lib/TableOfContent.svelte';`);
			tree.children.splice(tree.children[0].type === 'yaml' ? 1 : 0, 0, {
				type: 'html',
				value: `<RemarkTableOfContent data={${JSON.stringify(toData(titles))}} />`
			});
		}
	};
}

function getLinkAndTitle(children) {
	function getParts(children) {
		return children.map((child) => {
			if (child.type === 'text') {
				return child.value;
			} else if (child.type === 'inlineCode') {
				return '`' + child.value + '`';
			} else if (child.children) {
				return getParts(child.children);
			} else {
				return '';
			}
		});
	}

	const parts = getParts(children).flat(Number.POSITIVE_INFINITY).filter(Boolean);

	const link = parts
		.map((part) => part.toLowerCase())
		.join(' ')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
	const title = parts.join(' ');

	return { link, title };
}

function makeLinkUnique(link, links) {
	let i = 1;
	let unique = link;
	while (links.has(unique)) {
		unique = link + '-' + i++;
	}
	links.add(unique);
	return unique;
}

/**
 *
 * @param {Array<{depth: number, link: string, title: string}>} titles
 */
function toData(titles) {
	let previousDepth = titles[0].depth;
	const stack = [];
	stack[previousDepth] = [];

	for (const { link, title, depth } of titles) {
		while (depth < previousDepth) {
			stack.pop();
			previousDepth--;
		}
		if (depth > previousDepth + 1) {
			throw new Error(
				`remark-table-of-contents: heading should not jump depth (${previousDepth}) -> "${title}" (${depth})`
			);
		}

		if (!Array.isArray(stack[depth])) {
			const list = stack[depth - 1];
			if (!list) {
				throw new Error(`remark-table-of-contents: "${title}" (${depth})`);
			}
			const nested = [];
			list[list.length - 1].nested = nested;
			stack.push(nested);
		}
		stack[depth].push({ link, title });
		previousDepth = depth;
	}
	return stack[2];
}
