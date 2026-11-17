/* Page « Enskri » : inciter les jeunes à s'inscrire sur la liste électorale.
   Chiffres : data/enskri.json (scripts/build_enskri.py). Centres du CEP et bureaux de l'ONI : data/civ.json (scripts/build_civ.py).
   Rien n'est calculé ici, sauf la mise en page. Données chargées à la première visite de la page.
   Structure : un titre à gauche, le contenu à droite, séparés par des filets ; sur téléphone, tout passe en une colonne. */
(function () {
  'use strict';
  var A = window.VVApp, root = document.getElementById('en-root');
  if (!A || !root) { return; }
  var esc = A.esc, t = window.t;
  function fmt(n) { return A.fmt(n).replace(/\u202f/g, '\u00a0'); }  // espace insécable ordinaire : l'espace fine colle les chiffres
  var D = null, C = null, state = 0;

  function getJSON(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.json(); }); }
  function pc(x) { return Number(x).toLocaleString('fr-FR', { maximumFractionDigits: 1 }); }
  function dFr(iso, o) { var q = String(iso).slice(0, 10).split('-'); return new Date(+q[0], +q[1] - 1, +q[2]).toLocaleDateString('fr-FR', o || { day: 'numeric', month: 'long', year: 'numeric' }); }
  /* texte échappé ; *mot* devient du gras (les traducteurs placent le gras où ils veulent) */
  function em(s) { return esc(s).replace(/\*(.+?)\*/g, '<b>$1</b>'); }
  function tt(k, v) { return em(t(k, v)); }
  /* « PÉTION-VILLE » -> « Pétion-Ville », « LA VALLÉE DE JACMEL » -> « La Vallée de Jacmel » */
  function nice(s) {
    var o = String(s).toLowerCase().replace(/(^|[\s\-'’(])([a-zà-ÿœ])/g, function (m, a, c) { return a + c.toUpperCase(); });
    o = o.replace(/ (De|Du|Des|Et|Au|Aux|À|Sur|Sous|En|La|Le|Les) /g, function (m, w) { return ' ' + w.toLowerCase() + ' '; });
    o = o.replace(/-(De|Du|Des|Au|Aux|À|Sur|Sous|En|La|Le|Les|Et)(?=-)/g, function (m, w) { return '-' + w.toLowerCase(); });  // Port-au-Prince, Anse-à-Galets
    return o.charAt(0).toUpperCase() + o.slice(1);
  }
  function deptName(raw) { var k = String(raw).toUpperCase(); return /^GRAND/.test(k) ? 'Grand’Anse' : nice(raw); }
  /* « dans l’Ouest », « dans la Grand’Anse »… */
  var ART = { 'Artibonite': 'l’Artibonite', 'Centre': 'le Centre', 'Grand’Anse': 'la Grand’Anse', 'Nippes': 'les Nippes', 'Nord': 'le Nord', 'Nord-Est': 'le Nord-Est', 'Nord-Ouest': 'le Nord-Ouest', 'Ouest': 'l’Ouest', 'Sud': 'le Sud', 'Sud-Est': 'le Sud-Est' };
  function withArt(raw) { var n = deptName(raw); return window.NVLang === 'ht' ? n : (ART[n] || n); }
  function siteUrl() {
    var cfg = window.NAPVOTE || {}, base = location.origin + location.pathname.replace(/index\.html$/, '');
    if (A.native && cfg.liveUrl) { try { base = new URL(cfg.liveUrl).origin + '/'; } catch (e) { /* adresse invalide */ } }
    return base + '#enskri';
  }
  function shareText() {
    var d = D && D.fermeture ? dFr(D.fermeture.date) : '';
    return t(d ? 'en.share.msg' : 'en.share.msg0', { d: d, u: siteUrl() });
  }
  /* une section : titre (et petite introduction) à gauche, contenu à droite */
  function sec(id, head, intro, body, cls) {
    return '<section class="en-ch' + (cls ? ' ' + cls : '') + '"' + (id ? ' id="' + id + '"' : '') + '><div class="wrap en-grid"><div class="en-sh">' + head + (intro ? '<p class="en-intro">' + intro + '</p>' : '') + '</div><div class="en-sb">' + body + '</div></div></section>';
  }
  /* un nombre qui monte jusqu'à sa valeur quand il apparaît (js/bilan.js) : « § » marque sa place dans la phrase traduite */
  function num(key, vars, name, value) {
    var v = {}; Object.keys(vars || {}).forEach(function (k) { v[k] = vars[k]; }); v[name] = '§';
    return em(t(key, v)).replace('§', '<span class="en-num" data-to="' + (+value || 0) + '"></span>');
  }
  function runNums() {
    root.querySelectorAll('.en-num').forEach(function (el) { var n = +el.getAttribute('data-to'); if (A.countUp) { A.countUp(el, n); } else { el.textContent = fmt(n); } });
  }
  function row(label, body) { return '<div class="en-row"><h3>' + esc(label) + '</h3><div>' + body + '</div></div>'; }
  function link(u, label) { return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + esc(label) + '</a>'; }

  /* ---------- rendu ---------- */
  function hero() {
    var fm = D.fermeture;
    var panel = !fm ? '' : '<aside class="en-panel"><h2>' + esc(t('en.open.t')) + '</h2>' +
      '<p>' + num('en.open.p', { d: dFr(fm.date) }, 'j', fm.jours) + '</p>' +
      '<p>' + tt('en.open.cin') + '</p>' +
      '<p class="en-small">' + esc(t('en.open.note')) + '</p></aside>';
    return '<div class="en-hero"><div class="wrap en-hg"><div class="en-hl">' +
      '<h1>' + esc(t(D.ok ? 'en.h1' : 'en.h1b')) + '</h1>' +
      '<p class="en-sub">' + esc(t('en.sub')) + '</p>' +
      '<div class="en-cta"><button type="button" class="btn primary" data-en-go="en-find">' + esc(t('en.cta.find')) + '</button>' +
      '<button type="button" class="btn ghost" data-en-share>' + esc(t('en.cta.share')) + '</button></div></div>' + panel + '</div></div>';
  }
  /* le constat : une phrase, puis le graphique par âge */
  function figure() {
    if (!D.ok) { return ''; }
    var j = D.jeunes, old = D.age[D.age.length - 1], mx = 0;
    D.age.forEach(function (a) { mx = Math.max(mx, a.pct_pop, a.pct_ins); });
    var rows = D.age.map(function (a) {
      return '<li class="en-ar"><span class="en-al">' + esc(a.k.replace('+', ' +')) + '</span><span class="en-ab">' +
        '<i class="pop" style="--w:' + (a.pct_pop / mx).toFixed(4) + '"></i><i class="ins" style="--w:' + (a.pct_ins / mx).toFixed(4) + '"></i></span>' +
        '<span class="en-av"><span>' + pc(a.pct_pop) + ' %</span><b>' + pc(a.pct_ins) + ' %</b></span>' +
        '<span class="en-at">' + esc(t('en.age.rate', { n: pc(a.taux) })) + '</span></li>';
    }).join('');
    var head = '<h2 class="en-claim">' + tt('en.claim', { n: j.un_sur }) + '</h2>';
    var intro = '<span class="en-p">' + esc(t('en.claim.1', { m: Math.round(100 / old.taux) })) + '</span><span class="en-p">' + esc(t('en.claim.2', { a: pc(j.pct_pop), b: pc(j.pct_ins) })) + '</span>';
    var body = '<p class="en-key"><span><i class="pop"></i>' + esc(t('en.age.adults')) + '</span><span><i class="ins"></i>' + esc(t('en.age.ins')) + '</span></p>' +
      '<ul class="en-age">' + rows + '</ul>';
    return sec('', head, intro, body, 'en-fig');
  }
  /* 2016 : ce que pèse une voix */
  function weight() {
    var p = D.pres2016;
    if (!D.ok || !p) { return ''; }
    var body = '<dl class="en-vs">' +
      '<div class="en-row"><dt>' + num('en.w1', {}, 'n', p.voix_gagnant) + '</dt><dd>' + esc(t('en.w1b', { w: p.gagnant, p: pc(p.pct_gagnant) })) + '</dd></div>' +
      '<div class="en-row"><dt>' + num('en.w2', {}, 'n', D.inscrits) + '</dt><dd>' + esc(t('en.w2b', { x: pc(p.inscrits_vs_gagnant) })) + '</dd></div>' +
      '<div class="en-row"><dt>' + esc(t('en.w3', { n: pc(D.age[0].pop / 1e6) })) + '</dt><dd>' + esc(t('en.w3b', { x: pc(p.jeunes_vs_gagnant) })) + '</dd></div></dl>' +
      '<p class="en-end">' + esc(t('en.w.end')) + '</p>';
    return sec('', '<h2>' + esc(t('en.w.h')) + '</h2>', '', body);
  }
  function cin() {
    var o = D.oni;
    var body = '<div class="en-rows">' +
      row(t('en.cin.why'), '<p>' + esc(t('en.cin.why.p')) + '</p>') +
      row(t('en.cin.where'), '<p>' + esc(o ? t('en.cin.where.p', { n: o.bureaux, c: o.communes }) : t('en.cin.where.p0')) + ' ' + link('https://oni.gouv.ht/la-liste-des-bureaux/', t('en.cin.where.l')) + '</p>') +
      row(t('en.cin.need'), '<ul><li>' + esc(t('en.cin.r1')) + '</li><li>' + esc(t('en.cin.r2')) + '</li><li>' + esc(t('en.cin.r3')) + '</li><li>' + esc(t('en.cin.r4')) + '</li></ul>' +
        '<p>' + link('https://oni.gouv.ht/les-pieces-requises-au-moment-de-produire-la-demande-de-cin/', t('en.cin.need.l')) + '</p>') +
      row(t('en.cin.free'), '<p>' + esc(t('en.cin.free.p')) + ' ' + link('https://oni.gouv.ht/580-2/', t('en.cin.free.l')) + '</p>') +
      '</div>' +
      '<details class="en-more"><summary>' + esc(t('en.cin.nopaper')) + '</summary><p>' + esc(t('en.cin.nopaper.p')) + '</p></details>' +
      '<details class="en-more"><summary>' + esc(t('en.cin.wait')) + '</summary><p>' + esc(t('en.cin.wait.p')) + '</p><p>' + esc(t('en.cin.gap')) + '</p></details>';
    return sec('', '<h2>' + esc(t('en.cin.h')) + '</h2>', '', body);
  }
  function steps() {
    var body = '<ol class="en-steps">' + [1, 2, 3].map(function (n) { return '<li><b>' + esc(t('en.s' + n)) + '</b><span>' + esc(t('en.s' + n + 'p')) + '</span></li>'; }).join('') + '</ol>';
    return sec('', '<h2>' + esc(t('en.steps.h')) + '</h2>', '', body);
  }
  function finder() {
    var body = '<div class="en-sel"><label class="field"><span>' + esc(t('en.find.dep')) + '</span><select id="en-dep"></select></label>' +
      '<label class="field"><span>' + esc(t('en.find.com')) + '</span><select id="en-com" disabled></select></label></div>' +
      '<div id="en-res" aria-live="polite"></div>';
    return sec('en-find', '<h2>' + esc(t('en.find.h')) + '</h2>', esc(t('en.find.intro')), body);
  }
  function depts() {
    if (!D.ok || !D.dept || !D.dept.length) { return ''; }
    var mx = Math.max.apply(null, D.dept.map(function (d) { return d.taux; }));
    var low = D.dept.slice(-2).reverse();
    var rows = D.dept.map(function (d) {
      return '<li><button type="button" class="vb" data-en-dep="' + esc(deptName(d.n)) + '" aria-label="' + esc(t('en.dept.go', { d: deptName(d.n) })) + '"><span class="vb-l">' + esc(deptName(d.n)) + '</span><span class="vb-b"><i style="--w:' + (d.taux / mx).toFixed(4) + '"></i></span><span class="vb-n">' + fmt(d.ins) + '</span><span class="vb-r">' + pc(d.taux) + ' %</span></button></li>';
    }).join('');
    var body = '<ul class="vbars">' + rows + '</ul>' +
      '<p class="en-end">' + esc(t('en.dept.last', { a: withArt(low[0].n), b: withArt(low[1].n), n: Math.round((low[0].taux + low[1].taux) / 2) })) + '</p>';
    return sec('', '<h2>' + esc(t('en.dept.h')) + '</h2>', esc(t('en.dept.p')) + ' <b>' + esc(t('en.dept.tip')) + '</b>', body);
  }
  function share() {
    var txt = shareText(), canShare = !!(A.native || navigator.share);
    var body = '<p class="en-msg">' + esc(txt) + '</p><div class="en-cta">' +
      '<a class="btn primary" href="https://wa.me/?text=' + encodeURIComponent(txt) + '" target="_blank" rel="noopener noreferrer">' + esc(t('en.share.wa')) + '</a>' +
      (canShare ? '<button type="button" class="btn" data-en-share>' + esc(t('en.share.other')) + '</button>' : '') +
      '<button type="button" class="btn ghost" data-en-copy>' + esc(t('en.share.copy')) + '</button></div>';
    return sec('', '<h2>' + esc(t('en.share.h')) + '</h2>', '', body, 'en-last');
  }
  function render() {
    root.innerHTML = '<div class="bl-prog" aria-hidden="true"><i></i></div>' + hero() + figure() + weight() + cin() + steps() + finder() + depts() + share();
    buildFinder();
    runNums();
  }

  /* ---------- chercheur : département -> commune -> centres du CEP et bureaux de l'ONI ---------- */
  function buildFinder() {
    var dep = document.getElementById('en-dep'), com = document.getElementById('en-com'), out = document.getElementById('en-res');
    if (!dep || !com || !out) { return; }
    if (!C) { out.innerHTML = '<p class="empty">' + esc(t('en.err')) + '</p>'; dep.disabled = true; return; }
    var names = C.d.map(deptName);
    dep.innerHTML = '<option value="">' + esc(t('en.find.pickd')) + '</option>' + names.map(function (n, i) { return '<option value="' + i + '">' + esc(n) + '</option>'; }).join('');
    function communes(di) {
      var m = {};
      C.r.forEach(function (r) { if (r[0] === di) { m[r[1]] = 1; } });
      (C.o || []).forEach(function (r) { if (r[0] === di) { m[r[1]] = 1; } });
      return Object.keys(m).sort(function (x, y) { return x.localeCompare(y, 'fr'); });
    }
    function fillCom() {
      var di = dep.value === '' ? -1 : +dep.value;
      if (di < 0) { com.innerHTML = ''; com.disabled = true; out.innerHTML = ''; return; }
      com.disabled = false;
      com.innerHTML = '<option value="">' + esc(t('en.find.pick')) + '</option>' + communes(di).map(function (c) { return '<option value="' + esc(c) + '">' + esc(nice(c)) + '</option>'; }).join('');
      out.innerHTML = '';
    }
    function dirLink(r) { return r[6] == null ? '' : 'https://www.google.com/maps/dir/?api=1&destination=' + r[6] + ',' + r[7]; }
    function show() {
      var di = +dep.value, c = com.value;
      if (dep.value === '' || !c) { out.innerHTML = ''; return; }
      A.store.set('enskri.loc', [di, c]);
      var cs = C.r.filter(function (r) { return r[0] === di && r[1] === c; }).sort(function (x, y) { return x[2].localeCompare(y[2], 'fr') || x[3].localeCompare(y[3], 'fr'); });
      var os = (C.o || []).filter(function (r) { return r[0] === di && r[1] === c; });
      var h = '<h3 class="en-h3">' + esc(t('en.find.centres')) + ' <span>' + cs.length + '</span></h3>';
      if (!cs.length) { h += '<p class="en-note">' + esc(t('en.find.none')) + '</p>'; }
      else {
        h += '<ul class="en-list">' + cs.map(function (r) {
          var dl = dirLink(r);
          return '<li><div><b>' + esc(nice(r[3])) + '</b><span>' + (r[2] ? esc(nice(r[2])) : '') + (r[4] ? (r[2] ? ' · ' : '') + esc(r[4]) : '') + '</span></div>' +
            '<div class="en-m">' + (r[5] ? '<em>' + esc(t(r[5] === 1 ? 'en.find.bv1' : 'en.find.bv', { n: r[5] })) + '</em>' : '<em class="warn">' + esc(t('en.find.bv0')) + '</em>') +
            (dl ? '<a href="' + dl + '" target="_blank" rel="noopener noreferrer">' + esc(t('en.find.dir')) + '</a>' : '<span class="nl">' + esc(t('en.find.nocoord')) + '</span>') + '</div></li>';
        }).join('') + '</ul>';
      }
      h += '<h3 class="en-h3">' + esc(t('en.find.oni')) + ' <span>' + os.length + '</span></h3>';
      if (os.length) { h += '<ul class="en-list">' + os.map(function (r) { return '<li><div><b>' + esc(r[2]) + '</b></div></li>'; }).join('') + '</ul>'; }
      else {
        var near = (C.o || []).filter(function (r) { return r[0] === di; });
        h += '<p class="en-note">' + esc(t('en.find.nooni')) + '</p>' + (near.length ? '<ul class="en-list">' + near.map(function (r) { return '<li><div><b>' + esc(nice(r[1])) + '</b><span>' + esc(r[2]) + '</span></div></li>'; }).join('') + '</ul>' : '');
      }
      h += '<p class="en-small">' + esc(t('en.find.fresh', { d: C.maj ? dFr(C.maj) : '' })) + '</p>';
      out.innerHTML = h;
    }
    dep.addEventListener('change', fillCom);
    com.addEventListener('change', show);
    var last = A.store.get('enskri.loc', null);
    if (last && C.d[last[0]] !== undefined) {
      dep.value = String(last[0]); fillCom();
      if (communes(last[0]).indexOf(last[1]) >= 0) { com.value = last[1]; show(); }
    }
  }

  /* ---------- actions ---------- */
  function doShare() {
    var txt = shareText();
    if (navigator.share) { navigator.share({ title: t('en.h1b'), text: txt }).catch(function () { /* annulé */ }); return; }
    window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank', 'noopener');
  }
  function doCopy() {
    var u = siteUrl();
    function ok() { A.toast(t('en.share.copied')); }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(u).then(ok, function () { window.prompt('', u); }); } else { window.prompt('', u); }
  }
  root.addEventListener('click', function (e) {
    var g = e.target.closest ? e.target.closest('[data-en-go]') : null;
    if (g) { var el = document.getElementById(g.getAttribute('data-en-go')); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
    var dp = e.target.closest ? e.target.closest('[data-en-dep]') : null;
    if (dp) {
      var sel = document.getElementById('en-dep'), want = dp.getAttribute('data-en-dep');
      if (sel && C) {
        for (var i = 0; i < C.d.length; i++) { if (deptName(C.d[i]) === want) { sel.value = String(i); sel.dispatchEvent(new Event('change')); break; } }
        var f = document.getElementById('en-find'); if (f) { f.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        var cm = document.getElementById('en-com'); if (cm && !cm.disabled) { setTimeout(function () { cm.focus({ preventScroll: true }); }, 500); }
      }
      return;
    }
    if (e.target.closest('[data-en-share]')) { doShare(); return; }
    if (e.target.closest('[data-en-copy]')) { doCopy(); }
  });

  function load() {
    if (state) { return; }
    state = 1;
    root.innerHTML = '<div class="wrap"><p class="empty">…</p></div>';
    Promise.all([getJSON('data/enskri.json'), getJSON('data/civ.json').catch(function () { return null; })]).then(function (r) {
      D = r[0]; C = r[1]; state = 2; render();
    }, function () {
      state = 0;
      root.innerHTML = '<div class="wrap"><div class="ph"><h1>' + esc(t('en.h1b')) + '</h1></div><p class="empty">' + esc(t('en.err')) + '</p></div>';
    });
  }
  A.onPage(function (p) { if (p === 'elec') { load(); } });
  A.enskriShare = doShare;
})();
