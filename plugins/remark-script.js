import { visit } from 'unist-util-visit';

export default function remarkScript(options) {
	return async (tree, vfile) => {
		const code = vfile.data.scripts?.join?.('\n');
		if (code) {
			const nodeToInsert = tree.children.find(
				(node) => node.type === 'html' && /^\s*<script>/.test(node.value)
			);
			if (nodeToInsert) {
				nodeToInsert.value = nodeToInsert.value.replace('<script>', '<script>' + code + '\n');
			} else {
				tree.children.push({
					type: 'html',
					value: '<script>' + code + '</script>'
				});
			}
		}
	};
}
