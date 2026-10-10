/* NapVote service worker — généré par scripts/build_sw.py (ne pas éditer à la main) */
var VERSION = 'f609dd1629';
var CACHE = 'napvote-' + VERSION;
var FILES = [
 "./",
 "css/napvote.css",
 "data/live.json",
 "fonts/3574b825.woff2",
 "fonts/5b5a5c24.woff2",
 "fonts/8012ef4d.woff2",
 "fonts/81d71ea7.woff2",
 "fonts/b5e287bd.woff2",
 "fonts/cb23fde8.woff2",
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
 "js/i18n.js",
 "js/map.js",
 "js/photos.js",
 "js/pwa.js",
 "js/resultats.js",
 "js/vendor/d3.min.js",
 "manifest.webmanifest",
 "photos/bodeau-gary.jpg",
 "photos/joseph-claude.jpg",
 "photos/privert-jocelerme.jpg"
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
