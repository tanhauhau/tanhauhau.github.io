importScripts(
  'https://storage.googleapis.com/workbox-cdn/releases/3.6.1/workbox-sw.js'
);

// Cache the Google Fonts stylesheets with a stale-while-revalidate strategy.
workbox.routing.registerRoute(
  /^https:\/\/fonts\.googleapis\.com/,
  workbox.strategies.staleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets'
  })
);

// git hash
workbox.precaching.precacheAndRoute([
  { url: '/5a2a6e65.js', revision: '5a2a6e65' },
  { url: '/e96eb65b.css', revision: 'e96eb65b' },
  { url: '/assets/tan_li_hau.png', revision: '09c88d4' },
  { url: '/index.html', revision: 'a1c33db6' }
]);
