/* NapVote service worker — généré par scripts/build_sw.py (ne pas éditer à la main) */
var VERSION = 'adf96c8fa1';
var CACHE = 'napvote-' + VERSION;
var FILES = [
 "./",
 "css/app.css",
 "css/features.css",
 "data/live.json",
 "fonts/20bddc40e6.woff2",
 "fonts/2a392e77f8.woff2",
 "fonts/486bb38146.woff2",
 "fonts/60d1ee22a2.woff2",
 "fonts/8864f19927.woff2",
 "fonts/8d0aead6b2.woff2",
 "fonts/da9f89d3c4.woff2",
 "fonts/f631476b55.woff2",
 "icons/apple-touch-icon.png",
 "icons/favicon-32.png",
 "icons/icon-192.png",
 "icons/icon-512.png",
 "icons/icon-maskable-512.png",
 "icons/icon.svg",
 "index.html",
 "js/app.js",
 "js/bios.js",
 "js/boot.js",
 "js/bulletin.js",
 "js/candidats.js",
 "js/config.js",
 "js/data.js",
 "js/hist-ui.js",
 "js/hist.js",
 "js/map.js",
 "js/pwa.js",
 "js/resultats.js",
 "js/vendor/d3.min.js",
 "manifest.webmanifest"
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('napvote-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) { return; }
  // pages : réseau d'abord (données fraîches), cache en secours hors ligne
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (r) {
      var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put('index.html', copy); }); return r;
    }).catch(function () { return caches.match('index.html'); }));
    return;
  }
  // données live : réseau d'abord (toujours fraîches), dernière copie en secours hors ligne
  if (/\/data\/live\.json$/.test(new URL(req.url).pathname)) {
    e.respondWith(fetch(req).then(function (r) {
      if (r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put('data/live.json', copy); }); }
      return r;
    }).catch(function () { return caches.match('data/live.json'); }));
    return;
  }
  // ressources : cache d'abord
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(req).then(function (r) {
      if (r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return r;
    });
  }));
});
