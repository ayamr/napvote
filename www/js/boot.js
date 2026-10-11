/* Charge les données « live » (candidats, résultats liés, inscription) puis démarre l'application.
   Web : data/live.json du même site (le service worker le garde pour le hors ligne).
   Natif : live.json distant si disponible et plus récent, sinon dernière copie reçue, sinon celle embarquée. */
(function () {
  'use strict';
  var V = window.VV, CFG = window.NAPVOTE || {};
  var cap = window.Capacitor, native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  var APP = ['js/app.js', 'js/hist-ui.js', 'js/bulletin.js', 'js/resultats.js', 'js/map.js', 'js/candidats.js', 'js/sondage.js', 'js/vendor/qrcode.js', 'js/partage.js', 'js/pwa.js'];

  function getJSON(url, ms) {
    return new Promise(function (res, rej) {
      var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) { ctl.abort(); } rej(new Error('délai')); }, ms || 10000);
      fetch(url, { cache: 'no-cache', signal: ctl ? ctl.signal : undefined }).then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.json(); })
        .then(function (j) { clearTimeout(t); res(j); }, function (e) { clearTimeout(t); rej(e); });
    });
  }
  function valid(l) { return l && l.vv && l.vv.cands && l.hist && l.election && V && l.geo === V.geo; }
  function stamp(l) { return (l.election && l.election.fetchedAt) || (l.vv && l.vv.collected) || ''; }

  function chooseLive() {
    var jobs = [getJSON('data/live.json', 12000).catch(function () { return null; })];
    if (native && CFG.liveUrl) { jobs.push(getJSON(CFG.liveUrl, 6000).catch(function () { return null; })); }
    return Promise.all(jobs).then(function (r) {
      var cands = r.filter(valid);
      if (native) {
        try { var c = JSON.parse(localStorage.getItem('vv.live')); if (valid(c)) { cands.push(c); } } catch (e) { /* aucune copie */ }
      }
      if (!cands.length) { return null; }
      cands.sort(function (a, b) { return stamp(b) < stamp(a) ? -1 : 1; });
      var best = cands[0];
      if (native && r[1] && valid(r[1]) && best === r[1]) { try { localStorage.setItem('vv.live', JSON.stringify(best)); } catch (e) { /* espace plein */ } }
      return best;
    });
  }

  function loadScripts(list, done) {
    var i = 0;
    (function next() {
      if (i >= list.length) { done(); return; }
      var s = document.createElement('script'); s.src = list[i++]; s.async = false;
      s.onload = next; s.onerror = function () { fail('Fichier manquant : ' + s.src); };
      document.body.appendChild(s);
    })();
  }
  function fail(msg) {
    var m = document.getElementById('main');
    if (m) { m.innerHTML = '<div class="wrap"><div style="margin:32px 0"><h2>' + (window.t ? window.t('err.boot') : 'NapVote ne peut pas démarrer') + '</h2><p>' + (msg || 'Les données sont introuvables.') + '</p><p style="margin-top:14px"><button type="button" class="btn" onclick="location.reload()">' + (window.t ? window.t('err.reload') : 'Recharger') + '</button></p></div></div>'; }
  }

  chooseLive().then(function (live) {
    if (!live) { fail('Les données n’ont pas pu être chargées.'); return; }
    Object.keys(live.vv).forEach(function (k) { V[k] = live.vv[k]; });
    var H = window.VVH || (window.VVH = {});
    Object.keys(live.hist).forEach(function (k) { H[k] = live.hist[k]; });
    window.VVE = live.election;
    window.VVChanges = live.changes || null;
    window.VVGrowth = live.growth || [];
    loadScripts(APP, function () { /* démarrage assuré par pwa.js */ });
  });
})();
