(function () {
  'use strict';
  var A = window.VVApp;
  if (!A) { return; }
  A.boot();

  /* Adresse de contact : assemblée ici plutôt qu'écrite dans le HTML, pour que Cloudflare ne la remplace pas par « [email protected] » */
  var MAIL = 'contact' + String.fromCharCode(64) + 'napvote-ht.com';
  Array.prototype.forEach.call(document.querySelectorAll('a.cmail'), function (a) { a.href = 'mailto:' + MAIL; a.textContent = MAIL; });

  var native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;

  if (native || standalone) { document.body.classList.add('app-shell'); }
  if (native) {
    var P = window.Capacitor.Plugins || {};
    document.body.classList.add('native');
    if (P.StatusBar && P.StatusBar.setStyle) { try { P.StatusBar.setStyle({ style: matchMedia('(prefers-color-scheme: dark)').matches ? 'DARK' : 'LIGHT' }); } catch (e) { /* ignore */ } }
    if (P.App && P.App.addListener) {
      P.App.addListener('backButton', function () {
        var dlg = document.querySelector('dialog[open]');
        if (dlg) { dlg.close(); return; }
        var cur = document.body.getAttribute('data-page');
        if (cur && cur !== 'home') { A.show('home'); } else { P.App.exitApp(); }
      });
    }
  }

  // hors ligne : service worker (sites web / PWA uniquement)
  var dev = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !/[?&]sw=1/.test(location.search);
  if (!native && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    if (dev) {
      navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); });
      if (window.caches) { caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); }); }
    } else {
      window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* ignore */ }); });
    }
  }

  // nouvelle version du code installée : on prévient, sans recharger de force
  if (!native && 'serviceWorker' in navigator && !dev && navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('controllerchange', function () { A.toast(t('update')); });
  }

  // installation
  var btn = document.getElementById('install-btn'), ios = document.getElementById('install-ios'), txt = document.getElementById('install-txt'), card = document.getElementById('install-card');
  var deferred = null;
  if (native || standalone) { if (card) { card.hidden = true; } return; }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; if (btn) { btn.hidden = false; } });
  if (btn) {
    btn.addEventListener('click', function () {
      if (!deferred) { return; }
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; btn.hidden = true; });
    });
  }
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS && ios) { ios.hidden = false; }
  window.addEventListener('appinstalled', function () { if (txt) { txt.textContent = 'NapVote est installée sur cet appareil.'; } if (btn) { btn.hidden = true; } });
})();
