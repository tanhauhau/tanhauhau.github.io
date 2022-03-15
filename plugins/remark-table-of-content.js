export default function tableOfContents() {
	function toHtml(headings) {
		const html = [
			'<section><ul class="sitemap" id="sitemap" role="navigation" aria-label="Table of Contents">'
		];
		let previousDepth = 2;
		for (const heading of headings) {
			let { depth } = heading;
			while (depth > previousDepth) {
				html.push('<ul>');
				previousDepth++;
			}
			while (depth < previousDepth) {
				html.push('</ul>');
				previousDepth--;
			}
			html.push(`<li><a href="#${heading.link}">${heading.title}</a></li>`);
			previousDepth = depth;
		}
		html.push('</ul></section>');
		return html.join('');
	}

	return (tree) => {
		const titles = [];
		const indexes = [];
		tree.children.forEach((node, index) => {
			if (node.type !== 'heading') return;
			indexes.push(index);
			const { link, title } = getLinkAndTitle(node.children);
			if (!link || !title) {
				throw new Error('unable to get link or title');
			}
			titles.push({ title, link, depth: node.depth });
			node.children.unshift({
				type: 'html',
				value: `<a href="#${link}" id="${link}">`
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
			tree.children.splice(tree.children[0].type === 'yaml' ? 1 : 0, 0, {
				type: 'html',
				value: toHtml(titles)
			});
		}
	};
}

function getLinkAndTitle(children) {
	function getParts(children) {
		return children.map((child) => {
			if (child.type === 'text') {
				return child.value;
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
		.replace(/[^a-z]+/g, '-')
		.replace(/(^-|-$)/g, '');
	const title = parts.join(' ');

	return { link, title };
}
