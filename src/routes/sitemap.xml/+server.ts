import { getContent } from '../api/_utils';

export const prerender = true;

export async function GET() {
  const items = await getContent({ filter: { label: ['blog', 'talk'] } });
  // prettier-ignore
  const sitemapXml = [
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
    items.map(({ url }) => ([
      '<url>',
      `<loc>https://lihautan.com/${url}</loc>`,
      '<changefreq>daily</changefreq>',
      '<priority>0.7</priority>',
      '</url>',
    ])),
    '</urlset>',
  ].flat(Infinity).join('');

  return new Response(
    sitemapXml,
    {
      headers: {
        'content-type': 'application/xml'
      }
    });
}
