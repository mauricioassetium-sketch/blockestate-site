/* The shell of the app, for when the network is not there.
   The API is never cached: a price or an availability served from a cache would be a lie. */
const CACHE = 'blockestate-shell-v18';
const SHELL = [
  './',
  './index.html',
  './css/app.css',
  './css/dev-v2.css',
  './js/app.js',
  './js/api.js',
  './js/cambio.js',
  './js/config.js',
  './js/router.js',
  './js/store.js',
  './js/ui.js',
  './js/views/catalog.js',
  './js/views/dev.js',
  './js/views/desks.js',
  './js/views/escritorios.js',
  './js/views/galeria.js',
  './js/views/map.js',
  './js/views/me.js',
  './js/views/rail.js',
  './js/views/graficas.js',
  './js/views/unit.js',
  './js/views/verysset.js',
  './icons/icon.svg',
  './manifest.webmanifest',
];

// The shell is precached with `cache: 'reload'` on purpose. `addAll` fetches through the browser's
// HTTP cache, so a page that was open when the files changed could install the *new* worker with the
// *old* shell inside it — and then serve that stale shell for a week. Asking for a fresh copy costs a
// few hundred kilobytes once, when the version changes, and removes a whole class of «I published it
// and it is not there» bugs.
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(SHELL.map((u) =>
        fetch(new Request(u, { cache: 'reload' })).then((r) => (r.ok ? c.put(u, r) : null)).catch(() => null))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Anything that is not our own shell (the API, the fonts, the photos) goes to the network.
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit ?? fetch(e.request).then((res) => {
      // A navigation that is not cached falls back to the shell: the router decides what to show.
      if (e.request.mode === 'navigate') return caches.match('./index.html');
      return res;
    }).catch(() => caches.match('./index.html'))),
  );
});
