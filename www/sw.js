const CACHE = 'skazhy-v1';
const FILES = ['./', './index.html', './styles.css', './app.js', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './icons/eat.svg', './icons/drink.svg', './icons/toilet.svg', './icons/sleep.svg', './icons/ball.svg', './icons/car.svg',
  './icons/bubbles.svg', './icons/candy.svg', './icons/play.svg', './icons/walk.svg', './icons/yes.svg', './icons/no.svg',
  './icons/stop.svg', './icons/iwant.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });
