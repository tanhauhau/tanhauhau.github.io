const fs = require('fs-extra');
const path = require('path');
const minify = require('html-minifier').minify;
const minifyConfig = require('../config/minify.config.js');
const showdown  = require('showdown');
const showdownConfig = require('../config/showdown.config.js');
const showdownConverter = new showdown.Converter(showdownConfig);

const blogFolder = path.resolve(__dirname, '../blog');
(async () => {
  const files = await fs.readdir(blogFolder);
  console.log(files);
  const htmls = await Promise.all(files.filter(f => path.extname(f) === '.md').map(async (file) => {
    const fileContent = await fs.readFile(path.resolve(blogFolder, file), 'utf-8');
    // extract extra info

    // make html from md
    const html = showdownConverter.makeHtml(fileContent);
    const minifiedHTML = minify(html, minifyConfig);
    return minifiedHTML;
  }));
  // write file 
  for (const html of htmls) {
    console.log(html);
  }
  // create a manifest of the list of blogs
})();