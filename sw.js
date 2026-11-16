// Service worker for Ouk Chatrang: makes the game installable and playable
// offline. The app shell (this repo's own files) is precached at install;
// the CDN dependencies (three.js / OrbitControls / React from jsdelivr,
// Firebase from gstatic) are runtime-cached the first time they load, so
// after one online visit the whole game works with no connectivity.
// Everything else (Firebase auth/Firestore API traffic) passes straight
// through to the network untouched.
const CACHE = 'ouk-chatrang-v2'; // v2: the King icon (a new name drops the old cache, old icon included)
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg?v=2', './apple-touch-icon.png?v=2', './data/ok-khmer.js?v=1'];
// hosts that only ever serve immutable static assets for this app --
// safe to cache-first without risking stale API responses
const STATIC_HOSTS = ['cdn.jsdelivr.net', 'www.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !STATIC_HOSTS.includes(url.hostname)) return; // API traffic: network only
  if (sameOrigin && url.pathname.endsWith('/version.json')) return; // the update check: always the network's answer
  if (sameOrigin && (url.pathname.endsWith('/ads.js') || url.pathname.endsWith('/ads-config.json'))) return; // the ads switch: always the network's answer

  // The page itself is network-first, so a game update lands on the next online visit -- but a stalled connection
  // does not hold the game up: when the network has not answered within 3 seconds and there is a saved copy, the
  // saved copy opens at once. The fresh page is still stored when it does arrive, and the game's own update bar
  // (it reads version.json) offers the newer version.
  const isPage = sameOrigin && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));
  if (isPage) {
    e.respondWith(new Promise((resolve) => {
      let settled = false;
      const saved = () => caches.match(e.request);
      const net = fetch(e.request).then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return r;
      });
      const timer = setTimeout(() => {
        saved().then((hit) => { if (hit && !settled) { settled = true; resolve(hit); } });
      }, 3000);
      net.then((r) => { clearTimeout(timer); if (!settled) { settled = true; resolve(r); } })
        .catch(() => { clearTimeout(timer); saved().then((hit) => { if (!settled) { settled = true; resolve(hit || Response.error()); } }); });
      e.waitUntil(net.catch(() => {})); // (keep the worker alive until the fresh copy is stored)
    }));
    return;
  }

  // everything else (icons, CDN scripts): cache-first with background fill
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
      if (r.ok || r.type === 'opaque') {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return r;
    }))
  );
});
