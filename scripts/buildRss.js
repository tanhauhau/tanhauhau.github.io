const fs = require('fs').promises;
const path = require('path');
const { OUTPUT_FOLDER } = require('./config');

module.exports = function(result) {
  const items = [...result.blog, ...result.talk].sort(function reverseSortByDate(a, b) {
    return a.metadata.date === b.metadata.date ? 0 : a.metadata.date < b.metadata.date ? 1 : -1;
  });

  // prettier-ignore
  const rssXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0">',
        '<channel>',
          `<title>Tan Li Hau's Blog</title>`,
          `<description>Frontend Developer at Shopee Singapore</description>`,
          `<link>https://lihautan.com/</link>`,
          `<language>en-us</language>`,
          `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
          ...items.map(({ metadata: { title, description, date, tags }, slug }) => ([
            '<item>',
              `<title>${title}</title>`,
              description && `<description>${description}</description>`,
              `<link>https://lihautan.com/${slug}/</link>`,
              `<guid isPermalink="true">https://lihautan.com/${slug}/</guid>`,
              `<pubDate>${new Date(date).toUTCString()}</pubDate>`,
              Array.isArray(tags) && tags.map(tag => `<category>${tag}</category>`).join(''),
            '</item>',
          ].filter(Boolean).join(''))),
        '</channel>',
      '</rss>',
  ].join('');

  return fs.writeFile(path.join(OUTPUT_FOLDER, 'rss.xml'), rssXml, 'utf-8');
};
