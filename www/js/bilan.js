/* Bilan figé du sondage (édition 1, arrêté le 17 novembre 2026) : data/bilan.json, fabriqué une seule fois par scripts/build_bilan.py.
   Le texte fixe est dans index.html (data-i18n) ; ce fichier remplit les chiffres et dessine les graphiques.
   Les animations au défilement sont dans css/bilan.css (animation-timeline) : sans prise en charge, la page s'affiche complète, immobile. */
(function () {
  'use strict';
  var V = window.VV, A = window.VVApp, root = document.getElementById('bl-root'), live = document.getElementById('sres-live');
  if (!V || !A || !root || !live) { return; }
  var esc = A.esc, norm = A.norm, tt = window.t;
  var D = null, loading = false, painted = false;
  function $(id) { return document.getElementById(id); }
  function fmt(n) { return Number(n).toLocaleString('fr-FR').replace(/\u202f/g, '\u00a0'); }  // espace insécable ordinaire : l'espace fine colle les chiffres en police à empattements
  function pc(n, tot, dec) { return tot ? (100 * n / tot).toLocaleString('fr-FR', { minimumFractionDigits: dec == null ? 1 : dec, maximumFractionDigits: dec == null ? 1 : dec }) + ' %' : '–'; }
  function dayLong(iso) { return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }); }
  function dayShort(iso) { return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); }
  function setText(id, key, vars) { var el = $(id); if (el) { el.textContent = tt(key, vars); } }
  function who(r) { return (r[0] + ' ' + r[1]).trim(); }
  /* dans une phrase : « Wilner Joseph », pas « Wilner JOSEPH » (les listes gardent « Prénom NOM », comme le reste du site) */
  function whoT(r) { return (r[0] + ' ' + r[1].toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, function (m, a, b) { return a + b.toUpperCase(); })).trim(); }
  function party(r) { return r[2] >= 0 ? D.parties[r[2]] : ''; }
  var FEW = 30;

  /* ---------- onglets : bilan figé / sondage relancé ---------- */
  var tabB = $('bl-tab-b'), tabL = $('bl-tab-l');
  function tab(which, focus) {
    var b = which !== 'l';
    root.hidden = !b; live.hidden = b;
    tabB.setAttribute('aria-selected', String(b)); tabL.setAttribute('aria-selected', String(!b));
    tabB.tabIndex = b ? 0 : -1; tabL.tabIndex = b ? -1 : 0;
    if (focus) { (b ? tabB : tabL).focus(); }
    if (b) { ensure(); } else { window.scrollTo(0, 0); }
  }
  A.blTab = tab;
  document.addEventListener('click', function (e) {
    var x = e.target.closest ? e.target.closest('[data-bl-tab]') : null;
    if (x) { tab(x.getAttribute('data-bl-tab')); if (x.closest('#bl-root')) { window.scrollTo(0, 0); } }
    var j = e.target.closest ? e.target.closest('[data-bl-jump]') : null;
    if (j) {
      var el = $(j.getAttribute('data-bl-jump')), calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var dt = el && el.querySelector ? el.querySelector('details') : null; if (dt) { dt.open = true; }  // les notes de lecture sont repliées : le lien les déplie
      if (el) { el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }); }
    }
  });
  tabB.parentNode.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault(); tab((e.key === 'ArrowRight' || e.key === 'End') ? 'l' : 'b', true);
    }
  });

  /* ---------- effet de comptage : le nombre monte jusqu'à sa valeur quand il apparaît à l'écran ---------- */
  var calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function countUp(el, to) {
    el.textContent = fmt(to);
    if (calm || !('IntersectionObserver' in window) || !to) { return; }
    el.style.minWidth = el.getBoundingClientRect().width + 'px';  // la largeur finale est réservée : le texte autour ne bouge pas pendant le comptage
    el.textContent = '0';
    var done = false;
    function run() {
      if (done) { return; } done = true;
      var t0 = performance.now(), dur = 1900;
      (function step(now) {
        var p = Math.min(1, (now - t0) / dur);
        el.textContent = fmt(p >= 1 ? to : Math.round(to * (1 - Math.pow(2, -10 * p))));
        if (p < 1) { requestAnimationFrame(step); }
      })(t0);
    }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); run(); } }, { threshold: 0.6 });
    io.observe(el);
  }

  A.countUp = countUp;  // aussi utilisé par la page S'inscrire (enskri.js)

  /* ---------- briques ---------- */
  function avatar(r, po) { return A.avatar({ pre: r[0], nom: r[1], po: po }); }
  /* une ligne de classement : photo ou initiales, nom, parti, part ; la barre est dessinée au défilement */
  function row(r, tot, mx, po, tag) {
    var w = mx ? Math.max(0.004, r[3] / mx) : 0;
    return '<li class="bl-r"><span class="bl-av">' + avatar(r, po) + '</span><span class="bl-nm"><b>' + esc(who(r)) + '</b><small>' + esc(party(r)) + (tag ? ' · <em>' + esc(tag) + '</em>' : '') + '</small></span>' +
      '<span class="bl-v">' + pc(r[3], tot) + '</span><span class="bl-b" aria-hidden="true"><i style="--w:' + w.toFixed(4) + '"></i></span></li>';
  }

  /* ---------- hémicycle : un point par siège, les sièges d'un même parti côte à côte ---------- */
  function hemi(order, N, rows, rad, label) {
    var W = 400, H = 212, cx = 200, cy = 202, r0 = rows > 3 ? 92 : 112, r1 = 192, radii = [], sum = 0, i, j;
    for (i = 0; i < rows; i++) { radii.push(rows > 1 ? r0 + i * (r1 - r0) / (rows - 1) : r1); sum += radii[i]; }
    var per = radii.map(function (r) { return Math.round(N * r / sum); }), diff = N - per.reduce(function (a, b) { return a + b; }, 0);
    for (i = rows - 1; diff !== 0; i = (i - 1 + rows) % rows) { per[i] += diff > 0 ? 1 : -1; diff += diff > 0 ? -1 : 1; }
    var seats = [];
    for (i = 0; i < rows; i++) {
      for (j = 0; j < per[i]; j++) {
        var th = per[i] > 1 ? Math.PI - j * Math.PI / (per[i] - 1) : Math.PI / 2;
        seats.push({ th: th, r: radii[i], x: cx + radii[i] * Math.cos(th), y: cy - radii[i] * Math.sin(th) });
      }
    }
    seats.sort(function (a, b) { return (b.th - a.th) || (a.r - b.r); });
    var k = 0, svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="bl-svg" role="img" aria-label="' + esc(label) + '">';
    order.forEach(function (o) {
      for (var q = 0; q < o[1] && k < seats.length; q++, k++) {
        svg += '<circle class="' + o[0] + '" style="--i:' + k + '" cx="' + seats[k].x.toFixed(1) + '" cy="' + seats[k].y.toFixed(1) + '" r="' + rad + '"/>';
      }
    });
    for (; k < seats.length; k++) { svg += '<circle class="hcn" style="--i:' + k + '" cx="' + seats[k].x.toFixed(1) + '" cy="' + seats[k].y.toFixed(1) + '" r="' + rad + '"/>'; }
    return svg + '</svg>';
  }

  /* ---------- remplissage ---------- */
  function paint() {
    var P = D.pres, tot = P.total, rows = P.rows, lead = rows[0], second = rows[1], third = rows[2];
    var dep = D.parl.dep, sen = D.parl.sen, topDep = dep.seats[0], pName = topDep ? D.parties[topDep[0]] : '';
    var senOf = {}; sen.seats.forEach(function (s) { senOf[s[0]] = s[1]; });
    var asof = new Date(D.asof), hh = asof.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    /* ouverture : le message clé */
    var people = D.people || {}, all = people.all || tot, h1 = $('bl-h1'), hp = esc(tt('bl.h1', { n: '§' })).split('§');
    h1.removeAttribute('data-i18n'); h1.innerHTML = hp[0] + '<span class="bl-num"></span>' + hp[1]; countUp(h1.querySelector('.bl-num'), all);
    var majD = Math.floor(dep.units / 2) + 1, majS = Math.floor(sen.units * 3 / 2) + 1, topSen = sen.seats[0] || [0, 0];
    setText('bl-key', (topDep && topDep[1] < majD && topSen[1] < majS) ? 'bl.key.a' : 'bl.key.b', { pn: fmt(tot), w: whoT(lead) + ' (' + party(lead) + ')', wp: pc(lead[3], tot), s: whoT(second), sp: pc(second[3], tot), th: whoT(third), tp: pc(third[3], tot), party: pName,
      dn: topDep ? topDep[1] : 0, dt: dep.units, sn: senOf[topDep ? topDep[0] : -1] || 0, st: sen.units * 3 });
    setText('bl-key2', 'bl.key2', { d: dayLong(D.day), h: hh });

    /* 1. le sondage jour après jour */
    var daily = D.daily || [];
    if (daily.length) {
      var peak = daily.reduce(function (m, x) { return x[1] > m[1] ? x : m; }, daily[0]);
      var nov = daily.filter(function (x) { return x[0] >= '2026-11-01'; }), avg = nov.length ? Math.round(nov.reduce(function (a, x) { return a + x[1]; }, 0) / nov.length / 10) * 10 : 0;
      setText('bl-s1-p', 'bl.s1.p', { pd: dayLong(peak[0]), pn: fmt(peak[1]), avg: fmt(avg) });
      $('bl-daily').innerHTML = dailyChart(daily, peak);
    }
    var cnt = [['pres', tot], ['sen', people.sen], ['dep', people.dep], ['may', people.may], ['cas', people.cas], ['asec', people.asec]].filter(function (x) { return x[1]; }), cmx = Math.max.apply(null, cnt.map(function (x) { return x[1]; }));
    $('bl-cnt').innerHTML = cnt.map(function (x) {
      return '<li class="bl-k"><span>' + esc(tt('bl.c.' + x[0])) + '</span><b class="bl-kv" data-to="' + x[1] + '"></b><span class="bl-b" aria-hidden="true"><i style="--w:' + (x[1] / cmx).toFixed(4) + '"></i></span></li>';
    }).join('');
    $('bl-cnt').querySelectorAll('.bl-kv').forEach(function (el) { countUp(el, +el.getAttribute('data-to')); });
    if (P.adj > 0) { setText('bl-s1-adj', 'bl.s1.adj', { n: fmt(P.adj) }); }

    /* 2. qui a répondu : part des réponses et part de la population, par département */
    var names = Object.keys(D.depts), rt = 0, pt = 0;
    names.forEach(function (d) { rt += D.depts[d].n; pt += D.depts[d].pop; });
    var rate = {}; names.forEach(function (d) { rate[d] = (D.depts[d].n / rt) / (D.depts[d].pop / pt); });
    var under = names.slice().sort(function (a, b) { return rate[a] - rate[b]; })[0], over = names.slice().sort(function (a, b) { return rate[b] - rate[a]; })[0];
    setText('bl-s2-p', 'bl.s2.p', { u: under, up: pc(D.depts[under].pop, pt, 0), ur: pc(D.depts[under].n, rt, 0), o: over, orr: pc(D.depts[over].n, rt, 0), op: pc(D.depts[over].pop, pt, 0) });
    var mxs = Math.max.apply(null, names.map(function (d) { return Math.max(D.depts[d].n / rt, D.depts[d].pop / pt); }));
    $('bl-depts').innerHTML = names.slice().sort(function (a, b) { return D.depts[b].pop - D.depts[a].pop; }).map(function (d) {
      var r = D.depts[d].n / rt, p = D.depts[d].pop / pt;
      return '<li class="bl-d"><span class="bl-dn">' + esc(d) + '</span><span class="bl-dbar" aria-hidden="true"><i style="--w:' + (r / mxs).toFixed(4) + '"></i><b class="bl-tk" style="left:' + (100 * p / mxs).toFixed(2) + '%"></b></span>' +
        '<span class="bl-dv">' + esc(tt('bl.s2.row', { r: pc(D.depts[d].n, rt), p: pc(D.depts[d].pop, pt) })) + '</span></li>';
    }).join('');

    /* 3. la présidentielle */
    setText('bl-s3-p', 'bl.s3.p', { a: D.listStart.n, ad: dayLong(D.listStart.day), c: D.cands.pres, d: dayLong(D.day) });
    var fx = P.fx || {}, fxn = (fx.aucun || 0) + (fx.indecis || 0) + (fx.abstention || 0);
    setText('bl-s3-fx', 'bl.s3.fx', { p: pc(fxn, tot), a: fmt(fx.aucun || 0), i: fmt(fx.indecis || 0), b: fmt(fx.abstention || 0) });
    var mx = rows[0][3];
    $('bl-pres').innerHTML = rows.slice(0, 10).map(function (r) { return row(r, tot, mx, 0); }).join('');
    if (rows.length > 10) {
      $('bl-pres-more').hidden = false; setText('bl-pres-more-t', 'sres.more', { n: rows.length - 10 });
      $('bl-pres-rest').innerHTML = rows.slice(10).map(function (r) { return row(r, tot, mx, 0); }).join('');
    }
    $('bl-presdept').innerHTML = Object.keys(P.depts).map(function (d) {
      var x = P.depts[d], r = x.rows[0];
      if (!r || !x.total) { return '<li class="bl-l"><span class="bl-ln">' + esc(d) + '</span><span class="bl-lw">–</span></li>'; }
      return '<li class="bl-l"><span class="bl-ln">' + esc(d) + '</span><span class="bl-lw"><span class="bl-av">' + avatar(r, 0) + '</span><span><b>' + esc(who(r)) + '</b><small>' + esc(party(r)) + '</small></span></span><span class="bl-lv">' + pc(r[3], x.total) + '</span></li>';
    }).join('');

    /* 4. le parlement simulé */
    var tally = {};  // parti -> [députés, sénateurs]
    dep.seats.forEach(function (s) { (tally[s[0]] = tally[s[0]] || [0, 0])[0] = s[1]; });
    sen.seats.forEach(function (s) { (tally[s[0]] = tally[s[0]] || [0, 0])[1] = s[1]; });
    var ids = Object.keys(tally).map(Number).sort(function (a, b) { return (tally[b][0] + tally[b][1]) - (tally[a][0] + tally[a][1]) || a - b; });
    var color = {}; ids.forEach(function (p, i) { color[p] = i < 7 ? 'hc' + i : 'hcx'; });
    function orderOf(col) {
      var out = [], other = 0;
      ids.forEach(function (p) { var n = tally[p][col]; if (!n) { return; } if (color[p] === 'hcx') { other += n; } else { out.push([color[p], n]); } });
      out.sort(function (a, b) { return b[1] - a[1] || (a[0] < b[0] ? -1 : 1); });
      if (other) { out.push(['hcx', other]); }
      return out;
    }
    $('bl-hemi-dep').innerHTML = hemi(orderOf(0), dep.units, 7, 6, tt('bl.s4.aria', { n: dep.units, c: tt('bl.s4.dep') }));
    $('bl-hemi-sen').innerHTML = hemi(orderOf(1), sen.units * 3, 3, 9, tt('bl.s4.aria', { n: sen.units * 3, c: tt('bl.s4.sen') }));
    function maj(el, seatsTot, col) {
      var m = Math.floor(seatsTot / 2) + 1, top = ids.slice().sort(function (x, y) { return tally[y][col] - tally[x][col]; })[0], tn = top != null ? tally[top][col] : 0;
      $(el).textContent = tt(tn >= m ? 'bl.s4.maj1' : 'bl.s4.maj0', { m: m, t: seatsTot, p: top != null ? D.parties[top] : '', n: tn });
    }
    maj('bl-maj-dep', dep.units, 0); maj('bl-maj-sen', sen.units * 3, 1);
    setText('bl-s4-n', 'bl.s4.n', { k: ids.filter(function (p) { return tally[p][0] > 0; }).length, s: ids.filter(function (p) { return tally[p][1] > 0; }).length });
    function rest(col) { return orderOf(col).filter(function (o) { return o[0] === 'hcx'; }).reduce(function (a, o) { return a + o[1]; }, 0); }
    var otherN = ids.filter(function (p) { return color[p] === 'hcx'; }).length;
    $('bl-leg').innerHTML = ids.filter(function (p) { return color[p] !== 'hcx'; }).map(function (p) {
      return '<li><i class="' + color[p] + '"></i><b>' + esc(D.parties[p]) + '</b> <span>' + tally[p][0] + ' · ' + tally[p][1] + '</span></li>';
    }).join('') + (otherN ? '<li><i class="hcx"></i><b>' + esc(tt('bl.s4.other', { n: otherN })) + '</b> <span>' + rest(0) + ' · ' + rest(1) + '</span></li>' : '');
    $('bl-seat-tab').innerHTML = '<thead><tr><th>' + esc(tt('bl.s4.col.p')) + '</th><th>' + esc(tt('bl.s4.col.d')) + '</th><th>' + esc(tt('bl.s4.col.s')) + '</th></tr></thead><tbody>' +
      ids.map(function (p) { return '<tr><td>' + esc(D.parties[p]) + '</td><td class="mono">' + tally[p][0] + '</td><td class="mono">' + tally[p][1] + '</td></tr>'; }).join('') + '</tbody>';

    /* 6. la suite */
    setText('bl-s6-p1', 'bl.s6.p1', { d: dayLong(D.day) });
    $('bl-nt').innerHTML = [['bl.n1'], ['bl.n2'], ['bl.n3'], ['bl.n4'], ['bl.n5'], ['bl.n6', { n: FEW }], ['bl.n7'], ['sres.m1'], ['sres.m2'], ['sres.m3'], ['sres.m4'], ['sres.m5'], ['poll.how']].map(function (k) { return '<li>' + esc(tt(k[0], k[1])) + '</li>'; }).join('');
    commune();
    painted = true;
  }

  /* bulletins reçus par jour : des barres en HTML (le texte garde sa taille sur téléphone) ; leur hauteur est dessinée au défilement */
  function dailyChart(daily, peak) {
    var n = daily.length, mx = Math.ceil(peak[1] * 1.15 / 5000) * 5000, pi = daily.indexOf(peak), mid = Math.floor(n / 2);
    var bars = daily.map(function (d, i) {
      return '<i class="bl-bar' + (d === peak ? ' pk' : '') + '" style="--h:' + (d[1] / mx).toFixed(4) + ';--i:' + i + '" title="' + esc(dayShort(d[0]) + ' : ' + fmt(d[1])) + '"></i>';
    }).join('');
    return '<div class="bl-dc" role="img" aria-label="' + esc(tt('bl.s1.aria', { a: dayLong(daily[0][0]), b: dayLong(daily[n - 1][0]) })) + '">' +
      '<div class="bl-dy" aria-hidden="true"><span>' + fmt(mx) + '</span><span>' + fmt(mx / 2) + '</span><span>0</span></div>' +
      '<div class="bl-dz"><div class="bl-dbars">' + bars + '</div><b class="bl-pk' + (pi / n > 0.7 ? ' r' : '') + '" style="left:' + (100 * (pi + 0.5) / n).toFixed(2) + '%">' + esc(tt('bl.s1.peak', { d: dayShort(peak[0]), n: fmt(peak[1]) })) + '</b></div>' +
      '<div class="bl-dx" aria-hidden="true"><span>' + esc(dayShort(daily[0][0])) + '</span><span>' + esc(dayShort(daily[mid][0])) + '</span><span>' + esc(dayShort(daily[n - 1][0])) + '</span></div></div>';
  }

  /* 5. et chez vous ? : département, Sénat, circonscription(s) de la commune enregistrée */
  function commune() {
    var out = $('bl-commune-out'), loc = A.loc();
    if (!out || !D) { return; }
    if (!loc) { out.innerHTML = '<p class="empty">' + esc(tt('bl.s5.none')) + '</p>'; return; }
    var dn = V.deptNames[V.places[loc.pi].d], h = '<p class="bl-where"><b>' + esc(V.places[loc.pi].n) + '</b> · ' + esc(dn) + '</p>';
    function block(title, u, take, po, tag, all) {
      var s = '<section class="bl-cb"><h3 class="bl-h3">' + esc(title) + '</h3>';
      if (!u || !u.total) { return s + '<p class="empty">' + esc(tt('bl.s5.empty')) + '</p></section>'; }
      s += '<p class="note-s">' + esc(tt('bl.s5.n', { n: fmt(u.total) })) + '</p><ol class="bl-rk">';
      var rows = u.rows.slice(0, take), mx = rows.length ? rows[0][3] : 1;
      rows.forEach(function (r, i) { s += row(r, u.total, mx, po, tag && (all || i === 0) ? tt(tag) : ''); });
      return s + '</ol></section>';
    }
    h += block(tt('bl.s5.pres', { d: dn }), D.pres.depts[dn], 3, 0, '');
    h += block(tt('bl.s5.sen', { d: dn }), D.sen[dn], 3, 1, 'bl.s5.winS', true);
    var seen = {};
    A.byPlace[loc.pi].forEach(function (c) { if (c.po === 2 && c.lo >= 0 && !seen[c.lo]) { seen[c.lo] = V.locs[c.lo].l; } });
    var los = Object.keys(seen).map(Number).sort(function (a, b) { return seen[a].localeCompare(seen[b], 'fr'); });
    los.forEach(function (lo) { h += block(tt('bl.s5.dep', { c: seen[lo] }), D.dep[norm(seen[lo])], 3, 2, 'bl.s5.win'); });
    h += '<p class="bl-share"><button type="button" class="btn" data-bl-share="c">' + esc(tt('bl.share.cb')) + '</button></p>';
    h += '<p class="note-s">' + esc(tt('bl.s5.local')) + ' <button type="button" class="lnk inl" data-bl-tab="l">' + esc(tt('bl.s5.localgo')) + '</button></p>';
    out.innerHTML = h;
  }
  A.on('loc', function () { if (painted) { commune(); } });

  /* ---------- partage : texte + lien vers la page (partage du téléphone, sinon copie) ---------- */
  var SITE = 'https://napvote-ht.com/#sres';
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-bl-share]') : null;
    if (!b || !D) { return; }
    var r = D.pres.rows, text;
    if (b.getAttribute('data-bl-share') === 'c' && A.loc()) {
      var dn = V.deptNames[V.places[A.loc().pi].d], x = D.pres.depts[dn];
      text = x && x.rows[0] ? tt('bl.share.c', { d: dn, w: whoT(x.rows[0]), p: pc(x.rows[0][3], x.total) }) : '';
    }
    if (!text) { text = tt('bl.share.a', { n: fmt((D.people && D.people.all) || D.pres.total), w: whoT(r[0]) }); }
    A.share({ title: tt('bl.share.t'), text: text, url: SITE });
  });

  /* ---------- chargement ---------- */
  function ensure() {
    if (D || loading) { return; }
    loading = true;
    fetch('data/bilan.json').then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.json(); }).then(function (j) {
      D = j; loading = false; paint();
    }, function () {
      loading = false;
      var e = $('bl-err'); e.hidden = false; e.innerHTML = esc(tt('bl.err')) + ' <button type="button" class="btn sm" data-bl-retry>' + esc(tt('err.reload')) + '</button>';
      $('bl-h1').textContent = tt('sres.title');
    });
  }
  root.addEventListener('click', function (e) { if (e.target.closest('[data-bl-retry]')) { $('bl-err').hidden = true; ensure(); } });

  /* un lien partagé (?c=…&s=…) ouvre le sondage en direct ; sinon on commence par le bilan */
  var startLive = /[?&]c=/.test(location.search);
  A.onPage(function (p) { if (p === 'sres') { if (startLive) { startLive = false; tab('l'); } else if (!root.hidden) { ensure(); } } });
  if (!document.getElementById('p-sres').hidden) { if (startLive) { startLive = false; tab('l'); } else { ensure(); } }
})();
