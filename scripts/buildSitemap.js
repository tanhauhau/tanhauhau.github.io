const fs = require('fs').promises;
const path = require('path');
const { OUTPUT_FOLDER } = require('./config');

module.exports = function(result) {
  const urls = ['https://lihautan.com/', 'https://lihautan.com/blogs/', 'https://lihautan.com/notes/', 'https://lihautan.com/talks/'];
  [...result.blog, ...result.talk].forEach(({ slug }) => {
    urls.push(`https://lihautan.com/${slug}`);
  });

  // prettier-ignore
  const rssXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
        urls.map(url => ([
          '<url>',
            `<loc>${url}</loc>`,
            `<changefreq>daily</changefreq>`,
            `<priority>0.7</priority>`,
          '</url>',
        ].join(''))),
      '</urlset>',
  ].join('');

  return fs.writeFile(path.join(OUTPUT_FOLDER, 'sitemap.xml'), rssXml, 'utf-8');
};
