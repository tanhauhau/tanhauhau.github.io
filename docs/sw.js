importScripts(
  'https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js'
);

const { routing, strategies, expiration, core } = workbox;

core.skipWaiting();
core.clientsClaim();

routing.registerRoute(
  ({ request }) =>
    request.destination === 'script' || request.destination === 'style',
  new strategies.StaleWhileRevalidate({
    cacheName: 'static-resources',
  })
);

routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new strategies.CacheFirst({
    cacheName: 'images',
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  })
);
