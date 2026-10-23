/* ASM Home Ledger - Service Worker */
const CACHE = 'asm-home-ledger-v1';   // change v1 -> v2 when you want to force a refresh

const CORE = [
  './',
  './manifest.json',
  './favicon-192.png',
  './favicon-512.png'
];
const LIBS = [];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      var jobs = CORE.map(function (u) { return c.add(u).catch(function () {}); });
      LIBS.forEach(function (u) {
        jobs.push(fetch(u, { mode: 'no-cors' }).then(function (r) { return c.put(u, r); }).catch(function () {}));
      });
      return Promise.all(jobs);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf('asm-home-ledger-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // Never touch Google login / Drive calls
  if (url.hostname.indexOf('google') !== -1 || url.hostname.indexOf('gstatic') !== -1) return;

  // Pages: network first (so updates arrive), cache as offline fallback
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (r) {
        var copy = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return r;
      }).catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (m) { return m || caches.match('./'); });
      })
    );
    return;
  }

  // Everything else: cache first, then network
  e.respondWith(
    caches.match(req).then(function (m) {
      return m || fetch(req).then(function (r) {
        if (r && (r.ok || r.type === 'opaque')) {
          var copy = r.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return r;
      });
    })
  );
});
