import { visit } from 'unist-util-visit';

export default function imageExternal() {
	const map = { ["'"]: '&#39;', ['"']: '&#34;' };
	return (tree) => {
		let i = 0;
		const imports = [];

		visit(tree, ['image', 'imageReference'], (node) => {
			if (/^https?\:\/\//.test(node.url)) return;
			const { url } = node;
			imports.push(`import __build_img__${i} from '${node.url}'`);
			node.url = `{__build_img__${i}}`;
			if (node.title) {
				node.title = node.title.replace(/['"]/g, (value) => map[value]);
			}
			if (node.alt) {
				node.alt = node.alt.replace(/['"]/g, (value) => map[value]);
			}

			// if (/\.(jpg|png)$/.test(url)) {
			// 	node.type = 'html';
			// 	node.value = [
			// 		'<picture>',
			// 		`<source type="image/webp" srcset="{__build_img_webp__${i}}" />`,
			// 		`<source type="image/jpeg" srcset="${node.url}" />`,
			// 		`<img title="${node.title}" alt="${node.alt}" data-src="${node.url}" loading="lazy" />`,
			// 		'</picture>'
			// 	].join('');

			// 	imports.push(`import __build_img_webp__${i} from '${url}'`);
			// } else {
			node.type = 'html';
			// node.value = `<img title="${node.title}" alt="${node.alt}" data-src="${node.url}" loading="lazy" />`;
			node.value = `<img title="${node.title}" alt="${node.alt}" src="${node.url}" loading="lazy" />`;
			// }

			i++;
		});

		tree.children.push({
			type: 'html',
			value: ['<script context="module">', ...imports, '</script>'].join('\n')
		});
	};
}
