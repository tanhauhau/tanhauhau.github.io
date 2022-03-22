import { visit } from 'unist-util-visit';
import path from 'path';

const CHARACTERS = 200;

// generate frontmatter `description` as an excerpt from the content
export default function description() {
	return async (tree, vfile) => {
		if (vfile.data.fm.description) return;
		vfile.data.fm.description = getExcerpt(tree.children, CHARACTERS);
	};
}

function getExcerpt(children, max) {
	let chunks = [];
	let count = 0;

	function addStr(str) {
		chunks.push(str);
		count += str.length;
		return count > max;
	}

	function getParts(children) {
		for (const child of children) {
			if (child.type === 'text') {
				if (addStr(child.value)) return true;
			} else if (child.type === 'inlineCode') {
				if (addStr('`' + child.value + '`')) return true;
			} else if (child.children) {
				if (getParts(child.children)) return true;
			} else {
				// do nothing
			}
		}
	}
	getParts(children);
	return chunks.join('') + '...';
}
