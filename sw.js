// Comptoir Motard – service worker
// Change le numéro de version à chaque mise à jour du site.
const CACHE = 'comptoir-motard-v13';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'chat.css', 'chat.js', 'products.js', 'img/logo.webp', 'img/bg.svg', 'img/bg-dark.svg', 'img/avatar-0.webp', 'img/avatar-1.webp', 'img/avatar-2.webp'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord (toujours la dernière version), cache si hors ligne.
self.addEventListener('fetch', e => {
  const req = e.request;
  const u = new URL(req.url);
  if (req.method !== 'GET' || u.origin !== location.origin || u.pathname.indexOf('/api/') !== -1) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match('index.html')))
  );
});
