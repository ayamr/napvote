(function () {
  'use strict';
  var V = window.VV, A = window.VVApp, H = window.VVH;
  var out = document.getElementById('r-out'), tabs = document.getElementById('r-tabs');
  if (!V || !A || !H || !out || !tabs) { return; }
  var esc = A.esc, fmt = A.fmt, pcs = A.pcs;
  var STAT15 = A.hui.STAT;
  var TABS = [['pres', 'Présidentielle 2016'], ['sen', 'Sénat 2015-17'], ['dep', 'Députés 2015-17'], ['fait', 'Faits marquants']];
  var S = { tab: 'pres', d: -1, q: '', all: false, late: false };
  var src = A.hui.srcNote();

  function bar(label, v, mx, txt, hl) {
    return '<li><div class="rk hist-r' + (hl ? ' win' : '') + '"><span class="rk-l">' + label + '</span><span class="rk-b"><i style="width:' + Math.round(100 * v / mx) + '%"></i></span><span class="rk-n">' + txt + '</span></div></li>';
  }
  function deptOpts(all) {
    return '<option value="-1">' + all + '</option>' + V.deptNames.map(function (n, i) { return '<option value="' + i + '"' + (S.d === i ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('');
  }

  function pres() {
    var nat = H.pres.nat, mx = nat[0].v, show = S.all ? nat : nat.slice(0, 8);
    var h = '<div class="stats big"><div><b>' + fmt(H.pres.tot) + '</b><span>votes comptés</span></div><div><b>' + nat.length + '</b><span>candidats</span></div><div><b>' + pcs(nat[0].pc) + '</b><span>' + esc(nat[0].n) + ' (1er)</span></div><div><b>' + pcs(nat[1].pc) + '</b><span>' + esc(nat[1].n) + ' (2e)</span></div></div>';
    h += '<div class="sec-h sm"><h2>Résultats nationaux</h2><span class="srcn">20 novembre 2016</span></div><ul class="rank">' + show.map(function (t, k) { return bar((k + 1) + '. ' + esc(t.n), t.v, mx, pcs(t.pc) + ' <small>' + fmt(t.v) + '</small>', k === 0); }).join('') + '</ul>';
    if (nat.length > 8) { h += '<button type="button" class="more" data-all="1">' + (S.all ? 'Réduire' : 'Voir les ' + nat.length + ' candidats') + '</button>'; }
    h += '<div class="sec-h"><h2>Par département</h2></div><label class="field2">Département <select id="r-d">' + deptOpts('Tous (vainqueur par département)') + '</select></label>';
    if (S.d < 0) {
      h += '<div class="tw"><table class="ctab2"><thead><tr><th>Département</th><th>En tête</th><th>%</th><th>2e</th><th>%</th><th>Votes</th></tr></thead><tbody>' +
        V.deptNames.map(function (n, i) { var p = H.pres.dept[i]; if (!p) { return ''; } return '<tr class="clk" data-d="' + i + '"><td><b>' + esc(n) + '</b></td><td>' + esc(p.top[0].n) + '</td><td class="mono">' + pcs(p.top[0].pc) + '</td><td>' + esc(p.top[1].n) + '</td><td class="mono">' + pcs(p.top[1].pc) + '</td><td class="mono">' + fmt(p.t) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    } else {
      var p = H.pres.dept[S.d];
      h += '<p class="lead">' + fmt(p.t) + ' votes dans le département ' + esc(V.deptNames[S.d]) + '</p><ul class="rank">' + p.top.map(function (t, k) { return bar(esc(t.n), t.v, p.top[0].v, pcs(t.pc) + ' <small>' + fmt(t.v) + '</small>', k === 0); }).join('') + '</ul>';
    }
    return h + src;
  }

  function sen() {
    var h = '<p class="lead">Le Sénat compte 3 sièges par département : 2 étaient à pourvoir en 2015 (certains sièges sont restés vacants jusqu’au 2e tour du 20 novembre 2016) et 1 l’a été lors du renouvellement du tiers du Sénat de 2016-2017. Chaque électeur disposait de 2 voix en 2015, les pourcentages 2015 ne s’additionnent donc pas.</p>';
    var ds = V.deptNames.map(function (n, i) { return i; }).filter(function (i) { return S.d < 0 || i === S.d; });
    h += '<label class="field2">Département <select id="r-d">' + deptOpts('Tous les départements') + '</select></label><div class="rcards">';
    ds.forEach(function (d) {
      var s = H.sen[d]; if (!s) { return; }
      var elu = s.el.length + (s.s17 ? 1 : 0);
      h += '<article class="hc"><div class="hc-h"><b>' + esc(V.deptNames[d]) + '</b><span class="status ' + (elu >= 3 ? 'ok' : 'pend') + '">' + elu + ' élu' + (elu > 1 ? 's' : '') + ' sur 3</span></div>' + A.hui.senHtml(d);
      if (s.top.length) { h += '<details class="sec"><summary><span>1er tour 2015 : les ' + Math.min(6, s.top.length) + ' premiers</span></summary><ul class="rank">' + s.top.slice(0, 6).map(function (t) { return bar(esc(t.n) + ' <em class="off">' + esc(t.p) + '</em>', t.v, s.top[0].v, pcs(t.pc)); }).join('') + '</ul></details>'; }
      h += '</article>';
    });
    return h + '</div>' + src;
  }

  function dep() {
    var q = A.norm(S.q), st = H.stat;
    var list = H.circos.filter(function (c) { return (S.d < 0 || c.d === S.d) && (!S.late || c.st === 'late') && (!q || A.norm(c.n).indexOf(q) >= 0 || (c.e && A.norm(c.e.n).indexOf(q) >= 0)); });
    var h = '<div class="stats big"><div><b>' + st.circos + '</b><span>circonscriptions</span></div><div><b>' + st.elus + '</b><span>avec un élu</span></div><div><b>' + (st.r1 + st.r2) + '</b><span>élus dès 2015</span></div><div><b>' + st.late + '</b><span>élus après reprise</span></div><div><b>' + fmt(st.ncand) + '</b><span>candidats en 2015</span></div></div>';
    h += '<div class="fbar"><label class="field"><span class="sr">Département</span><select id="r-d">' + deptOpts('Tous les départements') + '</select></label><label class="field q"><span class="sr">Circonscription ou élu</span><input id="r-q" type="search" placeholder="Circonscription ou nom d’élu" value="' + esc(S.q) + '" autocomplete="off"></label><label class="chk"><input type="checkbox" id="r-late"' + (S.late ? ' checked' : '') + '> Seulement les reprises (' + st.late + ')</label></div>';
    h += '<p class="sub-count">' + fmt(list.length) + ' circonscription' + (list.length > 1 ? 's' : '') + '</p><div class="rcards">';
    list.slice(0, S.all ? 999 : 30).forEach(function (c) { h += A.hui.circoCard(c, {}); });
    h += '</div>';
    if (list.length > 30 && !S.all) { h += '<button type="button" class="more" data-all="1">Afficher les ' + (list.length - 30) + ' autres</button>'; }
    return h + src;
  }

  function fait() {
    var cs = H.circos, el = cs.filter(function (c) { return c.e; });
    var maxV = el.slice().sort(function (a, b) { return b.e.v - a.e.v; })[0];
    var minV = el.slice().sort(function (a, b) { return a.e.v - b.e.v; })[0];
    var maxPc = el.slice().sort(function (a, b) { return b.e.pc - a.e.pc; })[0];
    var minPc = el.slice().sort(function (a, b) { return a.e.pc - b.e.pc; })[0];
    var crowd = cs.slice().sort(function (a, b) { return (b.nc || 0) - (a.nc || 0); })[0];
    var tight = cs.filter(function (c) { return c.top.length > 1; }).map(function (c) { return { c: c, gap: c.top[0].v - c.top[1].v }; }).sort(function (a, b) { return a.gap - b.gap; })[0];
    var parties = {};
    el.forEach(function (c) { parties[c.e.p] = (parties[c.e.p] || 0) + 1; });
    var pk = Object.keys(parties).sort(function (a, b) { return parties[b] - parties[a]; }).slice(0, 8);
    var late = cs.filter(function (c) { return c.st === 'late'; }), rcount = {};
    late.forEach(function (c) { var k = c.e.dt + (c.e.rd === 1 ? ' (1er tour repris)' : ' (2e tour)'); rcount[k] = (rcount[k] || 0) + 1; });
    var tightL = late.filter(function (c) { return c.rp.top.length > 1; }).map(function (c) { return { c: c, gap: c.rp.top[0].v - c.rp.top[1].v }; }).sort(function (a, b) { return a.gap - b.gap; })[0];
    function card(t, big, sub) { return '<div class="ag"><span class="eyebrow">' + esc(t) + '</span><b class="hb-t">' + big + '</b><span>' + sub + '</span></div>'; }
    var h = '<p class="lead">Calculé par NapVote à partir des résultats des législatives de 2015 et de leurs reprises (députés).</p><div class="agenda">' +
      card('Élu avec le plus de voix', fmt(maxV.e.v) + ' voix', esc(maxV.e.n) + ' (' + esc(maxV.e.p) + '), ' + esc(maxV.n)) +
      card('Élu avec le moins de voix', fmt(minV.e.v) + ' voix', esc(minV.e.n) + ' (' + esc(minV.e.p) + '), ' + esc(minV.n)) +
      card('Meilleur score', pcs(maxPc.e.pc), esc(maxPc.e.n) + ', ' + esc(maxPc.n)) +
      card('Plus faible part de voix d’un élu', pcs(minPc.e.pc), esc(minPc.e.n) + ', ' + esc(minPc.n)) +
      (tightL ? card('Reprise la plus serrée', fmt(tightL.gap) + ' voix', esc(tightL.c.rp.top[0].n) + ' devant ' + esc(tightL.c.rp.top[1].n) + ', ' + esc(tightL.c.n) + ' (' + esc(tightL.c.rp.dt) + ')') : '') +
      card('Circonscription la plus disputée', (crowd.nc) + ' candidats', esc(crowd.n)) +
      (tight ? card('Écart le plus serré au 1er tour', fmt(tight.gap) + ' voix', esc(tight.c.top[0].n) + ' devant ' + esc(tight.c.top[1].n) + ', ' + esc(tight.c.n)) : '') + '</div>';
    h += '<div class="sec-h sm"><h2>Partis des députés élus en 2015</h2></div><ul class="rank">' + pk.map(function (p) { return bar(esc(p), parties[p], parties[pk[0]], parties[p] + ' élu' + (parties[p] > 1 ? 's' : '')); }).join('') + '</ul>';
    h += '<div class="sec-h sm"><h2>Circonscriptions pourvues après reprise</h2></div><ul class="rank">' + Object.keys(rcount).sort().map(function (k) { return bar(esc(k), rcount[k], late.length, String(rcount[k])); }).join('') + '</ul><p class="note-s">Les ' + late.length + ' circonscriptions dont le scrutin d’août 2015 avait été annulé ou était à reprendre.</p>';
    return h + src;
  }

  function render() {
    tabs.innerHTML = TABS.map(function (t) { return '<button type="button" class="pillb" data-t="' + t[0] + '" aria-pressed="' + (t[0] === S.tab) + '">' + t[1] + '</button>'; }).join('');
    out.innerHTML = S.tab === 'pres' ? pres() : (S.tab === 'sen' ? sen() : (S.tab === 'dep' ? dep() : fait()));
  }
  tabs.addEventListener('click', function (e) {
    var b = e.target.closest('[data-t]');
    if (b) { S.tab = b.getAttribute('data-t'); S.d = -1; S.all = false; S.q = ''; S.late = false; render(); }
  });
  out.addEventListener('change', function (e) { if (e.target.id === 'r-d') { S.d = +e.target.value; render(); } if (e.target.id === 'r-late') { S.late = e.target.checked; render(); } });
  out.addEventListener('input', function (e) {
    if (e.target.id === 'r-q') { S.q = e.target.value; var pos = e.target.selectionStart; render(); var q = document.getElementById('r-q'); q.focus(); q.setSelectionRange(pos, pos); }
  });
  out.addEventListener('click', function (e) {
    if (e.target.closest('[data-all]')) { S.all = !S.all; render(); return; }
    var r = e.target.closest('tr[data-d]');
    if (r) { S.d = +r.getAttribute('data-d'); render(); }
  });
  A.on('res', function (t) { S.tab = t; S.d = -1; S.all = false; S.q = ''; S.late = false; render(); });
  A.on('loc', function () { /* garde l'onglet */ });
  render();
})();
