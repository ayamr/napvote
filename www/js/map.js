(function () {
  'use strict';
  var V = window.VV, A = window.VVApp;
  if (!V || !window.d3 || !A || !document.getElementById('map-svg')) { return; }

  var W = V.W, H = V.H, P = V.places, D = V.depts, PARTIES = V.parties;
  var C = A.C, byPlace = A.byPlace, pres = A.pres, esc = A.esc, fmt = A.fmt;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOBILE = window.matchMedia('(max-width: 860px)');
  var LABEL = { 1: 'Sénateurs', 2: 'Députés', 3: 'Maires', 4: 'CASEC', 5: 'ASEC' };
  var TITLE = { 2: 'Députés', 3: 'Maires', 4: 'CASEC', 5: 'ASEC' };
  var HELP = { 4: 'Conseil d’administration de la section communale', 5: 'Assemblée de la section communale' };

  var S = { poste: 2, party: -1, sel: null, tab: null, flash: -1, hist: 'none' };
  var T = d3.zoomIdentity, M = null;

  function $(id) { return document.getElementById(id); }
  var svg = $('map-svg'), stage = $('map-stage'), tip = $('map-tip'), side = $('map-side'), legend = $('map-legend');
  var elPostes = $('map-postes'), selParty = $('map-party'), back = $('map-back');

  function plural(n, one, many) { return fmt(n) + ' ' + (n > 1 ? many : one); }
  function passParty(c) { return S.party < 0 || c.pa === S.party; }
  function posShort(i) { return V.pos[i].replace('Adjoint', 'adj.'); }

  /* ---------- svg scaffold ---------- */
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg.innerHTML =
    '<g id="vp"><g id="pls">' +
    P.map(function (p, i) { return p.p ? '<path class="pl b0" data-i="' + i + '" data-d="' + p.d + '" d="' + p.p + '" fill-rule="evenodd"></path>' : ''; }).join('') +
    '</g><g id="dls">' +
    D.map(function (d, i) { return '<path class="dl" data-d="' + i + '" d="' + d.l + '" fill-rule="evenodd"></path>'; }).join('') +
    '</g><g id="labs">' +
    D.map(function (d, i) { return '<text class="lab dn" data-d="' + i + '" x="' + d.c[0] + '" y="' + d.c[1] + '">' + esc(d.n.toUpperCase()) + '</text><text class="lab dc" data-d="' + i + '" x="' + d.c[0] + '" y="' + d.c[1] + '"></text>'; }).join('') +
    P.map(function (p, i) { return p.p ? '<text class="lab cn" data-i="' + i + '" x="' + p.c[0] + '" y="' + p.c[1] + '">' + esc(p.n) + '</text>' : ''; }).join('') +
    '</g></g>';
  var vp = d3.select('#vp');
  var plEls = {};
  svg.querySelectorAll('.pl').forEach(function (el) { plEls[el.getAttribute('data-i')] = el; });
  var dlEls = svg.querySelectorAll('.dl');
  var dnEls = svg.querySelectorAll('.dn');
  var dcEls = svg.querySelectorAll('.dc');
  var cnEls = svg.querySelectorAll('.cn');

  var zoom = d3.zoom()
    .scaleExtent([1, 14])
    .extent([[0, 0], [W, H]])
    .translateExtent([[-20, -20], [W + 20, H + 20]])
    .filter(function (e) {
      if (e.type.indexOf('touch') === 0) { return false; }
      if (e.type === 'wheel') { return e.ctrlKey || e.metaKey; }
      return !e.button;
    })
    .on('zoom', function (e) { T = e.transform; vp.attr('transform', T); updateLabels(); });
  var svgSel = d3.select(svg);
  svgSel.call(zoom).on('dblclick.zoom', null);

  function zoomToBox(b, pad) {
    var w = b[2] - b[0], h = b[3] - b[1];
    var k = Math.min(14, Math.max(1, Math.min(W / (w * (1 + 2 * pad)), H / (h * (1 + 2 * pad)))));
    var t = d3.zoomIdentity.translate(W / 2 - k * (b[0] + b[2]) / 2, H / 2 - k * (b[1] + b[3]) / 2).scale(k);
    svgSel.transition().duration(REDUCED ? 0 : 600).call(zoom.transform, t);
  }
  function zoomReset() { svgSel.transition().duration(REDUCED ? 0 : 450).call(zoom.transform, d3.zoomIdentity); }
  function zoomBy(f) { svgSel.transition().duration(REDUCED ? 0 : 220).call(zoom.scaleBy, f); }

  function focusDept() {
    var s = S.sel;
    if (!s) { return -1; }
    return s.t === 'dept' ? s.i : P[s.i].d;
  }

  /* ---------- labels ---------- */
  function updateLabels() {
    var rect = svg.getBoundingClientRect();
    var sc = rect.width ? rect.width / W : 0.5;
    var k = T.k, u = 1 / (sc * k), fd = focusDept(), nat = fd < 0, wide = rect.width >= 520;
    dnEls.forEach(function (el) {
      var i = +el.getAttribute('data-d');
      el.style.display = (nat && wide) ? '' : 'none';
      el.setAttribute('font-size', 10 * u);
      el.setAttribute('y', D[i].c[1] - 9 * u);
    });
    dcEls.forEach(function (el) {
      var i = +el.getAttribute('data-d');
      el.style.display = nat ? '' : 'none';
      el.setAttribute('font-size', (wide ? 15 : 13) * u);
      el.setAttribute('y', D[i].c[1] + (wide ? 8 : 5) * u);
      if (M) { el.textContent = fmt(M.dv[i]); }
    });
    cnEls.forEach(function (el) {
      var i = +el.getAttribute('data-i'), p = P[i];
      var wpx = (p.b[2] - p.b[0]) * sc * k, hpx = (p.b[3] - p.b[1]) * sc * k;
      el.style.display = (!nat && p.d === fd && wpx >= p.n.length * 5.4 && hpx >= 14) ? '' : 'none';
      el.setAttribute('font-size', 10 * u);
    });
  }
  window.addEventListener('resize', function () { window.requestAnimationFrame(updateLabels); });

  /* ---------- metric ---------- */
  function makeBins(vals) {
    vals.sort(d3.ascending);
    var q = [0.2, 0.4, 0.6, 0.8].map(function (t) { return vals.length ? d3.quantile(vals, t) : 0; });
    function bin(v) { return v <= 0 ? 0 : 1 + q.filter(function (t) { return v > t; }).length; }
    var ranges = [null, null, null, null, null, null];
    vals.forEach(function (v) {
      var b = bin(v);
      if (!ranges[b]) { ranges[b] = [v, v]; } else { ranges[b][0] = Math.min(ranges[b][0], v); ranges[b][1] = Math.max(ranges[b][1], v); }
    });
    return { bin: bin, ranges: ranges };
  }
  function okC(c) { return c.po === S.poste && passParty(c); }
  function computeMetric() {
    if (histOn()) { return histMetric(); }
    var pv = P.map(function () { return 0; }), dv = D.map(function () { return 0; });
    C.forEach(function (c) {
      if (!okC(c)) { return; }
      if (c.d >= 0) { dv[c.d]++; }
      if (S.poste !== 1 && c.lo >= 0) { V.locs[c.lo].p.forEach(function (p) { pv[p]++; }); }
    });
    if (S.poste === 1) { P.forEach(function (p, i) { pv[i] = dv[p.d]; }); }
    var dvals = dv.filter(function (v) { return v > 0; });
    var pvals = [];
    if (S.poste === 1) { pvals = dvals.slice(); }
    else { P.forEach(function (p, i) { if (p.p && pv[i] > 0) { pvals.push(pv[i]); } }); }
    var cnt = {};
    [1, 2, 3, 4, 5].forEach(function (po) { cnt[po] = C.filter(function (c) { return c.po === po && passParty(c); }).length; });
    return { pv: pv, dv: dv, bd: makeBins(dvals), bp: makeBins(pvals), cnt: cnt };
  }

  /* ---------- map render ---------- */
  var hovD = -1;
  function hoverDept(d) {
    if (d === hovD) { return; }
    hovD = d;
    dlEls.forEach(function (el) { el.classList.toggle('hov', +el.getAttribute('data-d') === d); });
  }
  function renderMap() {
    var fd = focusDept(), nat = fd < 0, s = S.sel;
    svg.classList.toggle('nat', nat);
    P.forEach(function (p, i) {
      var el = plEls[i];
      if (!el) { return; }
      var cls = 'pl ';
      if (nat) { cls += 'b' + M.bd.bin(M.dv[p.d]); }
      else if (p.d === fd) { cls += 'b' + M.bp.bin(M.pv[i]) + ' in'; }
      else { cls += 'b0 out'; }
      if (s && s.t === 'place' && s.i === i) { cls += ' sel'; }
      el.setAttribute('class', cls);
    });
    dlEls.forEach(function (el) {
      var d = +el.getAttribute('data-d');
      el.setAttribute('class', 'dl' + (d === fd ? ' sel' : '') + (!nat && d !== fd ? ' out' : '') + (d === hovD ? ' hov' : ''));
    });
    back.hidden = nat;
    updateLabels();
  }
  function renderLegend() {
    var nat = focusDept() < 0, R = nat ? M.bd.ranges : M.bp.ranges, parts = [];
    for (var b = 1; b <= 5; b++) {
      var r = R[b];
      if (!r) { continue; }
      parts.push('<span class="lg"><i class="sw b' + b + '"></i>' + (r[0] === r[1] ? fmt(r[0]) : fmt(r[0]) + '–' + fmt(r[1])) + '</span>');
    }
    parts.push('<span class="lg"><i class="sw b0"></i>aucun</span>');
    var what = histOn() ? HDL[S.hist] + (nat ? (S.hist === 'pct15' ? ' · moyenne par département' : ' · total par département') : ' · par circonscription') : (S.poste === 1 ? 'Candidats au Sénat par département' : (nat ? 'Candidats par département' : 'Candidats par commune'));
    legend.innerHTML = '<div class="lg-t"><b>' + what + '</b> · ' + LABEL[S.poste] + (S.party >= 0 ? ' · ' + esc(PARTIES[S.party]) : '') + '</div><div class="lg-r">' + parts.join('') + '</div>';
  }
  function renderPostes() {
    elPostes.querySelectorAll('button').forEach(function (b) {
      var po = +b.getAttribute('data-p');
      b.setAttribute('aria-pressed', String(po === S.poste));
      b.querySelector('.n').textContent = fmt(M.cnt[po]);
    });
  }

  /* ---------- panel ---------- */
  function candLi(c) {
    return '<li class="cr' + (S.flash === c.i ? ' flash' : '') + '" data-c="' + c.i + '"><span class="cr-n"><span class="pr">' + esc(c.pre) + '</span> <b>' + esc(c.nom) + '</b>' + A.bioBadge(c) + '</span><span class="pt">' + esc(PARTIES[c.pa]) + '</span></li>';
  }
  function candList(list) { return '<ul class="cl">' + list.map(candLi).join('') + '</ul>'; }
  function byParty(list) {
    var m = {};
    list.forEach(function (c) { (m[c.pa] = m[c.pa] || []).push(c); });
    return Object.keys(m).map(Number).sort(function (a, b) { return PARTIES[a].localeCompare(PARTIES[b]); }).map(function (k) {
      return { pa: k, cs: m[k].sort(function (x, y) { return x.ps - y.ps || x.nom.localeCompare(y.nom); }) };
    });
  }
  function tickets(list) {
    return byParty(list).map(function (g) {
      return '<div class="tk"><div class="tk-h"><button type="button" class="pt pt-b" data-act="party" data-i="' + g.pa + '" title="Voir ce parti sur la carte">' + esc(PARTIES[g.pa]) + '</button><span class="tk-n">' + plural(g.cs.length, 'candidat', 'candidats') + '</span></div><ul class="cl">' +
        g.cs.map(function (c) {
          return '<li class="cr' + (S.flash === c.i ? ' flash' : '') + '" data-c="' + c.i + '"><span class="cr-n"><span class="pr">' + esc(c.pre) + '</span> <b>' + esc(c.nom) + '</b>' + A.bioBadge(c) + '</span><span class="ps">' + esc(posShort(c.ps)) + '</span></li>';
        }).join('') + '</ul></div>';
    }).join('');
  }
  function tabsHtml(list, active) {
    return '<div class="ptabs" role="tablist">' + list.map(function (t) {
      return '<button type="button" role="tab" class="ptab" data-tab="' + t.k + '" aria-selected="' + (t.k === active) + '">' + esc(t.l) + (t.n != null ? ' <span class="n">' + fmt(t.n) + '</span>' : '') + '</button>';
    }).join('') + '</div>';
  }
  function partyNote() {
    return S.party >= 0 ? '<div class="fnote">Parti <b>' + esc(PARTIES[S.party]) + '</b><button type="button" data-act="clearParty" aria-label="Retirer le filtre de parti">Retirer</button></div>' : '';
  }
  function crumbs(parts) {
    return '<nav class="crumbs" aria-label="Fil d’Ariane">' + parts.join('<span aria-hidden="true">›</span>') + '</nav>';
  }
  function sheetBar() {
    return '<div class="sheet-bar"><button type="button" class="grab" data-act="expand" aria-label="Agrandir ou réduire le panneau"></button><button type="button" class="xbtn" data-act="up" aria-label="Fermer le panneau">✕</button></div>';
  }
  function rankRow(name, v, mx, act, i, extra) {
    return '<li><button type="button" class="rk" data-act="' + act + '" data-i="' + i + '"><span class="rk-l">' + esc(name) + (extra || '') + '</span><span class="rk-b"><i style="width:' + Math.round(100 * v / mx) + '%"></i></span><span class="rk-n">' + fmt(v) + '</span></button></li>';
  }
  var HD = A.H, CI = {};
  if (HD) { HD.circos.forEach(function (c) { CI[c.id] = c; }); }
  var HDL = { cand15: 'Candidats en 2015', votes15: 'Voix du dernier élu (2015-2017)', pct15: 'Score du dernier élu (%)' };
  var HUNIT = { cand15: 'candidats en 2015', votes15: 'voix pour le dernier élu', pct15: '% pour le dernier élu' };
  var STAT15 = A.hui.STAT;
  var circo2locs = {};
  if (HD) { Object.keys(HD.loc2c).forEach(function (lo) { HD.loc2c[lo].forEach(function (id) { (circo2locs[id] = circo2locs[id] || []).push(+lo); }); }); }
  function histOn() { return !!(HD && S.poste === 2 && S.hist && S.hist !== 'none'); }
  function unitLbl() { return histOn() ? HUNIT[S.hist] : 'candidats · ' + LABEL[S.poste].toLowerCase(); }
  function pcs(x) { return Number(x).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %'; }
  function circoVal(c) { if (S.hist === 'cand15') { return c.nc || 0; } if (S.hist === 'votes15') { return c.e ? c.e.v : 0; } return c.e ? c.e.pc : 0; }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function histMetric() {
    var pv = P.map(function () { return 0; }), dv = D.map(function () { return 0; });
    P.forEach(function (p, i) {
      var vals = (HD.place2c[i] || []).map(function (id) { return circoVal(CI[id]); });
      if (vals.length) { pv[i] = S.hist === 'cand15' ? sum(vals) : Math.max.apply(null, vals); }
    });
    D.forEach(function (d, k) {
      var vs = HD.circos.filter(function (c) { return c.d === k; }).map(circoVal);
      if (S.hist === 'pct15') { var nz = vs.filter(function (v) { return v > 0; }); dv[k] = nz.length ? Math.round(10 * sum(nz) / nz.length) / 10 : 0; }
      else { dv[k] = sum(vs); }
    });
    var dvals = dv.filter(function (v) { return v > 0; }), pvals = [];
    P.forEach(function (p, i) { if (p.p && pv[i] > 0) { pvals.push(pv[i]); } });
    var cnt = {};
    [1, 2, 3, 4, 5].forEach(function (po) { cnt[po] = C.filter(function (c) { return c.po === po && passParty(c); }).length; });
    return { pv: pv, dv: dv, bd: makeBins(dvals), bp: makeBins(pvals), cnt: cnt };
  }
  function leadLbl() { return histOn() ? HDL[S.hist] + ' (résultats préliminaires)' : 'Candidats · ' + metricLabel(); }
  function metricLabel() { return LABEL[S.poste] + (S.party >= 0 ? ' · ' + esc(PARTIES[S.party]) : ''); }

  function natPanel() {
    var keys = ['dep', 'pres', 'par'].concat(HD ? ['h16'] : []);
    var tab = (S.tab && keys.indexOf(S.tab) >= 0) ? S.tab : 'dep';
    var fem = C.filter(function (c) { return c.f; }).length;
    var h = '<div class="eyebrow">Vue nationale</div><h3>' + fmt(C.length) + ' candidats inscrits</h3><p class="sub">' + fmt(PARTIES.length) + ' partis · ' + Math.round(100 * fem / C.length) + ' % de femmes</p>' + partyNote();
    h += tabsHtml([{ k: 'dep', l: 'Départements' }, { k: 'pres', l: 'Présidentielle', n: pres.length }, { k: 'par', l: 'Partis' }].concat(HD ? [{ k: 'h16', l: '2016' }] : []), tab);
    if (tab === 'dep') {
      var ds = D.map(function (d, i) { return i; }).sort(function (a, b) { return M.dv[b] - M.dv[a] || D[a].n.localeCompare(D[b].n); });
      var mx = Math.max(1, M.dv[ds[0]]);
      h += '<p class="lead">' + leadLbl() + '. Touchez un département pour zoomer.</p><ul class="rank">' + ds.map(function (i) { return rankRow(D[i].n, M.dv[i], mx, 'dept', i); }).join('') + '</ul>';
    } else if (tab === 'h16') {
      h += natHist();
    } else if (tab === 'pres') {
      h += '<p class="lead">Candidature nationale : un seul scrutin pour tout le pays.</p>' + candList(pres.filter(passParty));
    } else {
      var pc = {};
      C.forEach(function (c) { pc[c.pa] = (pc[c.pa] || 0) + 1; });
      var top = Object.keys(pc).map(Number).sort(function (a, b) { return pc[b] - pc[a]; }).slice(0, 12);
      h += '<p class="lead">Les 12 partis les plus présents, tous postes confondus. Touchez un parti pour le suivre sur la carte.</p><ul class="rank">' + top.map(function (k) { return rankRow(PARTIES[k], pc[k], pc[top[0]], 'party', k); }).join('') + '</ul>';
    }
    return h;
  }

  function deptPanel(d) {
    var name = D[d].n, inD = C.filter(function (c) { return c.d === d; });
    var sen = inD.filter(function (c) { return c.po === 1 && passParty(c); });
    var keys = ['com', 'sen'].concat(HD ? ['hist'] : []);
    var tab = (S.tab && keys.indexOf(S.tab) >= 0) ? S.tab : (S.poste === 1 ? 'sen' : 'com');
    var h = crumbs(['<button type="button" data-act="reset">Haïti</button>', '<b>' + esc(name) + '</b>']) + '<h3>' + esc(name) + '</h3><p class="sub">' + plural(inD.length, 'candidat inscrit', 'candidats inscrits') + ' dans ce département.</p>' + partyNote();
    h += tabsHtml([{ k: 'com', l: 'Communes' }, { k: 'sen', l: 'Sénat', n: sen.length }].concat(HD ? [{ k: 'hist', l: 'Historique' }] : []), tab);
    if (tab === 'sen') {
      h += sen.length ? candList(sen.sort(function (a, b) { return PARTIES[a.pa].localeCompare(PARTIES[b.pa]) || a.nom.localeCompare(b.nom); })) : '<p class="empty">Aucun candidat au Sénat pour ce filtre.</p>';
    } else if (tab === 'hist') {
      h += deptHist(d);
    } else {
      var pl = [];
      P.forEach(function (p, i) { if (p.d === d) { pl.push(i); } });
      pl.sort(function (a, b) { return M.pv[b] - M.pv[a] || P[a].n.localeCompare(P[b].n); });
      var mx = Math.max(1, M.pv[pl[0]]);
      h += '<p class="lead">' + leadLbl() + (S.poste === 1 ? '. Le Sénat se vote par département : voir l’onglet Sénat.' : '. Touchez une commune pour voir ses candidats.') + '</p><ul class="rank">' +
        pl.map(function (i) { return rankRow(P[i].n, M.pv[i], mx, 'place', i, P[i].off ? ' <em class="off" title="Commune absente du fond de carte">hors carte</em>' : ''); }).join('') + '</ul>';
    }
    return h;
  }

  function placePanel(i) {
    var p = P[i], all = byPlace[i].filter(passParty), groups = {}, avail = [];
    [2, 3, 4, 5].forEach(function (po) {
      groups[po] = all.filter(function (c) { return c.po === po; });
      if (groups[po].length) { avail.push(po); }
    });
    var ids = (HD && HD.place2c[i]) || [], hasH = ids.length > 0;
    var tab = (S.tab && (avail.map(String).indexOf(S.tab) >= 0 || (S.tab === 'h15' && hasH))) ? S.tab : String(avail.indexOf(S.poste) >= 0 ? S.poste : (avail[0] || (hasH ? 'h15' : '')));
    var h = crumbs(['<button type="button" data-act="reset">Haïti</button>', '<button type="button" data-act="dept" data-i="' + p.d + '">' + esc(D[p.d].n) + '</button>', '<b>' + esc(p.n) + '</b>']) +
      '<h3>' + esc(p.n) + '</h3><p class="sub">' + plural(byPlace[i].length, 'candidature', 'candidatures') + ' · ' + esc(D[p.d].n) + '</p>' +
      (p.off ? '<div class="fnote warn">Commune créée après 2018 : absente du fond de carte, ses candidats sont listés ici.</div>' : '') + partyNote();
    if (!avail.length && !hasH) {
      h += '<p class="empty">Aucune candidature pour ce filtre dans cette commune.</p>';
    } else {
      h += tabsHtml(avail.map(function (po) { return { k: String(po), l: TITLE[po], n: groups[po].length }; }).concat(hasH ? [{ k: 'h15', l: '2015' }] : []), tab);
      if (tab === 'h15') {
        h += placeHist(ids);
      } else if (tab) {
        var po = +tab;
        if (HELP[po]) { h += '<p class="lead">' + esc(HELP[po]) + '</p>'; }
        if (po === 2) {
          var g = {};
          groups[2].forEach(function (c) { (g[c.lo] = g[c.lo] || []).push(c); });
          var ks = Object.keys(g);
          h += ks.map(function (lo) {
            var cs = g[lo].sort(function (a, b) { return PARTIES[a.pa].localeCompare(PARTIES[b.pa]) || a.nom.localeCompare(b.nom); });
            return ((ks.length > 1 || V.locs[lo].l.indexOf('/') >= 0) ? '<h4 class="circ">Circonscription · ' + esc(V.locs[lo].l) + '</h4>' : '') + candList(cs);
          }).join('');
        } else if (po >= 4 && groups[po].some(function (c) { return c.sc >= 0; })) {
          var sg = {};
          groups[po].forEach(function (c) { (sg[c.sc] = sg[c.sc] || []).push(c); });
          h += Object.keys(sg).map(Number).sort(function (a, b) { return a - b; }).map(function (k) { return '<h4 class="circ">' + esc(V.secs[k].n) + '</h4>' + tickets(sg[k]); }).join('');
        } else { h += tickets(groups[po]); }
      }
    }
    h += '<div class="plinks"><button type="button" class="lnk" data-bul="' + i + '">Mon bulletin ici ›</button><button type="button" class="lnk" data-act="dept" data-i="' + p.d + '" data-tab="sen">Sénat · ' + esc(D[p.d].n) + ' ›</button><button type="button" class="lnk" data-act="pres">Présidentielle ›</button></div>';
    return h;
  }

  function histRow(label, v, mx, pctText) {
    return '<li><div class="rk hist-r"><span class="rk-l">' + label + '</span><span class="rk-b"><i style="width:' + Math.round(100 * v / mx) + '%"></i></span><span class="rk-n">' + pctText + '</span></div></li>';
  }
  function srcNote() { return A.hui.srcNote(); }
  function natHist() {
    var st = HD.stat, nat = HD.pres.nat.slice(0, 8);
    var h = '<h4 class="circ">Présidentielle du 20 novembre 2016</h4><p class="lead">' + fmt(HD.pres.tot) + ' votes (« aucun candidat » compris) · ' + HD.pres.nat.length + ' candidats. Résultats préliminaires du CEP.</p><ul class="rank">' +
      nat.map(function (t, k) { return histRow((k + 1) + '. ' + esc(t.n), t.v, nat[0].v, pcs(t.pc)); }).join('') + '</ul>' +
      '<h4 class="circ">Députés, 2015-2017</h4><p class="f-line"><b>' + fmt(st.elus) + '</b> circonscriptions sur ' + st.circos + ' ont un élu : ' + (st.r1 + st.r2) + ' dès 2015 (' + st.r1 + ' au 1er tour, ' + st.r2 + ' au 2e tour) et <b>' + st.late + '</b> à l’issue de reprises (octobre 2015 à janvier 2017). <b>' + fmt(st.ncand) + '</b> candidats s’étaient présentés en 2015.</p>' +
      '<h4 class="circ">Sénat, 2015-2017</h4><p class="f-line"><b>' + (st.sen_el + st.sen17) + '</b> sénateurs élus : ' + st.sen_el + ' sur ' + st.sen_seats + ' sièges en 2015 (compléments du 20 novembre 2016 compris) et ' + st.sen17 + ' pour le tiers renouvelé en 2016-2017.</p>' +
      '<p class="f-line"><button type="button" class="lnk" data-act="hist" data-i="cand15">Voir la carte des candidats de 2015 ›</button></p>' + srcNote();
    return h;
  }
  function deptHist(d) {
    var h = '', pr = HD.pres.dept[d], cs = HD.circos.filter(function (c) { return c.d === d; });
    if (pr) {
      h += '<h4 class="circ">Présidentielle 2016 · ' + fmt(pr.t) + ' votes</h4><ul class="rank">' + pr.top.map(function (t) { return histRow(esc(t.n), t.v, pr.top[0].v, pcs(t.pc)); }).join('') + '</ul>';
    }
    h += A.hui.senHtml(d);
    var el = cs.filter(function (c) { return c.e; }).length, late = cs.filter(function (c) { return c.st === 'late'; }).length;
    h += '<h4 class="circ">Députés 2015-2017</h4><p class="f-line"><b>' + el + '</b> circonscriptions sur ' + cs.length + ' avec un élu' + (late ? ' (dont ' + late + ' après reprise)' : '') + ' · ' + fmt(sum(cs.map(function (c) { return c.nc || 0; }))) + ' candidats en 2015. Touchez une commune, onglet « 2015 », pour le détail.</p>' + srcNote();
    return h;
  }
  function placeHist(ids) {
    var h = '<p class="lead">Rappel des législatives de 2015 et de leurs reprises, circonscription par circonscription.</p>';
    ids.forEach(function (id) {
      var c = CI[id], locs = circo2locs[id] || [], lset = {};
      locs.forEach(function (l) { lset[l] = 1; });
      var now = C.filter(function (x) { return x.po === 2 && lset[x.lo]; });
      var back = now.filter(function (x) { var L = A.links(x); return L && L.some(function (l) { return l.k === 'd' && l.c === id; }); });
      h += A.hui.circoCard(c, { now: now, back: back });
    });
    return h + srcNote();
  }

  function renderPanel() {
    var s = S.sel, h;
    if (!s) { h = natPanel(); }
    else if (s.t === 'dept') { h = deptPanel(s.i); }
    else { h = placePanel(s.i); }
    var keep = side.classList.contains('expanded');
    side.innerHTML = (s ? sheetBar() : '') + '<div class="side-in">' + h + '</div>';
    side.classList.toggle('sheet', !!s);
    side.classList.toggle('expanded', keep && !!s);
    document.body.classList.toggle('sheet-open', !!s);
    if (S.flash >= 0) {
      var el = side.querySelector('[data-c="' + S.flash + '"]');
      if (el) { el.scrollIntoView({ block: 'center', behavior: REDUCED ? 'auto' : 'smooth' }); }
    }
  }

  function update() {
    var hr = document.getElementById('map-histrow');
    if (hr) { hr.hidden = !(HD && S.poste === 2); }
    M = computeMetric();
    renderMap(); renderLegend(); renderPostes(); renderPanel();
  }

  /* ---------- selection ---------- */
  function reveal() {
    if (!MOBILE.matches || !S.sel || document.getElementById('p-carte').hidden) { return; }
    stage.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
  }
  function setSel(sel, tab) {
    var before = focusDept();
    S.sel = sel; S.tab = tab || null; S.flash = -1;
    var after = focusDept();
    if (after >= 0) { if (after !== before || T.k < 1.4) { zoomToBox(D[after].b, 0.08); } }
    else { zoomReset(); }
    update();
    reveal();
  }
  function up() {
    var s = S.sel;
    if (!s) { return; }
    setSel(s.t === 'place' ? { t: 'dept', i: P[s.i].d } : null);
  }

  /* ---------- events ---------- */
  function tipFor(e, html) {
    var r = stage.getBoundingClientRect();
    tip.innerHTML = html;
    tip.style.left = Math.min(Math.max(8, e.clientX - r.left + 14), r.width - 200) + 'px';
    tip.style.top = Math.max(8, e.clientY - r.top - 10) + 'px';
    tip.hidden = false;
  }
  svg.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') { return; }
    var t = e.target.closest ? e.target.closest('.pl') : null;
    if (!t) { tip.hidden = true; hoverDept(-1); return; }
    var i = +t.getAttribute('data-i'), p = P[i], fd = focusDept();
    if (fd < 0 || p.d !== fd) {
      hoverDept(p.d);
      tipFor(e, '<b>' + esc(D[p.d].n) + '</b><br><span class="mono">' + fmt(M.dv[p.d]) + '</span> ' + unitLbl());
    } else {
      hoverDept(-1);
      tipFor(e, '<b>' + esc(p.n) + '</b><br><span class="mono">' + fmt(M.pv[i]) + '</span> ' + unitLbl());
    }
  });
  svg.addEventListener('pointerleave', function () { tip.hidden = true; hoverDept(-1); });
  svg.addEventListener('click', function (e) {
    tip.hidden = true;
    var t = e.target.closest ? e.target.closest('.pl') : null;
    if (!t) { up(); return; }
    var i = +t.getAttribute('data-i'), fd = focusDept();
    if (fd < 0 || P[i].d !== fd) { setSel({ t: 'dept', i: P[i].d }); } else { setSel({ t: 'place', i: i }); }
  });
  $('map-zin').addEventListener('click', function () { zoomBy(1.6); });
  $('map-zout').addEventListener('click', function () { zoomBy(1 / 1.6); });
  back.addEventListener('click', function () { setSel(null); });

  elPostes.innerHTML = [2, 1, 3, 4, 5].map(function (po) {
    return '<button type="button" class="pillb" data-p="' + po + '" aria-pressed="false" ' + (HELP[po] ? 'title="' + esc(HELP[po]) + '"' : '') + '>' + LABEL[po] + ' <span class="n"></span></button>';
  }).join('');
  elPostes.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-p]');
    if (!b) { return; }
    S.poste = +b.getAttribute('data-p'); S.tab = null;
    if (S.poste !== 2) { S.hist = 'none'; var hsel = document.getElementById('map-hist'); if (hsel) { hsel.value = 'none'; } }
    update();
  });
  selParty.innerHTML = '<option value="-1">Tous partis</option>' + PARTIES.map(function (p, i) { return '<option value="' + i + '">' + esc(p) + '</option>'; }).join('');
  selParty.addEventListener('change', function () { S.party = +selParty.value; update(); });

  $('p-carte').addEventListener('click', function (e) {
    var tb = e.target.closest('.ptab');
    if (tb && side.contains(tb)) { S.tab = tb.getAttribute('data-tab'); renderPanel(); return; }
    var b = e.target.closest('[data-act]');
    if (!b || !$('p-carte').contains(b)) { return; }
    var act = b.getAttribute('data-act'), i = +b.getAttribute('data-i');
    if (act === 'dept') { setSel({ t: 'dept', i: i }, b.getAttribute('data-tab')); }
    else if (act === 'place') { setSel({ t: 'place', i: i }); }
    else if (act === 'reset') { setSel(null); }
    else if (act === 'pres') { setSel(null, 'pres'); }
    else if (act === 'up') { up(); }
    else if (act === 'expand') { side.classList.toggle('expanded'); }
    else if (act === 'party') { S.party = i; selParty.value = String(i); S.tab = 'dep'; update(); }
    else if (act === 'hist') { showHist(b.getAttribute('data-i')); }
    else if (act === 'clearParty') { S.party = -1; selParty.value = '-1'; update(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('p-carte').hidden && document.activeElement === document.body) { up(); } });

  /* ---------- public api (search, links from other pages) ---------- */
  function pickPlace(i) { setSel({ t: 'place', i: i }); }
  function pickCandidate(i) {
    var c = C[i];
    if (S.party >= 0 && S.party !== c.pa) { S.party = -1; selParty.value = '-1'; }
    var sel, tab = null;
    if (c.po === 0) { sel = null; tab = 'pres'; }
    else if (c.po === 1) { S.poste = 1; sel = { t: 'dept', i: c.d }; tab = 'sen'; }
    else { S.poste = c.po; sel = { t: 'place', i: V.locs[c.lo].p[0] }; tab = String(c.po); }
    var before = focusDept();
    S.sel = sel; S.tab = tab; S.flash = c.i;
    var after = focusDept();
    if (after >= 0) { if (after !== before || T.k < 1.4) { zoomToBox(D[after].b, 0.08); } } else { zoomReset(); }
    update();
    reveal();
  }
  function showHist(metric) {
    S.poste = 2; S.hist = metric; S.sel = null; S.tab = null; S.flash = -1;
    var hsel = document.getElementById('map-hist'); if (hsel) { hsel.value = metric; }
    zoomReset(); update();
  }
  var histSel = document.getElementById('map-hist');
  if (histSel) { histSel.addEventListener('change', function () { S.hist = histSel.value; update(); }); }
  window.VVMap = { pickPlace: pickPlace, pickCandidate: pickCandidate, showHist: showHist };
  A.attachSearch($('map-search'), $('map-results'), function (k, i) { if (k === 'p') { pickPlace(i); } else { pickCandidate(i); } });
  side.addEventListener('click', function (e) {
    var b = e.target.closest('[data-bul]');
    if (b) { A.setLoc(+b.getAttribute('data-bul'), -1); A.show('bulletin'); }
  });
  A.onShow = function (name) { if (name === 'carte') { window.requestAnimationFrame(updateLabels); } };

  update();
})();
