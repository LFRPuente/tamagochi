const CACHE = 'living-pet-v34';
const SCOPE_PATH = new URL('./', self.location.href).pathname;
const APP_SHELL = [
  './',
  './index.html',
  './carta.html',
  './styles.css?v=3.23.0',
  './app.js?v=3.23.0',
  './manifest.webmanifest',
  './personalizar.html',
  './assets/icon.svg',
  './assets/pug-stand.webp?v=3.16.0',
  './assets/pug-sit.webp?v=3.16.0',
  './assets/pug-drowsy.webp?v=3.16.0',
  './assets/pug-sad.webp?v=3.16.0',
  './assets/pug-sick.webp?v=3.16.0',
  './assets/pug-dirty.webp?v=3.16.0',
  './assets/pug-lonely.webp?v=3.16.0',
  './assets/pug-sniff.webp?v=3.16.0',
  './assets/pug-play.webp?v=3.16.0',
  './assets/pug-walk-a.webp?v=3.16.0',
  './assets/pug-walk-b.webp?v=3.16.0',
  './assets/pug-paw.webp?v=3.16.0',
  './assets/pug-sleep.webp?v=3.16.0',
  './assets/pug-wake.webp?v=3.16.0',
  './assets/pug-groom.webp?v=3.16.0',
  './assets/pug-groom-alt.webp?v=3.16.0',
  './assets/pug-eat.webp?v=3.16.0',
  './assets/pug-eat-alt.webp?v=3.16.0',
  './assets/pug-drink.webp?v=3.16.0',
  './assets/pug-drink-alt.webp?v=3.16.0',
  './assets/pug-treat.webp?v=3.16.0',
  './assets/pug-bath.webp?v=3.16.0',
  './assets/pug-bath-alt.webp?v=3.16.0',
  './assets/pug-brush.webp?v=3.16.0',
  './assets/pug-brush-alt.webp?v=3.16.0'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(keys
        .filter(key => key.startsWith('living-pet-') && key !== CACHE)
        .map(key => caches.delete(key)))),
      self.clients.claim()
    ])
  );
});

function navigationCacheKey(url) {
  if (url.pathname === `${SCOPE_PATH}carta.html`) return './carta.html';
  if (url.pathname === `${SCOPE_PATH}personalizar.html`) return './personalizar.html';
  if (url.pathname === SCOPE_PATH || url.pathname === `${SCOPE_PATH}index.html`) return './index.html';
  return null;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    const cacheKey = navigationCacheKey(url);
    event.respondWith(
      fetch(request).then(async response => {
        if (response.ok && cacheKey) {
          const cache = await caches.open(CACHE);
          await cache.put(cacheKey, response.clone());
        }
        return response;
      }).catch(async () => {
        if (!cacheKey) return Response.error();
        const cache = await caches.open(CACHE);
        return (await cache.match(cacheKey)) || Response.error();
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) caches.open(CACHE).then(cache => cache.put(request, response.clone()));
      return response;
    }))
  );
});
