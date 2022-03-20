import { getContent } from './api/_utils';

export async function get() {
	const items = await getContent({ filter: { label: ['blog', 'talk'] } });
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
          ...items.map(({ title, description, date, tags, url }) => ([
            '<item>',
              `<title>${title}</title>`,
              description && `<description>${description}</description>`,
              `<link>https://lihautan.com${url}/</link>`,
              `<guid isPermalink="true">https://lihautan.com${url}/</guid>`,
              `<pubDate>${new Date(date).toUTCString()}</pubDate>`,
              Array.isArray(tags) && tags.map(tag => `<category>${tag}</category>`).join(''),
            '</item>',
          ].filter(Boolean).join(''))),
        '</channel>',
      '</rss>',
  ].join('');

	return {
		body: rssXml
	};
}
