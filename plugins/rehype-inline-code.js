import { visit } from 'unist-util-visit';
import path from 'path';

// add `inline` class to inline-code
export default function inlineCode() {
	return async (tree) => {
		visit(tree, [{ type: 'element', tagName: 'code' }], (node) => {
			node.properties['class'] = 'inline';
		});
	};
}
