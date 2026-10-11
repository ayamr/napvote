(function () {
  'use strict';
  var V = window.VV, A = window.VVApp, H = window.VVH;
  if (!V || !A) { return; }
  var esc = A.esc, fmt = A.fmt, C = A.C, P = V.places, pcs = A.pcs;
  var out = document.getElementById('b-out');

  var circo2locs = {};
  if (H) { Object.keys(H.loc2c).forEach(function (lo) { H.loc2c[lo].forEach(function (id) { (circo2locs[id] = circo2locs[id] || []).push(+lo); }); }); }

    function sortAlpha(list) { return list.slice().sort(function (a, b) { return a.nom.localeCompare(b.nom, 'fr') || a.pre.localeCompare(b.pre, 'fr'); }); }
  function deptSort() { return V.deptNames.map(function (n, i) { return i; }).sort(function (a, b) { return V.deptNames[a].localeCompare(V.deptNames[b], 'fr'); }); }

  /* =============== sélecteur de commune =============== */
  var pickers = [];
  function placesOf(d) {
    return P.map(function (p, i) { return i; }).filter(function (i) { return P[i].d === d && A.byPlace[i].length > 0; })
      .sort(function (a, b) { return P[a].n.localeCompare(P[b].n, 'fr'); });
  }
  function buildPicker(host) {
    var mode = host.getAttribute('data-picker');
    host.innerHTML =
      '<div class="pk"><div class="pk-sum"><span class="pk-sum-t"></span><button type="button" class="btn sm ghost pk-chg">' + esc(t('pk.change')) + '</button></div><div class="pk-row">' +
      '<label class="pk-f"><span>' + esc(t('pk.dept')) + '</span><select class="pk-d" aria-label="' + esc(t('pk.dept')) + '"><option value="-1">' + esc(t('pk.choose')) + '</option>' + deptSort().map(function (i) { return '<option value="' + i + '">' + esc(V.deptNames[i]) + '</option>'; }).join('') + '</select></label>' +
      '<label class="pk-f"><span>' + esc(t('pk.commune')) + '</span><select class="pk-c" aria-label="' + esc(t('pk.commune')) + '" disabled><option value="-1">' + esc(t('pk.deptFirst')) + '</option></select></label>' +
      '</div><div class="pk-act">' +
      (mode === 'home' ? '<button type="button" class="btn primary pk-go" disabled>' + esc(t('pk.go')) + '</button>' : '') +
      '<button type="button" class="btn ghost pk-gps">' + esc(t('pk.gps')) + '</button>' +
      '<button type="button" class="btn ghost pk-clear" hidden>' + esc(t('pk.clear')) + '</button></div><p class="pk-msg" role="status"></p></div>';
    var o = { host: host, mode: mode, d: host.querySelector('.pk-d'), c: host.querySelector('.pk-c'), go: host.querySelector('.pk-go'), gps: host.querySelector('.pk-gps'), clr: host.querySelector('.pk-clear'), msg: host.querySelector('.pk-msg'), sumT: host.querySelector('.pk-sum-t'), chg: host.querySelector('.pk-chg'), editing: false };
    function fillC(d, sel) {
      if (d < 0) { o.c.innerHTML = '<option value="-1">' + esc(t('pk.deptFirst')) + '</option>'; o.c.disabled = true; return; }
      o.c.disabled = false;
      o.c.innerHTML = '<option value="-1">' + esc(t('pk.chooseCommune')) + '</option>' + placesOf(d).map(function (i) { return '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + esc(P[i].n) + '</option>'; }).join('');
    }
    o.d.addEventListener('change', function () { fillC(+o.d.value, -1); if (o.go) { o.go.disabled = true; } });
    o.c.addEventListener('change', function () {
      var pi = +o.c.value;
      if (o.go) { o.go.disabled = pi < 0; }
      if (pi >= 0 && mode === 'bulletin') { o.editing = false; A.setLoc(pi, -1); }
    });
    if (o.go) { o.go.addEventListener('click', function () { var pi = +o.c.value; if (pi >= 0) { A.setLoc(pi, -1); A.show('bulletin'); } }); }
    o.gps.addEventListener('click', function () {
      o.msg.textContent = t('pk.locating'); o.gps.disabled = true;
      A.locate(function (pi, err) {
        o.gps.disabled = false;
        if (pi < 0) { o.msg.textContent = err; return; }
        o.msg.textContent = '';
        if (!A.byPlace[pi].length) { o.msg.textContent = t('pk.noCand', { c: P[pi].n }); }
        o.editing = false; A.setLoc(pi, -1);
        if (mode === 'home') { A.show('bulletin'); }
      });
    });
    o.clr.addEventListener('click', function () { o.editing = true; A.setLoc(null); o.d.value = '-1'; fillC(-1, -1); });
    o.chg.addEventListener('click', function () { o.editing = true; o.sync(); });
    o.sync = function () {
      var l = A.loc();
      var compact = mode === 'bulletin' && !!l && !o.editing;
      host.classList.toggle('compact', compact);
      if (l) { o.sumT.innerHTML = '<b>' + esc(P[l.pi].n) + '</b> · ' + esc(V.deptNames[P[l.pi].d]); }
      if (l) { o.d.value = String(P[l.pi].d); fillC(P[l.pi].d, l.pi); if (o.go) { o.go.disabled = false; } o.clr.hidden = false; }
      else { o.d.value = '-1'; fillC(-1, -1); if (o.go) { o.go.disabled = true; } o.clr.hidden = true; }
    };
    o.sync();
    pickers.push(o);
  }
  document.querySelectorAll('[data-picker]').forEach(buildPicker);

  /* =============== comptage =============== */
  function parts(loc) {
    var pi = loc.pi, d = P[pi].d, here = A.byPlace[pi];
    var dep = here.filter(function (c) { return c.po === 2; }), may = here.filter(function (c) { return c.po === 3; });
    var secs = A.secsOf[pi];
    var cas = here.filter(function (c) { return c.po === 4; }), asec = here.filter(function (c) { return c.po === 5; });
    return {
      pres: A.pres, sen: C.filter(function (c) { return c.po === 1 && c.d === d; }), dep: dep, may: may, secs: secs,
      cas: loc.sec >= 0 ? cas.filter(function (c) { return c.sc === loc.sec; }) : cas, asec: loc.sec >= 0 ? asec.filter(function (c) { return c.sc === loc.sec; }) : asec,
      casAll: cas, asecAll: asec
    };
  }
  A.parts = parts;
  A.countFor = function (loc) { var p = parts(loc); return p.pres.length + p.sen.length + p.dep.length + p.may.length + (loc.sec >= 0 ? p.cas.length + p.asec.length : 0); };

  /* =============== rendu =============== */
  function grid(list) { return '<ul class="cc-grid">' + sortAlpha(list).map(function (c) { return A.row(c); }).join('') + '</ul>'; }
  function tickets(list) {
    var gs = A.partyGroups(list);
    if (!gs.length) { return '<p class="empty">' + esc(t('b.nolist')) + '</p>'; }
    return '<div class="tk-grid">' + gs.map(function (g) {
      return '<div class="tkc"><div class="tkc-h"><span class="pt">' + esc(V.parties[g.pa]) + '</span><span class="tk-n">' + esc(t(g.cs.length > 1 ? 'c.count.n' : 'c.count.1', { n: fmt(g.cs.length) })) + '</span></div><ul class="tkc-l">' +
        g.cs.map(function (c) { return '<li' + (A.isFav(c) ? ' class="on"' : '') + ' data-c="' + c.i + '" tabindex="0">' + A.mark(c) + '<span class="tkc-p">' + esc(V.pos[c.ps]) + '</span><span class="tkc-n"><b class="nm">' + esc(c.pre) + ' ' + esc(c.nom) + '</b></span></li>'; }).join('') + '</ul></div>';
    }).join('') + '</div>';
  }
  function bar(label, v, mx, txt) {
    return '<li><div class="rk hist-r"><span class="rk-l">' + label + '</span><span class="rk-b"><i style="width:' + Math.round(100 * v / mx) + '%"></i></span><span class="rk-n">' + txt + '</span></div></li>';
  }
  function level(id, title, help, body, hist) {
    return '<section class="lv" id="lv-' + id + '"><div class="lv-h"><h2>' + esc(title) + '</h2></div><p class="lv-help">' + help + '</p>' + body + (hist || '') + '</section>';
  }
  function histBox(title, html) { return '<details class="hbox" open><summary>' + esc(title) + '</summary>' + html + '</details>'; }

  /* rappel : présidentielle */
  function histPres(d) {
    if (!H) { return ''; }
    var pr = H.pres.dept[d];
    if (!pr) { return ''; }
    return histBox(t('h.pres', { d: V.deptNames[d] }), '<p class="lead">Présidentielle du 20 novembre 2016 · ' + fmt(pr.t) + ' votes</p><ul class="rank">' +
      pr.top.slice(0, 4).map(function (x, k) { return bar(esc(x.n), x.v, pr.top[0].v, pcs(x.pc)); }).join('') + '</ul><p class="note-s">Résultats préliminaires du CEP. National : ' + esc(H.pres.nat[0].n) + ' ' + pcs(H.pres.nat[0].pc) + '. <button type="button" class="lnk" data-res="pres">' + esc(t('h.pres.all')) + '</button></p>');
  }
  function histSen(d, n26) {
    if (!H || !H.sen[d]) { return ''; }
    return histBox(t('h.sen', { d: V.deptNames[d] }), A.hui.senHtml(d, { now: n26 }) + '<p class="note-s"><button type="button" class="lnk" data-res="sen">' + esc(t('h.sen.all')) + '</button></p>');
  }
  function histDep(loc, dep) {
    if (!H) { return ''; }
    var ids = {}, h = '';
    dep.forEach(function (c) { (H.loc2c[c.lo] || []).forEach(function (id) { ids[id] = 1; }); });
    Object.keys(ids).map(Number).forEach(function (id) {
      var c = H.circos.filter(function (x) { return x.id === id; })[0];
      if (!c) { return; }
      var lset = {}; (circo2locs[id] || []).forEach(function (l) { lset[l] = 1; });
      var now = C.filter(function (x) { return x.po === 2 && lset[x.lo]; });
      var back = now.filter(function (x) { var L = A.links(x); return L && L.some(function (l) { return l.k === 'd' && l.c === id; }); });
      h += A.hui.circoCard(c, { now: now, back: back });
    });
    return h ? histBox(t('h.here'), h + A.hui.srcNote()) : '';
  }

  function render() {
    if (!out) { return; }
    var loc = A.loc();
    if (!loc) {
      out.innerHTML = '<div class="empty-b"><h2>' + esc(t('b.empty')) + '</h2><p>' + esc(t('b.empty.p')) + '</p><p class="note-s">' + esc(t('b.empty.n')) + '</p></div>' + favBlock(A.favList());
      return;
    }
    var p = parts(loc), d = P[loc.pi].d, dn = V.deptNames[d];
    var secList = p.secs;
    var chips = [t('b.n.pres', { n: fmt(p.pres.length) }), t('b.n.sen', { n: fmt(p.sen.length) }), t('b.n.dep', { n: fmt(p.dep.length) }), t('b.n.may', { n: fmt(p.may.length) })];
    if (secList.length) { chips.push(t('b.n.cas', { n: fmt(p.casAll.length) }), t('b.n.asec', { n: fmt(p.asecAll.length) })); }
    var head = '<div class="b-sum"><h2>' + esc(P[loc.pi].n) + '</h2><span class="b-dept">' + esc(dn) + (P[loc.pi].off ? ' · commune hors fond de carte' : '') + '</span>' +
      '<p class="b-chips">' + chips.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</p>' +
      '<div class="b-act"><button type="button" class="btn sm" data-bshare>' + esc(t('b.share')) + '</button><button type="button" class="btn sm ghost" data-bmap>' + esc(t('b.map')) + '</button><button type="button" class="btn sm ghost" data-bprint>' + esc(t('b.print')) + '</button></div></div>';
    var nav = '<div class="pillrow jump" role="navigation">' +
      [['pres', 0], ['sen', 1], ['dep', 2], ['may', 3], ['cas', 4], ['asec', 5]].map(function (x) { return '<a class="pillb" href="#lv-' + x[0] + '" data-jump="' + x[0] + '">' + esc(t('post.' + x[1])) + '</a>'; }).join('') + '</div>';
    var html = head + nav;

    html += level('pres', t('b.pres'), esc(t('b.pres.h')), grid(p.pres), histPres(d));
    html += level('sen', t('b.sen', { d: dn }), esc(t('b.sen.h', { d: dn })), p.sen.length ? grid(p.sen) : '<p class="empty">' + esc(t('b.nocand')) + '</p>', histSen(d, p.sen.length));
    var byLo = {};
    p.dep.forEach(function (c) { (byLo[c.lo] = byLo[c.lo] || []).push(c); });
    var los = Object.keys(byLo).map(Number), depBody = '';
    if (!los.length) { depBody = '<p class="empty">' + esc(t('b.nocand')) + '</p>'; }
    else {
      if (los.length > 1) { depBody += '<p class="notice info">' + esc(t('b.dep.multi', { c: P[loc.pi].n })) + '</p>'; }
      los.sort(function (a, b) { return V.locs[a].l.localeCompare(V.locs[b].l, 'fr'); }).forEach(function (lo) {
        depBody += '<h3 class="lv-sub">' + esc(t('b.circo', { c: V.locs[lo].l })) + ' <span>' + esc(t(byLo[lo].length > 1 ? 'c.count.n' : 'c.count.1', { n: fmt(byLo[lo].length) })) + '</span></h3>' + grid(byLo[lo]);
      });
    }
    html += level('dep', t('b.dep'), esc(t('b.dep.h')), depBody, histDep(loc, p.dep));
    html += level('may', t('b.may', { c: P[loc.pi].n }), esc(t('b.may.h')), tickets(p.may), histBox(t('b.before.may'), '<p class="note-s">' + esc(t('b.before.may.p')) + '</p>'));

    var secHtml = '';
    if (!secList.length) {
      secHtml = '<p class="empty">' + esc(t('b.sec.none')) + '</p>';
    } else {
      secHtml = '<div class="sec-pick"><label><span>' + esc(t('b.sec')) + '</span><select id="b-sec" aria-label="' + esc(t('b.sec')) + '"><option value="-1">' + esc(t('b.sec.choose')) + '</option>' + secList.map(function (k) { return '<option value="' + k + '"' + (k === loc.sec ? ' selected' : '') + '>' + esc(V.secs[k].n) + '</option>'; }).join('') + '</select></label><p class="note-s">' + esc(t('b.sec.note', { n: secList.length })) + '</p></div>';
    }
    function secBody(list, all) {
      if (!secList.length) { return secHtml; }
      if (loc.sec < 0) {
        var cnt = {}; all.forEach(function (c) { cnt[c.sc] = (cnt[c.sc] || 0) + 1; });
        return '<div class="chips-sec">' + secList.map(function (k) { return '<button type="button" class="chip" data-sec="' + k + '">' + esc(V.secs[k].n) + ' <span>' + (cnt[k] || 0) + '</span></button>'; }).join('') + '</div>';
      }
      return '<p class="lv-sec">' + esc(V.secs[loc.sec].n) + '</p>' + tickets(list);
    }
    html += level('cas', t('b.cas'), esc(t('b.cas.h')) + (secList.length ? ' ' + esc(t('b.cas.pick')) : ''), (secList.length ? secHtml : '') + secBody(p.cas, p.casAll), '');
    html += level('asec', t('b.asec'), esc(t('b.asec.h')), secBody(p.asec, p.asecAll), '');
    html += favBlock(A.favList());
    html += '<p class="note-s">' + esc(t('b.foot', { d: A.asof && A.fdate ? A.fdate(A.asof, { day: 'numeric', month: 'long' }) : (A.asof || '') })) + '</p>';
    out.innerHTML = html;
  }

  function favBlock(fv) {
    if (!fv.length) { return ''; }
    return '<section class="lv favs"><div class="lv-h"><h2>' + esc(t('b.favs')) + '</h2></div><ul class="cc-grid">' + fv.map(function (c) { return A.row(c, { sub: V.postes[c.po] }); }).join('') + '</ul></section>';
  }

  function shareText() {
    var loc = A.loc(); if (!loc) { return ''; }
    var p = parts(loc);
    return 'Mon bulletin — ' + P[loc.pi].n + ' (' + V.deptNames[P[loc.pi].d] + ')\n' +
      '• Présidence : ' + p.pres.length + ' candidats\n• Sénat : ' + p.sen.length + ' candidats\n• Députés : ' + p.dep.length + ' candidats\n• Maires et adjoints : ' + p.may.length + ' candidats' +
      (loc.sec >= 0 ? '\n• CASEC : ' + p.cas.length + ' · ASEC : ' + p.asec.length + ' (' + V.secs[loc.sec].n + ')' : '') + '\nVoir les candidats sur NapVote (liste du CEP, non définitive).';
  }

  if (out) {
    out.addEventListener('click', function (e) {
      var s = e.target.closest('[data-sec]');
      if (s) { A.setLoc(A.loc().pi, +s.getAttribute('data-sec')); return; }
      if (e.target.closest('[data-bshare]')) { A.share({ title: 'Mon bulletin NapVote', text: shareText(), url: location.href.split('#')[0] }); return; }
      if (e.target.closest('[data-bprint]')) { window.print(); return; }
      if (e.target.closest('[data-bmap]')) { var l = A.loc(); A.show('carte'); if (window.VVMap) { window.VVMap.pickPlace(l.pi); } return; }
      var r = e.target.closest('[data-res]');
      if (r) { A.show('res'); A.emit('res', r.getAttribute('data-res')); return; }
      var j = e.target.closest('[data-jump]');
      if (j) { e.preventDefault(); var el = document.getElementById('lv-' + j.getAttribute('data-jump')); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
    });
    out.addEventListener('change', function (e) {
      if (e.target.id === 'b-sec') { A.setLoc(A.loc().pi, +e.target.value); }
    });
  }
  A.on('loc', function () { pickers.forEach(function (o) { o.sync(); }); render(); });
  A.on('fav', function () { if (!document.getElementById('p-bulletin').hidden) { /* étoiles déjà mises à jour */ } });
  render();
})();
