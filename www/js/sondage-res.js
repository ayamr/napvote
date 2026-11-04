(function () {
  'use strict';
  var V = window.VV, A = window.VVApp, root = document.getElementById('sres-out'), picker = document.getElementById('sres-picker');
  if (!V || !A || !root || !A.pollScopes) { return; }
  var esc = A.esc, fmt = A.fmt, norm = A.norm;
  var SITE = 'https://napvote-ht.com/';
  var FEW = 30, MAXS = 12, TOP = 12, COLORS = ['#0F3D8A', '#C2410C', '#15803D', '#7C3AED'], DASH = ['', '6 3', '2 3', '9 3 2 3'];
  var data = null, trends = {}, seq = 0, S = null;
  var link = null;  // { loc, scope } : ouverture par un lien partagé ; sinon la commune enregistrée de la personne

  function pct(n, tot) { return tot ? (100 * n / tot).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %' : '–'; }
  function dayLabel(d) { return new Date(d + 'T12:00:00').toLocaleDateString([], { day: 'numeric', month: 'short' }); }
  function curLoc() { return link ? link.loc : A.loc(); }
  function placeName(l) { return l ? V.places[l.pi].n + ' (' + V.deptNames[V.places[l.pi].d] + ')' : ''; }

  /* lien vers un scrutin (ou toute la commune) : ?c=<commune>~<département>&s=<scrutin>#sres */
  function linkFor(scope) {
    var l = curLoc(), q = [];
    if (l) { q.push('c=' + encodeURIComponent(norm(V.places[l.pi].n) + '~' + V.places[l.pi].d)); }
    if (scope && scope !== 'pres') { q.push('s=' + encodeURIComponent(scope)); }
    return SITE + (q.length ? '?' + q.join('&') : '') + '#sres';
  }

  /* graphique des parts, un trait par candidat (couleur et tirets différents) ; le tableau dessous donne les mêmes valeurs */
  function chart(sc, tr) {
    var days = tr.days, last = days[days.length - 1], names = Object.keys(last.c).sort(function (a, b) { return last.c[b] - last.c[a]; }).slice(0, 4);
    var W = 320, H = 150, L = 30, R = 8, T = 8, B = 20, mx = 1;
    days.forEach(function (d) { names.forEach(function (c) { if (d.t) { mx = Math.max(mx, 100 * (d.c[c] || 0) / d.t); } }); });
    mx = Math.min(100, Math.ceil(mx / 10) * 10);
    var x = function (i) { return L + (days.length < 2 ? 0 : i * (W - L - R) / (days.length - 1)); }, y = function (v) { return T + (H - T - B) * (1 - v / mx); };
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(t('sres.evo')) + '" class="sres-svg">';
    [0, mx / 2, mx].forEach(function (v) { svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="currentColor" stroke-opacity=".15"/><text x="' + (L - 4) + '" y="' + (y(v) + 3) + '" text-anchor="end" font-size="9" fill="currentColor">' + Math.round(v) + '</text>'; });
    [0, days.length - 1].forEach(function (i) { svg += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="' + (i ? 'end' : 'start') + '" font-size="9" fill="currentColor">' + esc(dayLabel(days[i].d)) + '</text>'; });
    names.forEach(function (c, k) {
      var pts = days.map(function (d, i) { return x(i).toFixed(1) + ',' + y(d.t ? 100 * (d.c[c] || 0) / d.t : 0).toFixed(1); }).join(' ');
      svg += '<polyline points="' + pts + '" fill="none" stroke="' + COLORS[k] + '" stroke-width="2"' + (DASH[k] ? ' stroke-dasharray="' + DASH[k] + '"' : '') + '/>';
    });
    svg += '</svg>';
    var leg = '<ul class="sres-leg">' + names.map(function (c, k) { return '<li><i style="background:' + COLORS[k] + '"></i>' + esc(A.pollNameOf(sc, c)) + '</li>'; }).join('') + '</ul>';
    var tab = '<div class="tw"><table class="ctab2"><thead><tr><th>' + esc(t('sres.day')) + '</th>' + names.map(function (c) { return '<th>' + esc(A.pollNameOf(sc, c)) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      days.slice().reverse().map(function (d) { return '<tr><td>' + esc(dayLabel(d.d)) + '</td>' + names.map(function (c) { return '<td class="mono">' + pct(d.c[c] || 0, d.t) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    return svg + leg + '<p class="note-s">' + esc(t('sres.evoNote')) + '</p>' + tab;
  }
  function evoHtml(sc) {
    var tr = trends[sc.scope];
    if (!tr || !tr.days.length) { return ''; }
    if (tr.days.length < 2) { return '<details class="sec"><summary><span>' + esc(t('sres.evo')) + '</span></summary><p class="note-s">' + esc(t('sres.evoNone', { d: dayLabel(tr.days[0].d) })) + '</p></details>'; }
    return '<details class="sec" open><summary><span>' + esc(t('sres.evo')) + '</span></summary>' + chart(sc, tr) + '</details>';
  }

  function rowsOf(sc) {
    return A.pollRows(sc, data.scopes[sc.scope] || { total: 0, choices: {} });
  }
  function scopeHtml(sc) {
    var d = data.scopes[sc.scope] || { total: 0, choices: {} }, tot = d.total, rows = rowsOf(sc), mx = rows.length ? rows[0].n : 1;
    var h = '<section class="poll-r" data-scope="' + esc(sc.scope) + '"><div class="poll-h"><h3>' + esc(sc.title) + '</h3></div><p class="note-s" style="margin-top:4px">' + esc(t(tot > 1 ? 'poll.total' : 'poll.total1', { n: fmt(tot) })) + '</p>';
    if (tot > 0 && tot < FEW) { h += '<p class="note-s"><b>' + esc(t('sres.few', { n: FEW })) + '</b></p>'; }
    if (d.adj > 0) { h += '<p class="note-s"><b>' + esc(t(sc.scope === 'pres' ? 'poll.adj' : 'poll.adjS', { n: fmt(d.adj) })) + '</b></p>'; }
    if (sc.multi && tot) { h += '<p class="note-s">' + esc(t('poll.multiNote', { n: sc.multi })) + '</p>'; }
    if (!tot) { return h + '<p class="empty">' + esc(t('poll.none')) + '</p></section>'; }
    function row(r, i) {
      var fixed = r.c.charAt(0) === '~';
      return '<li' + (fixed ? '' : (['may', 'cas', 'asec'].indexOf(sc.scope.split('|')[0]) >= 0 ? ' class="upn"' : ' class="ups"')) + '><div class="rk hist-r' + (i === 0 && !fixed ? ' win' : '') + '"><span class="rk-l">' + esc(A.pollNameOf(sc, r.c)) + (A.pollSubOf(sc, r.c) ? '<small class="rk-s">' + esc(A.pollSubOf(sc, r.c)) + '</small>' : '') + '</span><span class="rk-b"><i style="width:' + Math.round(100 * r.n / mx) + '%"></i></span><span class="rk-n">' + pct(r.n, tot) + ' <small>' + esc(t('sres.n', { n: fmt(r.n) })) + '</small></span></div></li>';
    }
    h += '<ol class="rank sres-rank">' + rows.slice(0, TOP).map(row).join('') + '</ol>';
    if (rows.length > TOP) { h += '<details class="sec"><summary><span>' + esc(t('sres.more', { n: rows.length - TOP })) + '</span></summary><ol class="rank sres-rank" start="' + (TOP + 1) + '">' + rows.slice(TOP).map(function (r, i) { return row(r, TOP + i); }).join('') + '</ol></details>'; }
    h += '<div class="pk-act sres-act"><button type="button" class="btn primary" data-sres-share="' + esc(sc.scope) + '">' + esc(t('sres.share')) + '</button><button type="button" class="btn ghost" data-sres-link="' + esc(sc.scope) + '">' + esc(t('sres.link')) + '</button></div>';
    return h + '<div data-evo="' + esc(sc.scope) + '">' + evoHtml(sc) + '</div></section>';
  }

  function methodHtml() {
    return '<details class="sec" id="sres-method"><summary><span>' + esc(t('sres.m.t')) + '</span></summary><ul class="sres-m"><li>' + ['sres.m1', 'sres.m2', 'sres.m3', 'sres.m4', 'sres.m5', 'poll.how'].map(function (k) { return esc(t(k)); }).join('</li><li>') + '</li></ul></details>';
  }

  function focusOf() { return link && link.scope && link.scope !== 'pres' ? link.scope : ''; }
  function render(failed) {
    var warn = '<div class="notice"><b>' + esc(t('poll.warn.t')) + '</b> ' + esc(t('poll.warn')) + '</div>';
    if (failed) { root.innerHTML = warn + '<p class="empty">' + esc(t('sres.err')) + '</p>'; return; }
    var l = curLoc(), focus = focusOf();
    var list = focus ? S.list.filter(function (sc) { return sc.scope === focus; }) : S.list;
    var h = warn;
    if (link) { h += '<p class="sres-where"><b>' + esc(t('sres.place')) + ' ' + esc(placeName(l)) + '</b> <button type="button" class="btn sm ghost" data-sres-change>' + esc(t('sres.change')) + '</button></p>'; }
    if (data.asof) { h += '<p class="note-s">' + esc(t('poll.asof', { h: new Date(data.asof).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })) + '</p>'; }
    list.forEach(function (sc) { h += scopeHtml(sc); });
    if (focus) { h += '<p><button type="button" class="btn" data-sres-all>' + esc(t('sres.all')) + '</button></p>'; }
    else if (!l) { h += '<p class="note-s">' + esc(t('sres.pick')) + '</p>'; }
    else if (S.needSec) { h += '<p class="note-s">' + esc(t('poll.needSection')) + '</p>'; }
    h += methodHtml() + '<div class="pk-act"><button type="button" class="btn primary" data-go="poll">' + esc(t('sres.vote')) + '</button></div>';
    root.innerHTML = h;
  }

  function load() {
    if (picker) { picker.hidden = !!link; }
    S = A.pollScopes(link ? link.loc : undefined);
    var focus = focusOf();
    var shown = focus ? S.list.filter(function (sc) { return sc.scope === focus; }) : S.list;
    var ids = shown.slice(0, MAXS).map(function (s) { return s.scope; }), me = ++seq;
    root.innerHTML = '<p class="empty">…</p>';
    A.pollPost('/results', { scopes: ids, dept: '', t: 0 }).then(function (d) {
      if (me !== seq) { return; }
      data = d; render(false);
      /* l'évolution arrive après le classement : si le service ne la connaît pas encore, la page reste complète sans elle */
      shown.forEach(function (sc) {
        if (trends[sc.scope] !== undefined) { return; }
        A.pollPost('/trend', { scope: sc.scope }).then(function (tr) { trends[sc.scope] = tr; paintEvo(sc); }, function () { /* historique pas encore disponible : on réessaiera à la prochaine ouverture */ });
      });
    }, function () { if (me === seq) { render(true); } });
  }
  function paintEvo(sc) {
    var el = root.querySelector('[data-evo="' + sc.scope.replace(/"/g, '\\"') + '"]');
    if (el) { el.innerHTML = evoHtml(sc); }
  }

  /* données d'un scrutin pour le partage (image et texte), lues par partage-res.js */
  A.sresInfo = function (scope) {
    if (!S || !data) { return null; }
    var sc = S.list.filter(function (x) { return x.scope === scope; })[0]; if (!sc) { return null; }
    var d = data.scopes[scope] || { total: 0 };
    return { scope: scope, title: sc.title, place: placeName(curLoc()), total: d.total, adj: d.adj || 0, asof: data.asof || '', multi: sc.multi || 0, link: linkFor(scope),
      rows: rowsOf(sc).filter(function (r) { return r.n > 0; }).map(function (r) { return { name: A.pollNameOf(sc, r.c), sub: A.pollSubOf(sc, r.c), n: r.n, pc: pct(r.n, d.total), fixed: r.c.charAt(0) === '~' }; }) };
  };

  function copy(u) {
    function done() { A.toast(t('sres.copied')); }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(u).then(done, function () { window.prompt(t('sres.link'), u); }); } else { window.prompt(t('sres.link'), u); }
  }
  A.sresCopy = copy;
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sres-link]');
    if (b) { copy(linkFor(b.getAttribute('data-sres-link'))); b.blur(); return; }
    if (e.target.closest('[data-sres-change]')) { link = null; load(); return; }
    if (e.target.closest('[data-sres-all]')) { link.scope = ''; load(); }
  });

  function applyQuery() {
    var m = /[?&]c=([^&]+)/.exec(location.search); if (!m) { return; }
    var parts = decodeURIComponent(m[1]).split('~'), d = +parts[1], sm = /[?&]s=([^&]+)/.exec(location.search);
    for (var i = 0; i < V.places.length; i++) {
      if (V.places[i].d === d && norm(V.places[i].n) === parts[0]) { link = { loc: { pi: i, sec: -1 }, scope: sm ? decodeURIComponent(sm[1]) : '' }; return; }
    }
  }
  A.onPage(function (p) { if (p === 'sres') { load(); } });
  A.on('loc', function () { link = null; if (!document.getElementById('p-sres').hidden) { load(); } });
  if (/[?&]c=/.test(location.search)) { applyQuery(); }
})();
