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
			const link = node.children
				.map((child) => (child.type !== 'html' && child.value ? child.value.toLowerCase() : ''))
				.filter(Boolean)
				.join(' ')
				.replace(/[^a-z]+/g, '-')
				.replace(/(^-|-$)/g, '');
			titles.push({
				title: node.children
					.map((child) => (child.type !== 'html' && child.value ? child.value : ''))
					.join(' '),
				link,
				depth: node.depth
			});
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
