(function () {
  'use strict';
  var V = window.VV;
  var API = window.VVApp = {};
  if (!V) { return; }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return Number(n).toLocaleString('fr-FR'); }
  function norm(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[-'’]/g, ' ').replace(/\s+/g, ' ').trim(); }
  API.esc = esc; API.fmt = fmt; API.norm = norm;

  /* ---------- storage (safe) ---------- */
  API.store = {
    get: function (k, d) { try { var v = window.localStorage.getItem('vv.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { window.localStorage.setItem('vv.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  var bus = {};
  API.on = function (ev, fn) { (bus[ev] = bus[ev] || []).push(fn); };
  API.emit = function (ev, a) { (bus[ev] || []).forEach(function (f) { f(a); }); };

  var toastT;
  API.toast = function (msg) {
    var t = document.getElementById('toast');
    if (!t) { return; }
    t.textContent = msg; t.hidden = false; t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('on'); t.hidden = true; }, 2600);
  };
  var cap = window.Capacitor, isNative = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  API.native = isNative;
  API.share = function (o) {
    if (isNative && cap.Plugins && cap.Plugins.Share) { cap.Plugins.Share.share({ title: o.title, text: o.text, url: o.url, dialogTitle: o.title }).catch(function () { /* cancelled */ }); return; }
    if (navigator.share) { navigator.share(o).catch(function () { /* cancelled */ }); return; }
    var txt = o.text + (o.url ? '\n' + o.url : '');
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(function () { API.toast(t('copied')); }, function () { API.toast(t('copy.fail')); }); }
    else { API.toast(t('share.none')); }
  };

  /* ---------- shared data ---------- */
  var P = V.places;
  var C = V.cands.map(function (a, i) {
    var c = { i: i, nom: a[0], pre: a[1], f: a[2], po: a[3], ps: a[4], d: a[5], pa: a[6], lo: a[7], sc: a[8] };
    c.q = norm(c.pre + ' ' + c.nom + ' ' + c.nom + ' ' + c.pre);
    return c;
  });
  var byPlace = P.map(function () { return []; });
  C.forEach(function (c) { if (c.lo >= 0) { V.locs[c.lo].p.forEach(function (p) { byPlace[p].push(c); }); } });
  API.C = C; API.byPlace = byPlace;
  API.pres = C.filter(function (c) { return c.po === 0; }).sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr') || a.pre.localeCompare(b.pre, 'fr'); });
  API.asof = (V.collected || '').slice(0, 10);
  API.where = function (c) {
    if (c.po === 0) { return 'Candidature nationale'; }
    if (c.po === 1) { return 'Sénat · ' + V.deptNames[c.d]; }
    var s = c.sc >= 0 ? ' · ' + V.secs[c.sc].n : '';
    return V.locs[c.lo].l + s + ' · ' + V.deptNames[c.d];
  };
  API.partyGroups = function (list) {
    var m = {};
    list.forEach(function (c) { (m[c.pa] = m[c.pa] || []).push(c); });
    return Object.keys(m).map(Number).sort(function (a, b) { return V.parties[a].localeCompare(V.parties[b], 'fr'); }).map(function (k) {
      return { pa: k, cs: m[k].sort(function (x, y) { return x.ps - y.ps || x.nom.localeCompare(y.nom, 'fr'); }) };
    });
  };
  /* sections communales par commune */
  var secsOf = P.map(function () { return []; });
  V.secs.forEach(function (s, i) { V.locs[s.c].p.forEach(function (p) { secsOf[p].push(i); }); });
  API.secsOf = secsOf;
  var fdateISO = function (iso) { var q = iso.split('-'); return new Date(+q[0], +q[1] - 1, +q[2]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }); };
  document.querySelectorAll('.js-total').forEach(function (el) { el.textContent = fmt(C.length); });
  document.querySelectorAll('.js-asof').forEach(function (el) { el.textContent = API.asof ? 'données du ' + fdateISO(API.asof) : ''; });

  /* ---------- favoris ---------- */
  API.ckey = function (c) { return [c.po, norm(c.nom + ' ' + c.pre), c.lo >= 0 ? V.locs[c.lo].l : '', c.sc >= 0 ? V.secs[c.sc].n : ''].join('|'); };
  var favs = API.store.get('fav', []);
  API.isFav = function (c) { return favs.indexOf(API.ckey(c)) >= 0; };
  API.toggleFav = function (c) {
    var k = API.ckey(c), i = favs.indexOf(k);
    if (i >= 0) { favs.splice(i, 1); } else { favs.push(k); }
    API.store.set('fav', favs);
    API.emit('fav', c);
    API.toast(t(i >= 0 ? 'fav.off' : 'fav.on'));
  };
  API.favList = function () { return C.filter(API.isFav); };
  var RING = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h11v17L12 16.6l-5.5 3.9z"/></svg>';
  API.mark = function (c) { return '<button type="button" class="mk" data-star="' + c.i + '" aria-pressed="' + API.isFav(c) + '" aria-label="' + esc(t('mark.aria', { n: c.pre + ' ' + c.nom })) + '">' + RING + '</button>'; };
  API.star = API.mark;
  /* initiales identiques pour tous ; photo seulement si une source libre et vérifiée existe (js/photos.js) */
  var PH = window.VVPhotos || {};
  API.photoOf = function (c) { return PH[strip(c.nom).toLowerCase() + '|' + strip(c.pre).toLowerCase() + '|' + c.po] || null; };
  API.avatar = function (c, big) {
    var ph = API.photoOf(c), cls = 'av' + (big ? ' big' : '');
    if (ph) { return '<img class="' + cls + ' ph" src="' + esc(ph.f) + '" alt="" loading="lazy" width="' + (big ? 96 : 44) + '" height="' + (big ? 96 : 44) + '">'; }
    return '<span class="' + cls + '" aria-hidden="true">' + esc((c.pre.charAt(0) + c.nom.charAt(0)).toUpperCase()) + '</span>';
  };
  /* une ligne de liste : marge (coche) + nom + précisions ; o.sub = texte sous le nom, o.act = html à droite */
  API.row = function (c, o) {
    o = o || {};
    return '<li class="cc' + (API.isFav(c) ? ' on' : '') + '" data-c="' + c.i + '" tabindex="0">' + API.mark(c) + API.avatar(c) +
      '<span class="cc-t"><b class="nm">' + esc(c.pre) + ' ' + esc(c.nom) + '</b><span class="cc-s"><span class="pt">' + esc(V.parties[c.pa]) + '</span>' + (o.sub ? ' · ' + esc(o.sub) : '') + API.bioBadge(c) + '</span></span>' + (o.act || '') + '</li>';
  };
  document.addEventListener('click', function (e) {
    var s = e.target.closest ? e.target.closest('[data-star]') : null;
    if (!s) { return; }
    e.preventDefault(); e.stopPropagation();
    var id = s.getAttribute('data-star');
    API.toggleFav(C[+id]);
    document.querySelectorAll('[data-star="' + id + '"]').forEach(function (b) {
      var on = API.isFav(C[+b.getAttribute('data-star')]), row = b.closest('.cc, li');
      b.classList.add('just'); b.setAttribute('aria-pressed', on);
      if (row) { row.classList.toggle('on', on); row.classList.add('just'); setTimeout(function () { row.classList.remove('just'); b.classList.remove('just'); }, 500); }
    });
  }, true);

  /* ---------- biographies ---------- */
  var VB = window.VVB, BIOS = VB ? VB.bios : {};
  var strip = function (x) { return x.normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var bkey = function (c) { return strip(c.nom).toUpperCase() + '|' + strip(c.pre).toLowerCase(); };
  API.bioOf = function (c) { return (c.po === 0 && BIOS[bkey(c)]) || null; };
  API.bioBadge = function (c) { return API.bioOf(c) ? '<span class="bio-b">fiche</span>' : ''; };

  /* ---------- historique 2015-2016 ---------- */
  var H = window.VVH;
  API.H = H || null;
  API.links = function (c) { return (H && H.links[c.i]) || null; };
  var circoById = {};
  if (H) { H.circos.forEach(function (c) { circoById[c.id] = c; }); }
  API.circoById = circoById;
  var pcsA = function (x) { return Number(x).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %'; };
  API.pcs = pcsA;
  function histBadge(c) {
    var L = API.links(c);
    if (!L) { return ''; }
    if (L.some(function (x) { return x.el; })) { return '<span class="hb elu">élu</span>'; }
    if (L.some(function (x) { return x.k === 'p'; })) { return '<span class="hb">2016</span>'; }
    return '<span class="hb">2015</span>';
  }
  var oldBadge = API.bioBadge;
  API.bioBadge = function (c) { return oldBadge(c) + histBadge(c); };
  API.histLines = function (c) {
    var L = API.links(c) || [];
    return L.map(function (x) {
      var tag = x.p ? ' (' + esc(x.p) + ')' : '';
      if (x.k === 'p') { return 'Candidat à la présidentielle du 20 novembre 2016 : ' + x.r + 'e sur ' + x.nc + ', ' + fmt(x.v) + ' voix (' + pcsA(x.pc) + ' des votes).'; }
      if (x.k === 's') {
        var dn = V.deptNames[x.d];
        if (x.el) { return 'Élu sénateur ' + (x.dt ? '(' + esc(x.dt) + ', département ' + esc(dn) + ')' : 'en 2015 (département ' + esc(dn) + ')') + tag + (x.v != null ? ' : ' + fmt(x.v) + ' voix' + (x.pc != null ? ' (' + pcsA(x.pc) + ')' : '') : (x.pc != null ? ' : ' + pcsA(x.pc) : '')) + '.'; }
        return 'Candidat au Sénat (' + esc(dn) + ') en 2015' + tag + ' : ' + (x.r ? x.r + 'e au 1er tour, ' : '') + fmt(x.v) + ' voix (' + pcsA(x.pc) + ' ; 2 voix par électeur), sur ' + x.nc + ' candidats' + (x.q ? ' ; qualifié pour le 2e tour, sans résultat publié dans nos sources' : '') + '.';
      }
      var c2 = circoById[x.c], where = c2 ? c2.n : '';
      var other = x.x ? ' (autre circonscription que celle de 2026)' : '';
      if (x.el && x.dt) { return 'Élu député de ' + esc(where) + tag + ' à la reprise du scrutin (' + (x.rd === 2 ? '2e tour' : '1er tour') + ' du ' + esc(x.dt) + ') : ' + fmt(x.v) + ' voix (' + pcsA(x.pc) + ' des votes valides)' + other + (x.src === 'wiki' ? ' ; source : tableau Wikipédia, non confirmé par le CEP' : '') + '.'; }
      if (x.el) { return 'Élu député de ' + esc(where) + ' en 2015' + tag + ', ' + (x.rd === 2 ? 'au 2e tour' : 'au 1er tour') + ' : ' + fmt(x.v) + ' voix (' + pcsA(x.pc) + ')' + (x.r1v ? ' ; ' + fmt(x.r1v) + ' voix au 1er tour' : '') + other + '.'; }
      return 'Candidat à la députation (' + esc(where) + ') en 2015' + tag + ' : ' + (x.r ? x.r + 'e au 1er tour, ' : '') + fmt(x.v) + ' voix (' + pcsA(x.pc) + '), sur ' + x.nc + ' candidats' + other + '.';
    });
  };

  /* ---------- pages ---------- */
  var PAGES = ['home', 'bulletin', 'carte', 'cand', 'res', 'cal', 'elec', 'news', 'about'];
  var NAVMAP = { cal: 'cal', elec: 'elec', news: 'news', about: 'about' };
  var hooks = [];
  API.onPage = function (fn) { hooks.push(fn); };
  function show(name, silent) {
    if (PAGES.indexOf(name) < 0) { name = 'home'; }
    PAGES.forEach(function (p) { var el = document.getElementById('p-' + p); if (el) { el.hidden = (p !== name); } });
    document.querySelectorAll('[data-go]').forEach(function (b) {
      if (b.getAttribute('data-go') === name) { b.setAttribute('aria-current', 'page'); } else { b.removeAttribute('aria-current'); }
    });
    document.body.setAttribute('data-page', name);
    if (!silent) {
      try { history.replaceState(null, '', '#' + name); } catch (e) { /* sandboxed */ }
      window.scrollTo(0, 0);
    }
    if (API.onShow) { API.onShow(name); }
    hooks.forEach(function (f) { f(name); });
  }
  API.show = show;
  var menu = document.getElementById('menu');
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-go]') : null;
    if (b) { e.preventDefault(); if (menu && menu.open) { menu.close(); } show(b.getAttribute('data-go')); }
  });
  window.addEventListener('hashchange', function () { show((location.hash || '').slice(1), true); });
  var mbtn = document.getElementById('menu-btn');
  if (mbtn && menu) {
    mbtn.addEventListener('click', function () { menu.showModal(); });
    menu.addEventListener('click', function (e) { if (e.target === menu || e.target.closest('.f-x')) { menu.close(); } });
  }

  /* ---------- thème ---------- */
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') { document.documentElement.setAttribute('data-theme', t); } else { document.documentElement.removeAttribute('data-theme'); }
    document.querySelectorAll('#theme-seg button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-theme') === (t || 'auto'))); });
  }
  applyTheme(API.store.get('theme', 'auto'));
  var seg = document.getElementById('theme-seg');
  if (seg) { seg.addEventListener('click', function (e) { var b = e.target.closest('button[data-theme]'); if (b) { var t = b.getAttribute('data-theme'); API.store.set('theme', t); applyTheme(t); } }); }

  /* ---------- ma commune ---------- */
  var cur = null; // {pi, sec}
  (function restore() {
    var s = API.store.get('loc', null);
    if (!s) { return; }
    for (var i = 0; i < P.length; i++) {
      if (P[i].n === s.pn && V.deptNames[P[i].d] === s.dn) {
        var sec = -1;
        if (s.sn) { secsOf[i].forEach(function (k) { if (V.secs[k].n === s.sn) { sec = k; } }); }
        cur = { pi: i, sec: sec };
        return;
      }
    }
  })();
  API.loc = function () { return cur; };
  API.setLoc = function (pi, sec) {
    cur = pi == null || pi < 0 ? null : { pi: pi, sec: sec == null ? -1 : sec };
    API.store.set('loc', cur ? { pn: P[cur.pi].n, dn: V.deptNames[P[cur.pi].d], sn: cur.sec >= 0 ? V.secs[cur.sec].n : '' } : null);
    API.emit('loc', cur);
  };
  API.placeLabel = function (pi) { return P[pi].n + ' · ' + V.deptNames[P[pi].d]; };

  /* géolocalisation → commune (point dans polygone sur le fond de carte) */
  var cvs, ctx, paths = {};
  function projPt(lon, lat) {
    var pr = V.proj, mx = (lon + 180) / 360, my = 0.5 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / (2 * Math.PI);
    return [pr.pad + (mx - pr.x0) * pr.s, pr.pad + (my - pr.y0) * pr.s];
  }
  API.placeAt = function (lon, lat) {
    if (!V.proj) { return -1; }
    var xy = projPt(lon, lat), x = xy[0], y = xy[1];
    if (!ctx) { cvs = document.createElement('canvas'); ctx = cvs.getContext('2d'); }
    var best = -1, bd = 1e9;
    for (var i = 0; i < P.length; i++) {
      var p = P[i];
      if (!p.p) { continue; }
      var b = p.b;
      if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) {
        if (!paths[i]) { paths[i] = new Path2D(p.p); }
        if (ctx.isPointInPath(paths[i], x, y, 'evenodd')) { return i; }
      }
      var dx = p.c[0] - x, dy = p.c[1] - y, dd = dx * dx + dy * dy;
      if (dd < bd) { bd = dd; best = i; }
    }
    // hors polygone (mer, tolérance) : commune la plus proche si < ~12 km
    var kmPerUnit = 40075 * Math.cos(lat * Math.PI / 180) / (V.proj.s);
    return Math.sqrt(bd) * kmPerUnit < 12 ? best : -1;
  };
  API.locate = function (cb) {
    var G = isNative && cap.Plugins && cap.Plugins.Geolocation;
    if (G) {
      G.requestPermissions().then(function () { return G.getCurrentPosition({ enableHighAccuracy: false, timeout: 12000 }); }).then(function (pos) {
        var pi = API.placeAt(pos.coords.longitude, pos.coords.latitude);
        cb(pi, pi < 0 ? t('gps.out') : '');
      }).catch(function () { cb(-1, t('gps.denied')); });
      return;
    }
    if (!navigator.geolocation) { cb(-1, t('gps.none')); return; }
    navigator.geolocation.getCurrentPosition(function (pos) {
      var pi = API.placeAt(pos.coords.longitude, pos.coords.latitude);
      cb(pi, pi < 0 ? t('gps.out') : '');
    }, function () { cb(-1, t('gps.denied')); }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
  };

  /* ---------- search ---------- */
  var placeIndex = P.map(function (p) { return norm(p.n); });
  API.attachSearch = function (input, list, onPick) {
    function run() {
      var q = norm(input.value);
      if (q.length < 2) { list.hidden = true; list.innerHTML = ''; return; }
      var toks = q.split(' '), out = [];
      P.forEach(function (p, i) { if (placeIndex[i].indexOf(q) >= 0 && out.length < 4) { out.push({ k: 'p', i: i }); } });
      var pj = V.parties.map(function (p, i) { return norm(p) === q ? i : -1; }).filter(function (i) { return i >= 0; });
      pj.forEach(function (i) { out.push({ k: 'pa', i: i }); });
      for (var j = 0; j < C.length && out.length < 10; j++) {
        if (toks.every(function (t) { return C[j].q.indexOf(t) >= 0; })) { out.push({ k: 'c', i: j }); }
      }
      if (!out.length) { list.innerHTML = '<li class="none">Aucun résultat pour « ' + esc(input.value) + ' »</li>'; list.hidden = false; return; }
      list.innerHTML = out.map(function (o) {
        if (o.k === 'p') { return '<li><button type="button" data-k="p" data-i="' + o.i + '"><b>' + esc(P[o.i].n) + '</b><span>Commune · ' + esc(V.deptNames[P[o.i].d]) + '</span></button></li>'; }
        if (o.k === 'pa') { return '<li><button type="button" data-k="pa" data-i="' + o.i + '"><b>' + esc(V.parties[o.i]) + '</b><span>Parti · voir ses candidats</span></button></li>'; }
        var c = C[o.i];
        return '<li><button type="button" data-k="c" data-i="' + o.i + '"><b>' + esc(c.pre) + ' ' + esc(c.nom) + '</b><span>' + esc(V.postes[c.po]) + ' · ' + esc(V.parties[c.pa]) + ' · ' + esc(API.where(c)) + '</span></button></li>';
      }).join('');
      list.hidden = false;
    }
    input.addEventListener('input', run);
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape') { list.hidden = true; } });
    list.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-k]');
      if (!b) { return; }
      list.hidden = true; input.value = '';
      onPick(b.getAttribute('data-k'), +b.getAttribute('data-i'));
    });
    document.addEventListener('click', function (e) { if (e.target !== input && !list.contains(e.target)) { list.hidden = true; } });
  };

  /* ---------- home ---------- */
  var FEM = C.filter(function (c) { return c.f; }).length;
  var elPosts = document.getElementById('h-posts');
  if (elPosts) {
    elPosts.innerHTML = [0, 1, 2, 3, 4, 5].map(function (po) {
      var n = C.filter(function (c) { return c.po === po; }).length;
      return '<li><button type="button" class="rb" data-poste="' + po + '"><span class="k">' + esc(t('post.' + po)) + '</span><span class="n">' + fmt(n) + '</span></button></li>';
    }).join('');
    elPosts.addEventListener('click', function (e) { var b = e.target.closest('[data-poste]'); if (b) { show('cand'); API.emit('poste', +b.getAttribute('data-poste')); } });
    var note = document.getElementById('h-fem');
    if (note) { note.textContent = t('home.fem', { n: Math.round(100 * FEM / C.length) }); }
  }
  var ft = document.getElementById('foot-t');
  if (ft) { ft.textContent = t('foot', { d: fdateISO(API.asof) }); }
  /* nouveautés de la dernière collecte */
  var elCh = document.getElementById('h-changes'), CH = window.VVChanges;
  if (elCh && CH && (CH.nAdded || CH.nRemoved)) {
    var when = new Date(CH.t), dd = when.toLocaleDateString(window.NVLang === 'ht' ? 'fr-FR' : 'fr-FR', { day: 'numeric', month: 'long' }), hh = when.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    var parts = Object.keys(CH.by).filter(function (k) { return CH.by[k].added; }).map(function (k) { return t('post.' + ['Président', 'Sénateur', 'Député', 'Maire', 'CASEC', 'ASEC'].indexOf(k)) + ' +' + CH.by[k].added; });
    var list = (CH.added || []).filter(function (i) { return C[i]; }).slice(0, 10);
    elCh.innerHTML = '<details class="chg"><summary><span class="chg-d">' + esc(t('home.changes')) + '</span><b>' + (CH.nAdded ? esc(t('home.changes.add', { n: fmt(CH.nAdded) })) : '') + (CH.nRemoved ? (CH.nAdded ? ', ' : '') + esc(t('home.changes.rem', { n: fmt(CH.nRemoved) })) : '') + '</b><span class="chg-w">' + esc(t('home.changes.at', { d: dd, h: hh })) + '</span></summary>' +
      '<p class="note-s">' + esc(parts.join(' · ')) + '</p>' +
      (list.length ? '<ul class="chg-l">' + list.map(function (i) { var c = C[i]; return '<li data-c="' + i + '" tabindex="0"><b>' + esc(c.pre + ' ' + c.nom) + '</b><span>' + esc(V.postes[c.po]) + ' · ' + esc(API.where(c)) + '</span></li>'; }).join('') + '</ul>' + (CH.nAdded > list.length ? '<p class="note-s">' + esc(t('home.changes.more', { n: CH.nAdded - list.length })) + '</p>' : '') : '') + '</details>';
  }
  var elPres = document.getElementById('h-pres');
  if (elPres) {
    elPres.innerHTML = API.pres.map(function (c) { return API.row(c); }).join('');
    var pn = document.getElementById('h-pres-note');
    if (pn) { pn.textContent = t('home.pres.hint', { n: API.pres.length, d: fdateISO(API.asof) }); }
  }
  var elMini = document.getElementById('h-mini');
  if (elMini) {
    var dv = V.depts.map(function () { return 0; });
    C.forEach(function (c) { if (c.po === 2 && c.d >= 0) { dv[c.d]++; } });
    var mx = Math.max.apply(null, dv);
    elMini.setAttribute('viewBox', '0 0 ' + V.W + ' ' + V.H);
    elMini.innerHTML = P.map(function (p) {
      return p.p ? '<path d="' + p.p + '" fill-rule="evenodd" class="mp" style="fill-opacity:' + (0.16 + 0.78 * dv[p.d] / mx).toFixed(2) + '"></path>' : '';
    }).join('') + V.depts.map(function (d) { return '<path d="' + d.l + '" fill-rule="evenodd" class="md"></path>'; }).join('');
  }
  var elH = document.getElementById('h-hist');
  if (elH && H) {
    var st = H.stat, nat = H.pres.nat[0];
    var cards = [
      ['Présidentielle 2016', nat.n + ', ' + pcsA(nat.pc) + ' des votes (' + fmt(nat.v) + ' voix).', 'pres'],
      ['Députés 2015-2017', fmt(st.elus) + ' élus sur ' + st.circos + ' circonscriptions ; ' + st.late + ' n’ont eu leur élu qu’après une reprise.', 'dep'],
      ['Sénat 2015-2017', (st.sen_el + st.sen17) + ' sénateurs élus, trois sièges par département.', 'sen']
    ];
    elH.innerHTML = cards.map(function (c) {
      return '<li><button type="button" class="rb" data-res="' + c[2] + '"><span><b class="k">' + esc(c[0]) + '</b><span class="s" style="display:block;font-size:.88rem;color:var(--ink-2)">' + esc(c[1]) + '</span></span><span class="lk">›</span></button></li>';
    }).join('');
    elH.addEventListener('click', function (e) {
      var b = e.target.closest('[data-res]');
      if (b) { show('res'); API.emit('res', b.getAttribute('data-res')); }
    });
  }
  var hs = document.getElementById('h-search'), hr = document.getElementById('h-results');
  if (hs && hr) {
    API.attachSearch(hs, hr, function (k, i) {
      if (k === 'c') { API.openFiche(i); return; }
      if (k === 'pa') { show('cand'); API.emit('party', i); return; }
      API.setLoc(i, -1); show('bulletin');
    });
  }

  /* bandeau « mon bulletin » sur l'accueil */
  var elSaved = document.getElementById('h-saved');
  function renderSaved() {
    if (!elSaved) { return; }
    if (!cur) { elSaved.innerHTML = ''; return; }
    var n = (API.countFor ? API.countFor(cur) : 0);
    elSaved.innerHTML = '<button type="button" class="saved" data-go="bulletin"><span class="sv"><b>' + esc(P[cur.pi].n) + '</b><span>' + esc(V.deptNames[P[cur.pi].d]) + (n ? ' · ' + esc(t('home.saved.n', { n: fmt(n) })) : '') + '</span></span><span class="go">' + esc(t('home.saved.go')) + '</span></button>';
  }
  API.on('loc', renderSaved);
  API.renderSaved = renderSaved;

  /* chip de localisation dans l'en-tête (ordinateur) */
  var chip = document.getElementById('loc-chip');
  function renderChip() {
    if (!chip) { return; }
    if (!cur) { chip.hidden = true; return; }
    chip.hidden = false; chip.textContent = P[cur.pi].n;
  }
  API.on('loc', renderChip); renderChip();
  if (chip) { chip.addEventListener('click', function () { show('bulletin'); }); }

  /* ---------- live data: agenda, calendar, voters, news ---------- */
  var E = window.VVE;
  if (E) {
    var DAY = 86400000, now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var d0 = function (iso) { var q = iso.split('-'); return new Date(+q[0], +q[1] - 1, +q[2]); };
    var daysTo = function (iso) { return Math.round((d0(iso) - today) / DAY); };
    var fdate = function (iso, o) { return d0(iso).toLocaleDateString('fr-FR', o || { day: 'numeric', month: 'long', year: 'numeric' }); };
    var frange = function (a, b) {
      if (a === b) { return fdate(a); }
      var A2 = d0(a), B2 = d0(b);
      return (A2.getFullYear() === B2.getFullYear() ? A2.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : fdate(a)) + ' – ' + fdate(b);
    };
    var statusOf = function (a, b) { return daysTo(b) < 0 ? 'done' : (daysTo(a) <= 0 ? 'now' : 'next'); };
    var STL = { done: 'Passée', now: 'En cours', next: 'À venir' };
    var left = function (n) { return n === 0 ? t('days.0') : (n === 1 ? t('days.1') : t('days.n', { n: fmt(n) })); };
    API.daysTo = daysTo; API.fdate = fdate; API.left = left;

    var agendaItems = [
      ['date.1', '2026-10-13', 'Date du calendrier du 27 juillet ; le CEP indique que l’inscription se poursuit'],
      ['date.2', '2026-10-31', 'Prolongée par le CEP le 5 octobre'],
      ['date.3', '2026-12-13', 'Date annoncée ; un calendrier actualisé doit être publié'],
      ['date.4', '2027-02-21', 'Date annoncée ; un calendrier actualisé doit être publié']
    ].filter(function (a) { return daysTo(a[1]) >= 0; }).slice(0, 4);
    var elAg = document.getElementById('h-agenda');
    if (elAg) {
      elAg.innerHTML = agendaItems.map(function (a) {
        return '<li class="rl"><span><b class="d">' + esc(fdate(a[1])) + '</b><span class="s">' + esc(t(a[0])) + '. ' + esc(a[2]) + '</span></span><span class="j">' + esc(left(daysTo(a[1]))) + '</span></li>';
      }).join('');
    }

    function feedHtml(items) {
      return items.map(function (n) {
        return '<article class="fi"><div class="fi-m"><b>' + esc(n.src) + '</b> · ' + esc(fdate(n.date, { day: 'numeric', month: 'long', year: 'numeric' })) + '</div><h3><a href="' + esc(n.u) + '" target="_blank" rel="noopener noreferrer">' + esc(n.t) + '</a></h3>' + (n.s ? '<p>' + esc(n.s) + '</p>' : '') + '</article>';
      }).join('');
    }
    var news = E.news.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    var elFeed = document.getElementById('h-feed'); if (elFeed) { elFeed.innerHTML = feedHtml(news.slice(0, 3)); }
    var elNews = document.getElementById('n-feed'); if (elNews) { elNews.innerHTML = feedHtml(news); }

    var elVotes = document.getElementById('c-votes');
    if (elVotes) {
      var vc = [
        ['cal.first', '2026-12-13', 'Présidentielle, législatives et ratification populaire des changements proposés à la Constitution.'],
        ['cal.second', '2027-02-21', 'Présidentielle, législatives et élections des collectivités territoriales.']
      ];
      elVotes.innerHTML = vc.map(function (v) {
        var n = daysTo(v[1]);
        return '<div class="vc"><span class="vc-k">' + esc(t(v[0])) + '</span><span class="vc-d">' + esc(fdate(v[1], { day: 'numeric', month: 'long', year: 'numeric' })) + '</span><span class="vc-j">' + (n >= 0 ? esc(left(n)) : esc(t('days.past'))) + '</span><p>' + esc(v[2]) + '</p></div>';
      }).join('');
    }
    var NOTES = {
      6: 'Prolongée jusqu’au 31 octobre par le CEP (note du 5 octobre). Elle devait d’abord s’achever le 2 octobre, puis le 14 octobre.',
      10: 'Reportée : le CEP communiquera de nouvelles dates dans son calendrier actualisé (note du 5 octobre). Dates initiales du calendrier du 27 juillet.',
      5: 'Ouverte le 20 juillet dans neuf départements et le 30 juillet dans l’Ouest.'
    };
    var stepLi = function (tt, a, b, key, note, pp) {
      if (pp) {
        return '<li class="st"><div class="st-top"><h3>' + esc(tt) + '</h3><span class="pill now">Reportée</span></div><div class="st-date">Dates à communiquer (initialement ' + esc(frange(a, b)) + ')</div>' + (note ? '<p>' + esc(note) + '</p>' : '') + '</li>';
      }
      if (!a) {
        return '<li class="st"><div class="st-top"><h3>' + esc(tt) + '</h3><span class="pill">À confirmer</span></div><div class="st-date">Nouvelle date non communiquée</div>' + (note ? '<p>' + esc(note) + '</p>' : '') + '</li>';
      }
      var st2 = statusOf(a, b);
      return '<li class="st ' + st2 + '"><div class="st-top"><h3>' + esc(tt) + '</h3><span class="pill ' + (st2 === 'next' ? '' : st2) + '">' + STL[st2] + '</span></div><div class="st-date">' + esc(frange(a, b)) + '</div>' + (note ? '<p>' + esc(note) + '</p>' : '') + '</li>';
    };
    var elKey = document.getElementById('c-key');
    if (elKey) { elKey.innerHTML = E.cal.filter(function (c) { return c.key; }).map(function (c) { return stepLi(c.t, c.a, c.b, true, NOTES[c.n], c.pp); }).join(''); }
    var elReg = document.getElementById('c-reg');
    if (elReg) { elReg.innerHTML = E.reg.map(function (r) { return stepLi(r.t, r.a, r.b, false, r.a ? '' : 'Elle était prévue le 14 octobre avant le réaménagement du calendrier annoncé par le CEP le 5 octobre.'); }).join(''); }
    var elAll = document.getElementById('c-all');
    if (elAll) {
      elAll.innerHTML = '<table class="ctab2"><thead><tr><th>N°</th><th>Étape</th><th>Dates</th></tr></thead><tbody>' + E.cal.map(function (c) {
        return '<tr><td>' + c.n + '</td><td>' + esc(c.t) + '</td><td class="dt">' + (c.pp ? 'À communiquer' : esc(frange(c.a, c.b))) + '</td></tr>';
      }).join('') + '</tbody></table>';
    }

    var V2 = E.voters, elK = document.getElementById('e-kpis');
    if (elK) {
      var ref = V2.refs[0], diff = V2.total - ref.v;
      document.getElementById('e-asof').textContent = 'Relevé du ' + fdate(E.collected) + ' · CEP';
      elK.innerHTML =
        '<div class="kpi"><span>Électeurs inscrits</span><b>' + fmt(V2.total) + '</b><em>+' + fmt(diff) + ' depuis le ' + fdate(ref.date, { day: 'numeric', month: 'long' }) + ' (' + fmt(ref.v) + ')</em></div>' +
        '<div class="kpi"><span>Centres d’inscription et de vote actifs</span><b>' + fmt(V2.civActive) + '</b><em>sur ' + fmt(V2.civTotal) + ' configurés</em></div>' +
        '<div class="kpi"><span>Opérateurs actifs</span><b>' + fmt(V2.operators) + '</b></div>';
      var rates = V2.dept.map(function (d) { return d.v / d.cap; }), mxr = Math.max.apply(null, rates);
      document.getElementById('e-dept').innerHTML = V2.dept.slice().sort(function (a, b) { return b.v / b.cap - a.v / a.cap; }).map(function (d) {
        var r = d.v / d.cap;
        return '<li class="vb"><span class="vb-l">' + esc(d.n) + '</span><span class="vb-b"><i style="width:' + Math.round(100 * r / mxr) + '%"></i></span><span class="vb-n">' + fmt(d.v) + '</span><span class="vb-r">' + (Math.round(r * 1000) / 10).toLocaleString('fr-FR') + ' %</span></li>';
      }).join('');
      document.getElementById('e-note').textContent = 'Taux calculé par NapVote : inscrits ÷ capacité d’inscription publiée par le CEP pour chaque département (population en âge de voter). Le CEP publie l’Ouest sous l’intitulé « Ouest 1 ». Départements classés par taux d’inscription.';
    }
  }

  /* ---------- fiches candidat ---------- */
  var dlg = document.getElementById('fiche'), fbody = document.getElementById('f-body');
  function longDate(iso) { var q = iso.split('-'); return new Date(+q[0], +q[1] - 1, +q[2]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); }
  API.openFiche = function (id) {
    var c = C[id];
    if (!c || !dlg) { return; }
    var b = API.bioOf(c), where = c.po === 0 ? 'Candidature nationale' : API.where(c);
    var phc = API.photoOf(c);
    var h = '<div class="f-head">' + API.avatar(c, true) + '<h2 id="f-title">' + esc(c.pre) + ' ' + esc(c.nom) + '</h2></div>';
    if (phc) { h += '<p class="f-credit">' + esc(t('photo.credit')) + ' ' + esc(phc.a) + ', ' + esc(phc.l) + ' · <a href="' + esc(phc.u) + '" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a></p>'; }
    h += '<div class="f-chips"><span class="pt">' + esc(V.parties[c.pa]) + '</span><span class="f-g">' + esc(V.postes[c.po]) + ' · ' + esc(c.po === 0 ? t('c.national') : where) + '</span>' + (c.po >= 3 ? '<span class="f-g">' + esc(V.pos[c.ps]) + '</span>' : '') + (b && b.group ? '<span class="f-g">' + esc(b.group) + '</span>' : '') + (b && b.born ? '<span class="f-g">Né en ' + esc(b.born) + '</span>' : '') + '</div>';
    h += '<div class="f-acts"><button type="button" class="btn sm' + (API.isFav(c) ? ' on' : '') + '" data-ffav="' + c.i + '">' + esc(t(API.isFav(c) ? 'f.fav.on' : 'f.fav.add')) + '</button><button type="button" class="btn sm ghost" data-fshare="' + c.i + '">' + esc(t('f.share')) + '</button></div>';
    if (b) {
      h += '<p class="f-sum">' + esc(b.sum) + '</p>';
      if (b.conf === 'minimal') { h += '<div class="notice">Peu d’informations publiques fiables ont été trouvées sur ce candidat.</div>'; }
      if (b.warn) { h += '<div class="notice">' + esc(b.warn) + '</div>'; }
      h += '<h3>' + esc(t('f.facts')) + '</h3><dl class="f-facts">' + b.facts.map(function (f) { return '<dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd>'; }).join('') + '</dl>';
      if (b.notes && b.notes.length) {
        h += '<h3>Éléments publics à connaître</h3><p class="f-intro">Faits rapportés par les sources citées. Ils ne préjugent ni des décisions de justice ni de celles du CEP.</p>' + b.notes.map(function (n) { return '<p class="f-note">' + esc(n) + '</p>'; }).join('');
      }
      h += '<h3>' + esc(t('f.sources')) + '</h3><ul class="f-src">' + b.src.map(function (r) { return '<li><a href="' + esc(r.u) + '" target="_blank" rel="noopener noreferrer">' + esc(r.l) + '</a>' + (r.d ? '<span>' + esc(r.d) + '</span>' : '') + '</li>'; }).join('') + '</ul>';
      h += '<p class="f-foot">Fiche compilée le ' + esc(longDate(VB.asof)) + ' à partir des sources publiques ci-dessus. La candidature reste soumise à la liste définitive des candidats agréés, dont la nouvelle date n’a pas encore été communiquée par le CEP.</p>';
    } else {
      h += c.po === 0
        ? '<div class="notice info">Aucune biographie vérifiée n’a été trouvée dans des sources publiques fiables. Pour éviter de confondre des homonymes, NapVote n’associe une biographie à un candidat que lorsqu’une source confirme son identité.</div>'
        : '<div class="notice info">NapVote n’affiche pas de biographie pour ce poste : seules des informations vérifiées sont publiées, pour ne pas confondre des homonymes.</div>';
      h += '<dl class="f-facts"><dt>Poste</dt><dd>' + esc(V.postes[c.po]) + (c.po >= 3 ? ' · ' + esc(V.pos[c.ps]) : '') + '</dd><dt>Parti</dt><dd>' + esc(V.parties[c.pa]) + '</dd>' +
        (c.po > 0 ? '<dt>' + (c.po === 1 ? 'Département' : (c.po === 2 ? 'Circonscription' : 'Commune')) + '</dt><dd>' + esc(c.po === 1 ? V.deptNames[c.d] : V.locs[c.lo].l + ' · ' + V.deptNames[c.d]) + '</dd>' : '') +
        (c.sc >= 0 ? '<dt>Section communale</dt><dd>' + esc(V.secs[c.sc].n) + '</dd>' : '') + '</dl>';
      h += '<p class="f-foot">Données : liste publique de candidatures du CEP (' + esc(API.asof ? fdateISO(API.asof) : '') + ').</p>';
    }
    var hl = API.histLines(c);
    if (hl.length) {
      h += '<h3>' + esc(t('f.hist')) + '</h3><ul class="f-hist">' + hl.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul><p class="f-foot">D’après les résultats préliminaires du CEP (2015-2016). Rapprochement fondé sur la correspondance des noms dans la même zone : en cas d’homonymie, vérifiez auprès du CEP.</p>';
    }
    var peers = [];
    if (c.po === 2 && c.lo >= 0) { peers = C.filter(function (x) { return x.po === 2 && x.lo === c.lo && x.i !== c.i; }); }
    else if (c.po === 3 && c.lo >= 0) { peers = C.filter(function (x) { return x.po === 3 && x.lo === c.lo && x.pa === c.pa && x.i !== c.i; }); }
    else if (c.po >= 4 && c.sc >= 0) { peers = C.filter(function (x) { return x.po === c.po && x.sc === c.sc && x.pa === c.pa && x.i !== c.i; }); }
    if (peers.length) {
      var ttl = t(c.po === 2 ? 'f.peers.dep' : 'f.peers.list');
      h += '<h3>' + ttl + ' (' + peers.length + ')</h3><ul class="f-riv">' + peers.map(function (x) {
        return '<li><button type="button" data-cf="' + x.i + '"><span>' + esc(x.pre) + ' <b>' + esc(x.nom) + '</b></span><span class="pt">' + esc(c.po === 2 ? V.parties[x.pa] : V.pos[x.ps]) + '</span></button></li>';
      }).join('') + '</ul>';
    }
    if (c.po > 0) { h += '<div class="f-acts2"><button type="button" class="f-map" data-fmap="' + c.i + '">' + esc(t('f.map')) + '</button>' + (c.lo >= 0 ? '<button type="button" class="f-map" data-fbul="' + c.i + '">' + esc(t('f.bul')) + '</button>' : '') + '</div>'; }
    fbody.innerHTML = h;
    if (!dlg.open) { dlg.showModal(); }
    dlg.querySelector('.f-in').scrollTop = 0;
  };
  if (dlg) {
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || e.target.closest('.f-x')) { dlg.close(); return; }
      var rv = e.target.closest('[data-cf]');
      if (rv) { API.openFiche(+rv.getAttribute('data-cf')); return; }
      var fv = e.target.closest('[data-ffav]');
      if (fv) { var cc = C[+fv.getAttribute('data-ffav')]; API.toggleFav(cc); API.openFiche(cc.i); return; }
      var sh = e.target.closest('[data-fshare]');
      if (sh) { var c3 = C[+sh.getAttribute('data-fshare')]; API.share({ title: c3.pre + ' ' + c3.nom, text: c3.pre + ' ' + c3.nom + ' — candidat ' + V.postes[c3.po] + ' (' + V.parties[c3.pa] + '), ' + API.where(c3) + '. Sur NapVote.', url: location.href.split('#')[0] }); return; }
      var m = e.target.closest('[data-fmap]');
      if (m) { dlg.close(); show('carte'); if (window.VVMap) { window.VVMap.pickCandidate(+m.getAttribute('data-fmap')); } return; }
      var bl = e.target.closest('[data-fbul]');
      if (bl) { var c4 = C[+bl.getAttribute('data-fbul')], pl = V.locs[c4.lo].p[0]; dlg.close(); API.setLoc(pl, c4.sc >= 0 ? c4.sc : -1); show('bulletin'); }
    });
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-c]') : null;
    if (!el || el.closest('dialog') || e.target.closest('button, a')) { return; }
    API.openFiche(+el.getAttribute('data-c'));
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-c][tabindex]')) { e.preventDefault(); API.openFiche(+e.target.getAttribute('data-c')); }
  });

  API.boot = function () {
    var start = (location.hash || '').slice(1);
    if (PAGES.indexOf(start) >= 0) { show(start, true); }
    else { show(cur && !start ? 'home' : 'home', true); }
    renderSaved();
  };
})();
