import { visit } from 'unist-util-visit';
import path from 'path';

const IMAGE_TYPES = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.gif': 'image/gif'
};

function canSupportsWebpConversion(url) {
	// cant generate .webp from .gif
	return /\.(jpg|png)$/.test(url);
}

const map = { ["'"]: '&#39;', ['"']: '&#34;' };
function encodeHtml(str) {
	return str.replace(/['"]/g, (value) => map[value]);
}

export default function imageExternal() {
	return (tree) => {
		let i = 0;
		const imports = [];

		visit(tree, ['image', 'imageReference'], (node) => {
			if (/^https?\:\/\//.test(node.url)) return;
			const { url } = node;
			const src = `{__build_img__${i}}`;
			const alt = node.alt ? encodeHtml(node.alt) : '';
			const title = node.title ? encodeHtml(node.title) : '';
			const type = IMAGE_TYPES[path.extname(url)];
			if (!type) {
				throw new Error(`Unsupported image type ${path.extname(url)}`);
			}

			const supportsWebp = canSupportsWebpConversion(url);
			const query = new URLSearchParams();
			query.set('w', '675');
			if (type === 'image/png') {
				query.set('quality', '80');
			}
			imports.push(`import __build_img__${i} from '${url}?${query.toString()}'`);

			const imageTagAttributes = [
				// TODO: data-src for using lazysizes?
				`src="${src}"`,
				`loading="lazy"`
			];
			if (alt) imageTagAttributes.push(`alt="${alt}"`);
			if (title) imageTagAttributes.push(`title="${title}"`);
			const imgTag = `<img ${imageTagAttributes.join(' ')} />`;

			let html;
			if (supportsWebp) {
				imports.push(`import __build_img_webp__${i} from '${url}?format=webp&w=675'`);
				html = [
					'<picture>',
					`<source type="image/webp" srcset="{__build_img_webp__${i}}" />`,
					`<source type="${type}" srcset="${src}" />`,
					imgTag,
					'</picture>'
				].join('');
			} else {
				html = imgTag;
			}
			node.type = 'html';
			node.value = html;
			i++;
		});

		tree.children.push({
			type: 'html',
			value: ['<script context="module">', ...imports, '</script>'].join('\n')
		});
	};
}
