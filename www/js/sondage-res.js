(function () {
  'use strict';
  var V = window.VV, A = window.VVApp, root = document.getElementById('sres-out');
  if (!V || !A || !root || !A.pollScopes) { return; }
  var esc = A.esc, fmt = A.fmt, norm = A.norm;
  var FEW = 30, MAXS = 12, TOP = 12, COLORS = ['#0F3D8A', '#C2410C', '#15803D', '#7C3AED'], DASH = ['', '6 3', '2 3', '9 3 2 3'];
  var data = null, trends = {}, seq = 0;

  function pct(n, tot) { return tot ? (100 * n / tot).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %' : '–'; }
  function dayLabel(d) { return new Date(d + 'T12:00:00').toLocaleDateString([], { day: 'numeric', month: 'short' }); }

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

  function scopeHtml(sc) {
    var d = data.scopes[sc.scope] || { total: 0, choices: {} }, tot = d.total, mineMulti = sc.multi;
    var rows = Object.keys(d.choices).map(function (k) { return { c: k, n: d.choices[k] }; }).sort(function (a, b) { return b.n - a.n; });
    var mx = rows.length ? rows[0].n : 1;
    var h = '<section class="poll-r" data-scope="' + esc(sc.scope) + '"><div class="poll-h"><h3>' + esc(sc.title) + '</h3></div><p class="note-s" style="margin-top:4px">' + esc(t(tot > 1 ? 'poll.total' : 'poll.total1', { n: fmt(tot) })) + '</p>';
    if (tot > 0 && tot < FEW) { h += '<p class="note-s"><b>' + esc(t('sres.few', { n: FEW })) + '</b></p>'; }
    if (d.adj > 0) { h += '<p class="note-s"><b>' + esc(t(sc.scope === 'pres' ? 'poll.adj' : 'poll.adjS', { n: fmt(d.adj) })) + '</b></p>'; }
    if (mineMulti && tot) { h += '<p class="note-s">' + esc(t('poll.multiNote', { n: mineMulti })) + '</p>'; }
    if (!tot) { return h + '<p class="empty">' + esc(t('poll.none')) + '</p></section>'; }
    function row(r, i) {
      var fixed = r.c.charAt(0) === '~';
      return '<li><div class="rk hist-r' + (i === 0 && !fixed ? ' win' : '') + '"><span class="rk-l">' + esc(A.pollNameOf(sc, r.c)) + '</span><span class="rk-b"><i style="width:' + Math.round(100 * r.n / mx) + '%"></i></span><span class="rk-n">' + pct(r.n, tot) + ' <small>' + esc(t('sres.n', { n: fmt(r.n) })) + '</small></span></div></li>';
    }
    h += '<ol class="rank sres-rank">' + rows.slice(0, TOP).map(row).join('') + '</ol>';
    if (rows.length > TOP) { h += '<details class="sec"><summary><span>' + esc(t('sres.more', { n: rows.length - TOP })) + '</span></summary><ol class="rank sres-rank" start="' + (TOP + 1) + '">' + rows.slice(TOP).map(function (r, i) { return row(r, TOP + i); }).join('') + '</ol></details>'; }
    return h + '<div data-evo="' + esc(sc.scope) + '">' + evoHtml(sc) + '</div></section>';
  }

  function methodHtml() {
    return '<details class="sec" id="sres-method"><summary><span>' + esc(t('sres.m.t')) + '</span></summary><ul class="sres-m"><li>' + ['sres.m1', 'sres.m2', 'sres.m3', 'sres.m4', 'sres.m5', 'poll.how'].map(function (k) { return esc(t(k)); }).join('</li><li>') + '</li></ul></details>';
  }

  function render(S, failed) {
    var warn = '<div class="notice"><b>' + esc(t('poll.warn.t')) + '</b> ' + esc(t('poll.warn')) + '</div>';
    if (failed) { root.innerHTML = warn + '<p class="empty">' + esc(t('sres.err')) + '</p>'; return; }
    var h = warn + (data.asof ? '<p class="note-s">' + esc(t('poll.asof', { h: new Date(data.asof).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })) + '</p>' : '');
    S.list.forEach(function (sc) { h += scopeHtml(sc); });
    if (!S.loc) { h += '<p class="note-s">' + esc(t('sres.pick')) + '</p>'; }
    else if (S.needSec) { h += '<p class="note-s">' + esc(t('poll.needSection')) + '</p>'; }
    h += methodHtml() + '<div class="pk-act"><button type="button" class="btn ghost" data-sres-link>' + esc(t('sres.link')) + '</button><button type="button" class="btn primary" data-go="poll">' + esc(t('sres.vote')) + '</button></div>';
    root.innerHTML = h;
  }

  function load() {
    var S = A.pollScopes(), ids = S.list.slice(0, MAXS).map(function (s) { return s.scope; }), me = ++seq;
    root.innerHTML = '<p class="empty">…</p>';
    A.pollPost('/results', { scopes: ids, dept: '', t: 0 }).then(function (d) {
      if (me !== seq) { return; }
      data = d; render(S, false);
      /* l'évolution arrive après le classement : si le service ne la connaît pas encore, la page reste complète sans elle */
      S.list.forEach(function (sc) {
        if (trends[sc.scope] !== undefined) { return; }
        A.pollPost('/trend', { scope: sc.scope }).then(function (tr) { trends[sc.scope] = tr; paintEvo(S, sc); }, function () { /* historique pas encore disponible : on réessaiera à la prochaine ouverture */ });
      });
      S.list.forEach(function (sc) { paintEvo(S, sc); });
    }, function () { if (me === seq) { render(S, true); } });
  }
  function paintEvo(S, sc) {
    var el = root.querySelector('[data-evo="' + sc.scope.replace(/"/g, '\\"') + '"]');
    if (el) { el.innerHTML = evoHtml(sc); }
  }

  /* lien partageable : ?c=<commune>~<département> ouvre cette page sur la commune indiquée */
  function linkFor() {
    var l = A.loc(); if (!l) { return location.origin + location.pathname + '#sres'; }
    return location.origin + location.pathname + '?c=' + encodeURIComponent(norm(V.places[l.pi].n) + '~' + V.places[l.pi].d) + '#sres';
  }
  function applyQuery() {
    var m = /[?&]c=([^&]+)/.exec(location.search); if (!m) { return; }
    var parts = decodeURIComponent(m[1]).split('~'), d = +parts[1];
    for (var i = 0; i < V.places.length; i++) { if (V.places[i].d === d && norm(V.places[i].n) === parts[0]) { A.setLoc(i, -1); return; } }
  }
  root.addEventListener('click', function (e) {
    if (!e.target.closest('[data-sres-link]')) { return; }
    var u = linkFor(), b = e.target.closest('button');
    function done() { A.toast(t('sres.copied')); }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(u).then(done, function () { window.prompt(t('sres.link'), u); }); } else { window.prompt(t('sres.link'), u); }
    if (b) { b.blur(); }
  });
  A.onPage(function (p) { if (p === 'sres') { load(); } });
  A.on('loc', function () { if (!document.getElementById('p-sres').hidden) { load(); } });
  if (/#sres/.test(location.hash) || /[?&]c=/.test(location.search)) { applyQuery(); }
})();
