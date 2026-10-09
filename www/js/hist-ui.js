(function () {
  'use strict';
  var V = window.VV, A = window.VVApp, H = window.VVH;
  if (!V || !A || !H) { return; }
  var esc = A.esc, fmt = A.fmt, pcs = A.pcs;
  var U = A.hui = {};

  var STK = ['r1', 'r2', 'late', 'qualif', 'annule', 'reprise1', 'reprise2', 'inconnu'];
  U.STAT = {};
  STK.forEach(function (k) { Object.defineProperty(U.STAT, k, { get: function () { return t('st.' + k); }, enumerable: true }); });
  var SRC = {
    def: 'Résultats définitifs partiels du CEP (30 décembre 2016)',
    prel: 'Résultats préliminaires du CEP (5 décembre 2016)',
    wiki: 'Tableau de résultats de Wikipédia ; non confirmé par une publication du CEP que nous avons pu consulter'
  };
  U.srcNote = function () {
    return '<p class="note-s">Sources : CEP (résultats préliminaires et définitifs partiels, décisions du contentieux), via HaïtiLibre ; tableaux de résultats de Wikipédia pour les voix des reprises. Les pourcentages des reprises sont calculés par NapVote sur les votes valides et peuvent différer légèrement de ceux publiés par le CEP.</p>';
  };
  U.roundLbl = function (e) { return (e.rd === 2 ? '2e tour' : '1er tour') + (e.dt ? ' du ' + e.dt : ''); };

  /* un tableau de voix */
  function table(list) {
    return '<table class="tbl h"><thead><tr><th>Candidat</th><th>Parti</th><th>Voix</th><th>%</th></tr></thead><tbody>' +
      list.map(function (t) { return '<tr><td>' + esc(t.n) + '</td><td>' + esc(t.p) + '</td><td class="mono">' + fmt(t.v) + '</td><td class="mono">' + pcs(t.pc) + '</td></tr>'; }).join('') + '</tbody></table>';
  }

  /* carte d'une circonscription ; ctx = { now: candidats 2026 de la circonscription, back: ceux déjà en lice, nowLabel: bool } */
  U.circoCard = function (c, ctx) {
    ctx = ctx || {};
    var late = c.st === 'late', h = '<div class="hc"><div class="hc-h"><b>' + esc(c.n) + '</b><span class="status ' + (c.e ? 'ok' : 'pend') + '">' + esc(U.STAT[c.st] || c.st) + '</span></div>' + (late && c.e.src && c.e.src !== 'def' ? '<p><span class="stamp">' + esc(t(c.e.src === 'wiki' ? 'hx.wiki' : 'hx.prov')) + '</span></p>' : '');
    if (ctx.now) {
      h += '<div class="stats"><div><b>' + fmt(c.nc || 0) + '</b><span>' + esc(t('hx.c15')) + '</span></div><div><b>' + fmt(ctx.now.length) + '</b><span>' + esc(t('hx.c26')) + '</span></div></div>';
    } else if (c.nc) {
      h += '<p class="note-s">' + esc(V.deptNames[c.d]) + ' · ' + fmt(c.nc) + ' candidats en 2015</p>';
    }
    if (c.e) {
      h += '<p class="hc-l"><span>' + esc(t('hx.last')) + '</span><b>' + esc(c.e.n) + ' <em class="off">' + esc(c.e.p) + '</em></b></p>' +
        '<p class="hc-l"><span>' + esc(t('hx.votes')) + '</span><b>' + fmt(c.e.v) + ' · ' + pcs(c.e.pc) + '</b></p>';
      if (late) { h += '<p class="hc-l"><span>' + esc(t('hx.decisive')) + '</span><b>' + esc(U.roundLbl(c.e)) + (c.e.rd === 1 ? ' (repris)' : '') + '</b></p>'; }
    } else {
      h += '<p class="note-s">' + esc(c.why || 'Pas d’élu dans nos sources.') + '</p>';
      if (c.w) { h += '<p class="hc-l"><span>En tête au 1er tour</span><b>' + esc(c.w.n) + ' <em class="off">' + esc(c.w.p) + '</em> · ' + pcs(c.w.pc) + '</b></p>'; }
    }
    var vv = c.rp ? c.rp.vv : (c.r2 ? c.r2.vv : c.vv);
    h += '<p class="hc-l"><span>' + esc(t('hx.valid')) + '</span><b>' + fmt(vv) + (c.rp ? ' (scrutin décisif)' : (c.r2 ? ' (2e tour)' : ' (1er tour)')) + '</b></p>';
    if (c.rp && c.rp.top.length > 1) {
      h += '<details class="sec"><summary><span>Scrutin décisif : les ' + c.rp.top.length + ' premiers</span></summary>' + table(c.rp.top) + '</details>';
    }
    if (c.top.length) {
      h += '<details class="sec"><summary><span>' + (late ? '1er tour d’août 2015 (annulé ou à reprendre) : les ' : '1er tour : les ') + c.top.length + ' premiers</span></summary>' + table(c.top) + '</details>';
    }
    if (late && c.e.src) { h += '<p class="note-s">' + esc(SRC[c.e.src]) + '.' + (c.why0 ? ' Situation fin 2015 : ' + esc(c.why0.replace(/\.$/, '')) + '.' : '') + '</p>'; }
    if (ctx.back) {
      if (ctx.back.length) {
        h += '<div class="hc-n"><b>Déjà candidats en 2015 et de nouveau en lice :</b> ' + ctx.back.map(function (x) { return '<button type="button" class="lnk inl" data-c="' + x.i + '">' + esc(x.pre + ' ' + x.nom) + '</button>'; }).join(', ') + '</div>';
      }
    }
    return h + '</div>';
  };

  /* le Sénat d'un département : 2015, compléments du 20 novembre 2016, tiers 2016-2017 */
  U.senHtml = function (d, opt) {
    opt = opt || {};
    var s = H.sen[d]; if (!s) { return ''; }
    var h = '';
    var el15 = s.el.filter(function (e) { return !e.late; }), late = s.el.filter(function (e) { return e.late; });
    function row(e, withVotes) {
      var votes = e.v != null ? fmt(e.v) + ' voix' + (e.pc != null ? ' · ' + pcs(e.pc) : '') : (e.pc != null ? pcs(e.pc) : '');
      return '<li class="srow"><span><b>' + esc(e.n) + '</b> <em class="off">' + esc(e.p) + '</em></span><span class="mono">' + votes + '</span></li>';
    }
    h += '<h4 class="circ">Sénat 2015 · ' + s.seats + ' sièges · ' + s.nc + ' candidats' + (opt.now != null ? ' (' + opt.now + ' inscrits en 2026)' : '') + '</h4>';
    if (el15.length) {
      h += '<ul class="slist">' + el15.map(function (e) { return row(e) + ''; }).join('') + '</ul><p class="note-s">' + (el15.some(function (e) { return e.rd === 2; }) ? 'Élus au 2e tour.' : 'Élus au 1er tour.') + ' Chaque électeur disposait de 2 voix.</p>';
    } else if (!late.length) {
      h += '<p class="f-line">Aucun élu dans les résultats d’octobre 2015' + (s.q.length ? ' ; qualifiés pour le 2e tour : ' + s.q.map(function (x) { return esc(x[1]) + ' (' + esc(x[0]) + ')'; }).join(', ') : '') + '.</p>';
    }
    if (late.length) {
      h += '<p class="lead">' + (el15.length ? 'Siège(s) resté(s) vacant(s), pourvu(s) ' : 'Sièges pourvus ') + 'au 2e tour du 20 novembre 2016 (résultats définitifs partiels du CEP) :</p><ul class="slist">' + late.map(function (e) { return row(e); }).join('') + '</ul>';
      if (s.note) { h += '<p class="note-s">' + esc(s.note) + '</p>'; }
    }
    var x = s.s17;
    if (x) {
      h += '<h4 class="circ">Tiers du Sénat 2016-2017 · 1 siège</h4><ul class="slist">' + row({ n: x.n, p: x.p, v: null, pc: x.pc }) + '</ul><p class="note-s">Élu au ' + (x.rd === 1 ? '1er tour du 20 novembre 2016' : '2e tour du 29 janvier 2017') +
        (x.o ? ', devant ' + esc(x.o.n) + ' (' + esc(x.o.p) + (x.o.pc != null ? ', ' + pcs(x.o.pc) : '') + ')' : '') + '. ' +
        (x.pc == null ? 'Pourcentage du 2e tour non repris dans nos sources' + (x.r1 ? ' ; 1er tour : ' + pcs(x.r1[0]) + ' contre ' + pcs(x.r1[1]) + ' pour le suivant' : '') + '. ' : '') +
        (x.src === 'wiki' ? 'Source : tableau de résultats de Wikipédia.' : (x.src === 'prel' ? 'Résultats préliminaires du CEP (5 décembre 2016).' : 'Résultats définitifs du CEP (9 février 2017).')) + '</p>';
    }
    return h;
  };

  /* chiffres globaux */
  U.sen3 = function () { return H.stat.sen_el + H.stat.sen17; };
})();
