import { execSync } from 'child_process';
import path, { dirname } from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const GIT_URL = 'git@github.com:tanhauhau/tanhauhau.github.io.git';
const __dirname = dirname(fileURLToPath(import.meta.url));

(async function () {
	const cacheFolder = path.join(__dirname, '../.publish/tanlihau');
	const outputFolder = path.join(__dirname, '../docs');
	if (!(await fs.exists(cacheFolder))) {
		await fs.mkdirp(cacheFolder);
		exec(
			`git clone ${GIT_URL} ${cacheFolder} --branch master --single-branch --origin origin --depth 1`
		);
	}

	// clean cache folder
	exec('git clean -df');

	exec('git checkout master');

	// make sure branch is always up to date
	exec('git fetch origin master');
	exec('git reset --hard origin/master');

	exec('git rm -rf .');

	const files = await fs.readdir(outputFolder);
	for (const file of files) {
		await fs.copy(path.join(outputFolder, file), path.join(cacheFolder, file));
	}

	exec('git add .');
	exec(`git config user.email "lhtan93@gmail.com"`);
	exec(`git config user.name "Github Actions"`);
	exec(`git commit -m "Built on ${String(new Date())}"`);
	exec('git push origin master');

	function exec(cmd) {
		console.log(chalk.dim(cmd));
		execSync(cmd, { cwd: cacheFolder });
	}
})();
