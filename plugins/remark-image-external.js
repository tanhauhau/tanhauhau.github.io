import { visit } from 'unist-util-visit';
import { imageSize } from 'image-size';
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

// this is set as the width of the `<main>` component
const MAX_WIDTH = 675;

export default function imageExternal() {
	const srcWidth = MAX_WIDTH;
	const srcWidth2X = MAX_WIDTH * 2;

	return (tree, vfile) => {
		let i = 0;
		const imports = [];

		visit(tree, ['image', 'imageReference'], (node) => {
			if (/^https?\:\/\//.test(node.url)) return;
			const { url } = node;
			const alt = node.alt ? encodeHtml(node.alt) : '';
			const title = node.title ? encodeHtml(node.title) : '';
			const type = IMAGE_TYPES[path.extname(url)];
			if (!type) {
				throw new Error(`Unsupported image type ${path.extname(url)}`);
			}

			const supportsWebp = canSupportsWebpConversion(url);
			const query = new URLSearchParams();
			query.set('w', srcWidth);
			imports.push(`import __build_img__${i} from '${url}?${query.toString()}'`);
			query.set('w', srcWidth2X);
			imports.push(`import __build_img__${i}_2x from '${url}?${query.toString()}'`);

			const imagePath = path.join(vfile.filename, '..', url);
			const { height, width } = imageSize(imagePath);
			const aspectRatio = ((height / width) * 100).toFixed(3) + '%';

			const imageTagAttributes = [
				// TODO: data-src for using lazysizes?
				`src="{__build_img__${i}}"`,
				`srcset="{__build_img__${i}}, {__build_img__${i}_2x} 2x"`,
				`loading="lazy"`,
				`style="position: absolute; top: 0; width: 100%; height: 100%"`
			];
			if (alt) imageTagAttributes.push(`alt="${alt}"`);
			if (title) imageTagAttributes.push(`title="${title}"`);
			const imgTag = `<img ${imageTagAttributes.join(' ')} />`;

			let html;
			if (supportsWebp) {
				imports.push(`import __build_img_webp__${i} from '${url}?format=webp&w=${srcWidth}'`);
				imports.push(`import __build_img_webp__${i}_2x from '${url}?format=webp&w=${srcWidth2X}'`);
				html = [
					'<picture>',
					`<source type="image/webp" srcset="{__build_img_webp__${i}}, {__build_img_webp__${i}_2x} 2x" />`,
					imgTag,
					'</picture>'
				].join('');
			} else {
				html = imgTag;
			}

			// padding top trick to preserve space
			html = `<span style="display: block; position: relative; padding-top: ${aspectRatio}; width: 100%;">${html}</span>`;

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
