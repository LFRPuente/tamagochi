const CACHE = 'living-pet-v24';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=3.15.0',
  './app.js?v=3.15.0',
  './manifest.webmanifest',
  './personalizar.html',
  './assets/icon.svg',
  './assets/puppy-stand.webp?v=3.15.0',
  './assets/puppy-sit.webp?v=3.15.0',
  './assets/puppy-drowsy.webp?v=3.15.0',
  './assets/puppy-sad.webp?v=3.15.0',
  './assets/puppy-sick.webp?v=3.15.0',
  './assets/puppy-dirty.webp?v=3.15.0',
  './assets/puppy-lonely.webp?v=3.15.0',
  './assets/puppy-sniff.webp?v=3.15.0',
  './assets/puppy-play.webp?v=3.15.0',
  './assets/puppy-walk-a.webp?v=3.15.0',
  './assets/puppy-walk-b.webp?v=3.15.0',
  './assets/puppy-paw.webp?v=3.15.0',
  './assets/puppy-sleep.webp?v=3.15.0',
  './assets/puppy-wake.webp?v=3.15.0',
  './assets/puppy-groom.webp?v=3.15.0',
  './assets/puppy-groom-alt.webp?v=3.15.0',
  './assets/puppy-eat.webp?v=3.15.0',
  './assets/puppy-eat-alt.webp?v=3.15.0',
  './assets/puppy-drink.webp?v=3.15.0',
  './assets/puppy-drink-alt.webp?v=3.15.0',
  './assets/puppy-treat.webp?v=3.15.0',
  './assets/puppy-bath.webp?v=3.15.0',
  './assets/puppy-bath-alt.webp?v=3.15.0',
  './assets/puppy-brush.webp?v=3.15.0',
  './assets/puppy-brush-alt.webp?v=3.15.0'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) caches.open(CACHE).then(cache => cache.put(request, response.clone()));
        return response;
      }).catch(() => caches.match(request).then(cached => cached || caches.match('./index.html')))
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
