(function () {
  'use strict';
  var V = window.VV, A = window.VVApp;
  var root = document.getElementById('cl');
  if (!V || !A || !root) { return; }

  var STEP = 60;
  var P = V.parties, esc = A.esc, fmt = A.fmt, norm = A.norm, C = A.C;
  function place(c) { return c.lo >= 0 ? V.locs[c.lo].l : ''; }

  var byPoste = [0, 1, 2, 3, 4, 5].map(function (po) {
    return C.filter(function (c) { return c.po === po; }).sort(function (a, b) {
      return (a.d - b.d) || place(a).localeCompare(place(b), 'fr') || (a.sc - b.sc) || P[a.pa].localeCompare(P[b.pa]) || a.ps - b.ps || a.nom.localeCompare(b.nom, 'fr');
    });
  });

  var S = { poste: 0, dept: -1, party: -1, q: '', shown: STEP, hist: false, fav: false };
  var elPostes = document.getElementById('cl-postes');
  var elDept = document.getElementById('cl-dept');
  var elDeptWrap = document.getElementById('cl-dept-wrap');
  var elParty = document.getElementById('cl-party');
  var elQ = document.getElementById('cl-q');
  var elCount = document.getElementById('cl-count');
  var elOut = document.getElementById('cl-out');
  var elHist = document.getElementById('cl-hist');
  var elFav = document.getElementById('cl-fav');

  elPostes.innerHTML = [0, 1, 2, 3, 4, 5].map(function (i) {
    return '<button type="button" class="pillb" data-p="' + i + '" aria-pressed="' + (i === 0) + '">' + esc(t('postl.' + i)) + '<span class="n">' + fmt(byPoste[i].length) + '</span></button>';
  }).join('');
  elDept.innerHTML = '<option value="-1">' + esc(t('c.alld')) + '</option>' + V.deptNames.map(function (n, i) { return '<option value="' + i + '">' + esc(n) + '</option>'; }).join('');
  elParty.innerHTML = '<option value="-1">' + esc(t('c.allp')) + '</option>' + P.map(function (p, i) { return '<option value="' + i + '">' + esc(p) + '</option>'; }).join('');

  function filtered() {
    var toks = norm(S.q).split(' ').filter(Boolean);
    return byPoste[S.poste].filter(function (c) {
      if (S.dept >= 0 && c.d !== S.dept) { return false; }
      if (S.party >= 0 && c.pa !== S.party) { return false; }
      if (S.hist && !A.links(c)) { return false; }
      if (S.fav && !A.isFav(c)) { return false; }
      return toks.every(function (t2) { return c.q.indexOf(t2) >= 0; });
    });
  }

  function sub(c) {
    if (c.po === 0) { return ''; }
    var bits = [];
    if (c.po >= 3) { bits.push(V.pos[c.ps]); }
    bits.push(c.po === 1 ? V.deptNames[c.d] : place(c) + (c.sc >= 0 ? ' · ' + V.secs[c.sc].n : '') + ' · ' + V.deptNames[c.d]);
    return bits.join(' · ');
  }

  function render() {
    elPostes.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-p') === S.poste)); });
    elDeptWrap.hidden = S.poste === 0;
    var list = filtered(), shown = list.slice(0, S.shown), total = byPoste[S.poste].length;
    var n = list.length === total ? fmt(list.length) : t('c.of', { n: fmt(list.length), t: fmt(total) });
    elCount.textContent = (list.length === total ? t(list.length > 1 ? 'c.count.n' : 'c.count.1', { n: n }) : t('c.count.n', { n: n })) + ' · ' + t('postl.' + S.poste);
    if (!list.length) { elOut.innerHTML = '<p class="empty">' + esc(t('c.none')) + '</p>'; return; }
    var html = '<ul class="clist">' + shown.map(function (c) {
      var act = c.po > 0 ? '<button type="button" class="c-map" data-map="' + c.i + '" aria-label="' + esc(c.pre + ' ' + c.nom + ' : ' + t('c.map')) + '">' + esc(t('c.map')) + '</button>' : '';
      return A.row(c, { sub: sub(c), act: act });
    }).join('') + '</ul>';
    if (list.length > shown.length) { html += '<button type="button" class="more" id="cl-more">' + esc(t('c.more', { n: fmt(list.length - shown.length) })) + '</button>'; }
    elOut.innerHTML = html;
  }

  elPostes.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-p]');
    if (!b) { return; }
    S.poste = +b.getAttribute('data-p'); S.shown = STEP; render();
  });
  elDept.addEventListener('change', function () { S.dept = +elDept.value; S.shown = STEP; render(); });
  elParty.addEventListener('change', function () { S.party = +elParty.value; S.shown = STEP; render(); });
  if (elHist) { elHist.addEventListener('change', function () { S.hist = elHist.checked; S.shown = STEP; render(); }); }
  if (elFav) { elFav.addEventListener('change', function () { S.fav = elFav.checked; S.shown = STEP; render(); }); }
  A.on('fav', function () { if (S.fav) { render(); } });
  A.on('poste', function (po) { S.poste = po; S.dept = -1; S.party = -1; S.q = ''; S.shown = STEP; elDept.value = '-1'; elParty.value = '-1'; elQ.value = ''; render(); });
  A.on('party', function (i) { S.party = i; S.poste = 2; S.dept = -1; S.q = ''; S.shown = STEP; elParty.value = String(i); elDept.value = '-1'; elQ.value = ''; render(); });
  elQ.addEventListener('input', function () { S.q = elQ.value; S.shown = STEP; render(); });
  document.getElementById('cl-reset').addEventListener('click', function () {
    S.dept = -1; S.party = -1; S.q = ''; S.shown = STEP; S.hist = false; S.fav = false;
    if (elHist) { elHist.checked = false; } if (elFav) { elFav.checked = false; }
    elDept.value = '-1'; elParty.value = '-1'; elQ.value = '';
    render();
  });
  elOut.addEventListener('click', function (e) {
    if (e.target.id === 'cl-more') { S.shown += STEP * 2; render(); return; }
    var m = e.target.closest('button[data-map]');
    if (m && window.VVMap) { A.show('carte'); window.VVMap.pickCandidate(+m.getAttribute('data-map')); }
  });

  render();
})();
