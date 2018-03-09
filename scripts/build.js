const exec = require('child_process').execSync;
const fs = require('fs');
const path = require('path');
const minify = require('html-minifier').minify;
const minifyConfig = require('../config/minify.config.js');
const chalk = require('chalk');
const CleanCSS = require('clean-css');
const cleanCSS = new CleanCSS();
console.log(__dirname);

const build = path.resolve(__dirname, '../build');
console.log(chalk.red(`trash ${build}`));
exec(`trash ${build}`);

fs.mkdirSync(build);

const public = path.resolve(__dirname, '../public');
copyFilesOver(public, build);

function copyFilesOver(input, output) {
  const files = fs.readdirSync(input);
  files.forEach(file => {
    const filePath = path.resolve(input, file);
    switch(path.extname(file)) {
      case '.html': {
        const content = fs.readFileSync(filePath, 'utf-8');
        const minified = minify(content, minifyConfig);
        console.log(chalk.yellow(`Created a minified ${file}`));
        fs.writeFileSync(path.resolve(output, file), minified, 'utf-8');
        return;
      }
      case '.css': {
        const content = fs.readFileSync(filePath, 'utf-8');
        const minified = cleanCSS.minify(content);
        if (minified.errors.length > 0) {
          console.log(chalk.red(minified.errors.join('\n')));
          process.exit(0);
        }
        console.log(chalk.yellow(`Created a minified ${file}`));
        fs.writeFileSync(path.resolve(output, file), minified.styles, 'utf-8');
        return;
      }
      default: {
        console.log(chalk.green(`Copy over ${file}`));
        if (fs.lstatSync(filePath).isDirectory()) {
          fs.mkdirSync(path.resolve(output, file));
          copyFilesOver(filePath, path.resolve(output, file));
        } else {
          fs.copyFileSync(filePath, path.resolve(output, file));
        }
        return;
      }
    }
  });
}
