import { visit } from 'unist-util-visit';
import fs from 'fs/promises';
import path from 'path';

const HERO_TWITTER = './hero-twitter.jpg';
const VARIABLE_NAME = '__twitter_og__';

export default function twitterOg() {
	return async (tree, vfile) => {
		const hasHeroImage = await fileExists(path.join(vfile.filename, '..', HERO_TWITTER));

		tree.children.push({
			type: 'html',
			value: [
				'<script>',
				"import { setContext } from 'svelte'; ",
				hasHeroImage
					? `import ${VARIABLE_NAME} from "${HERO_TWITTER}";`
					: `import ${VARIABLE_NAME} from "$lib/assets/twitter-card-image.jpg";`,
				`setContext('blog', { image: ${VARIABLE_NAME} });`,
				'</script> '
			].join('\n')
		});
	};
}

async function fileExists(filepath) {
	try {
		await fs.stat(filepath);
		return true;
	} catch {
		return false;
	}
}
