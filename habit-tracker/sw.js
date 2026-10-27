/* Service Worker: офлайн-кэш «Трекер привычек» */
const CACHE = 'treker-v6';

const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './css/v4-social.css',
  './css/v4-chat.css',
  './css/v4-cycle.css',
  './css/v4-games.css',
  './css/v4-motivation.css',
  './css/v4-notes.css',
  './css/v4-ai.css',
  './js/core.js',
  './js/tracker.js',
  './js/schedule.js',
  './js/plans.js',
  './js/notes.js',
  './js/social.js',
  './js/community.js',
  './js/games.js',
  './js/motivation.js',
  './js/ai.js',
  './manifest.webmanifest',
  './bg/sunset.svg',
  './bg/forest.svg',
  './bg/sea.svg',
  './bg/night.svg',
  './bg/meadow.svg',
  './bg/aurora.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* сеть → кэш → сеть: обновления подхватываются после перезагрузки */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(m => m || caches.match('./index.html')))
  );
});
