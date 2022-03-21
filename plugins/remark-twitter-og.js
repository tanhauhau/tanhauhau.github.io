import { visit } from 'unist-util-visit';
import fs from 'fs/promises';
import path from 'path';

const HERO_TWITTER = './hero-twitter.jpg';
const VARIABLE_NAME = '__twitter_og__';

export default function twitterOg(options) {
	return async (tree, vfile) => {
		if (options.exclude.test(vfile.filename)) return;

		const hasHeroImage = await fileExists(path.join(vfile.filename, '..', HERO_TWITTER));
		const imgPath = hasHeroImage ? HERO_TWITTER : '$lib/assets/twitter-card-image.jpg';
		const code = [
			"import { setContext } from 'svelte'; ",
			`import ${VARIABLE_NAME} from "${imgPath}";`,
			`setContext('blog', { image: ${VARIABLE_NAME} });`
		].join('\n');

		vfile.data.scripts = vfile.data.scripts ?? [];
		vfile.data.scripts.push(code);
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
