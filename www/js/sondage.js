/* Sondage ouvert, un scrutin par ligne du bulletin : président, sénat, députés, maire, CASEC, ASEC.
   Anonyme, non scientifique, un choix modifiable par appareil et par scrutin. */
(function () {
  'use strict';
  var V = window.VV, A = window.VVApp, root = document.getElementById('poll-out');
  if (!V || !A || !root || !A.parts) { return; }
  var esc = A.esc, fmt = A.fmt, norm = A.norm;
  var CFG = window.NAPVOTE || {}, base = CFG.pollUrl || '';
  var dev = /^(localhost|127\.0\.0\.1)$/.test(location.hostname), q = /[?&]poll=([^&]+)/.exec(location.search);
  if (dev && q) { base = decodeURIComponent(q[1]); }
  base = base.replace(/\/$/, '');
  if (!base) {
    document.querySelectorAll('[data-go="poll"], [data-poll-home]').forEach(function (el) { (el.closest('li') || el).hidden = true; });
    var pk = document.getElementById('poll-picker'); if (pk) { pk.hidden = true; }
  }
  var FEW = 30, MAXS = 12;
  var FIXED = [{ c: '~aucun', n: t('poll.opt.aucun') }, { c: '~indecis', n: t('poll.opt.indecis') }, { c: '~abstention', n: t('poll.opt.abstention') }];

  /* ---- état local : identifiant d'appareil anonyme et réponses déjà données ---- */
  var mine = A.store.get('poll', null) || {};
  if (!mine.device || mine.device.length < 16) {
    var id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
    mine.device = id.replace(/[^A-Za-z0-9-]/g, '').slice(0, 64);
    if (mine.device.length < 16) { mine.device += '0000000000000000'; }
  }
  mine.answers = mine.answers || {}; mine.dept = mine.dept || '';
  delete mine.choice;
  A.store.set('poll', mine);
  var view = '', token = '';

  /* ---- scrutins proposés selon la commune enregistrée ---- */
  function cOpt(c) { return { c: norm(c.nom + ' ' + c.pre), n: c.pre + ' ' + c.nom, s: V.parties[c.pa] }; }
  function listOpts(list) {
    return A.partyGroups(list).map(function (g) {
      var tit = g.cs.filter(function (c) { return c.ps === 0; })[0] || g.cs[0];
      return { c: norm(V.parties[g.pa]), n: V.parties[g.pa], s: t('poll.titulaire', { n: tit.pre + ' ' + tit.nom }) };
    });
  }
  function scopes() {
    var out = [{ scope: 'pres', title: t('b.pres'), opts: A.pres.map(cOpt) }], loc = A.loc();
    if (!loc) { return { list: out, loc: null }; }
    var p = A.parts(loc), dn = V.deptNames[V.places[loc.pi].d];
    if (p.sen.length) { out.push({ scope: 'sen|' + norm(dn), title: t('b.sen', { d: dn }), opts: p.sen.map(cOpt) }); }
    var byLo = {};
    p.dep.forEach(function (c) { (byLo[c.lo] = byLo[c.lo] || []).push(c); });
    Object.keys(byLo).map(Number).sort(function (a, b) { return V.locs[a].l.localeCompare(V.locs[b].l, 'fr'); }).forEach(function (lo) {
      out.push({ scope: 'dep|' + norm(V.locs[lo].l), title: t('b.dep') + ' · ' + t('b.circo', { c: V.locs[lo].l }), opts: byLo[lo].map(cOpt) });
    });
    if (p.may.length) { out.push({ scope: 'may|' + norm(V.locs[p.may[0].lo].l), title: t('b.may', { c: V.places[loc.pi].n }), opts: listOpts(p.may) }); }
    var needSec = false;
    [['cas', p.cas, t('b.cas')], ['asec', p.asec, t('b.asec')]].forEach(function (x) {
      if (!A.secsOf[loc.pi].length) { return; }
      if (loc.sec < 0) { needSec = true; return; }
      if (x[1].length) { out.push({ scope: x[0] + '|' + norm(V.locs[x[1][0].lo].l) + '|' + norm(V.secs[loc.sec].n), title: x[2] + ' · ' + V.secs[loc.sec].n, opts: listOpts(x[1]) }); }
    });
    return { list: out, loc: loc, needSec: needSec, secs: A.secsOf[loc.pi] };
  }
  function shuffled(sc) { // ordre aléatoire, stable pendant la visite : personne n'est systématiquement en tête
    var st; try { st = JSON.parse(sessionStorage.getItem('vv.pollorder')) || {}; } catch (e) { st = {}; }
    var keys = sc.opts.map(function (o) { return o.c; }), cur = st[sc.scope];
    if (!cur || cur.length !== keys.length || keys.some(function (k) { return cur.indexOf(k) < 0; })) {
      cur = keys.slice();
      for (var i = cur.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = cur[i]; cur[i] = cur[j]; cur[j] = x; }
      st[sc.scope] = cur; try { sessionStorage.setItem('vv.pollorder', JSON.stringify(st)); } catch (e) { /* ignore */ }
    }
    var by = {}; sc.opts.forEach(function (o) { by[o.c] = o; });
    return cur.map(function (k) { return by[k]; });
  }
  function myDept(S) { return mine.dept || (S.loc ? V.deptNames[V.places[S.loc.pi].d] : ''); }
  function deptOptions(sel, all) {
    return '<option value="">' + esc(all ? t('poll.all') : t('pk.choose')) + '</option>' + V.deptNames.map(function (n) { return '<option value="' + esc(n) + '"' + (n === sel ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('');
  }
  var warn = '<div class="notice"><b>' + esc(t('poll.warn.t')) + '</b> ' + esc(t('poll.warn')) + '</div>';
  function answered() { return Object.keys(mine.answers).length; }

  /* ---- formulaire ---- */
  function renderForm(err) {
    var S = scopes(), h = warn + '<p class="lead">' + esc(t('poll.intro')) + '</p>';
    if (!S.loc) { h += '<p class="note-s">' + esc(t('poll.needCommune')) + '</p>'; }
    h += '<form id="poll-form">';
    S.list.forEach(function (sc, i) {
      var cur = (mine.answers[sc.scope] || {}).c;
      if (S.needSec && sc.scope.indexOf('may|') === 0) { /* la section se choisit après le maire */ }
      h += '<fieldset class="poll-f" data-scope="' + esc(sc.scope) + '"><legend>' + esc(sc.title) + '</legend><ul class="rows poll-l">' +
        shuffled(sc).concat(FIXED.map(function (f) { return { c: f.c, n: f.n, s: '', fixed: true }; })).map(function (x) {
          return '<li><label class="poll-o' + (x.fixed ? ' fx' : '') + '"><input type="radio" name="r' + i + '" value="' + esc(x.c) + '"' + (x.c === cur ? ' checked' : '') + '><span class="poll-t"><b>' + esc(x.n) + '</b>' + (x.s ? '<span>' + esc(x.s) + '</span>' : '') + '</span></label></li>';
        }).join('') + '</ul></fieldset>';
    });
    if (S.needSec) {
      h += '<div class="sec-pick poll-sec"><label><span>' + esc(t('poll.needSection')) + '</span><select id="poll-sec"><option value="-1">' + esc(t('b.sec.choose')) + '</option>' +
        S.secs.map(function (k) { return '<option value="' + k + '">' + esc(V.secs[k].n) + '</option>'; }).join('') + '</select></label></div>';
    }
    h += '<label class="pk-f poll-d"><span>' + esc(t('poll.dept')) + '</span><select id="poll-dept">' + deptOptions(myDept(S)) + '</select></label>' +
      (CFG.turnstileKey ? '<div id="poll-ts" class="poll-ts"></div>' : '') +
      '<p class="pk-msg" id="poll-msg" role="status">' + (err ? esc(err) : '') + '</p>' +
      '<div class="pk-act"><button type="submit" class="btn primary" id="poll-send" disabled>' + esc(t('poll.send')) + '</button>' +
      (answered() ? '<button type="button" class="btn ghost" data-pcancel>' + esc(t('poll.cancel')) + '</button>' : '<button type="button" class="btn ghost" data-pres>' + esc(t('poll.seeResults')) + '</button>') + '</div>' +
      '<p class="note-s">' + esc(t('poll.how')) + '</p></form>';
    root.innerHTML = h;
    var f = document.getElementById('poll-form'), btn = document.getElementById('poll-send');
    function upd() { btn.disabled = !f.querySelector('input[type=radio]:checked'); }
    f.addEventListener('change', upd); upd();
    if (CFG.turnstileKey) { mountTurnstile(); }
  }
  function mountTurnstile() {
    function draw() { if (window.turnstile && document.getElementById('poll-ts')) { window.turnstile.render('#poll-ts', { sitekey: CFG.turnstileKey, callback: function (tk) { token = tk; } }); } }
    if (window.turnstile) { draw(); return; }
    var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = draw; document.head.appendChild(s);
  }
  function post(path, body) {
    return fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.error || 'erreur'); e.status = r.status; throw e; } return j; }); });
  }

  /* ---- résultats ---- */
  function nameOf(sc, c) {
    var o = null; sc.opts.forEach(function (x) { if (x.c === c) { o = x; } });
    if (o) { return o.n; }
    var f = FIXED.filter(function (x) { return x.c === c; })[0];
    return f ? f.n : c;
  }
  function renderResults(S, data, dept, failed) {
    var h = warn;
    if (failed) { root.innerHTML = h + '<p class="empty">' + esc(t('poll.err')) + '</p><p><button type="button" class="btn" data-pretry>' + esc(t('err.reload')) + '</button></p>'; return; }
    h += '<h2 class="poll-rt">' + esc(t('poll.results')) + '</h2>';
    S.list.forEach(function (sc) {
      var d = data.scopes[sc.scope] || { total: 0, choices: {} }, rows = Object.keys(d.choices).map(function (k) { return { c: k, n: d.choices[k] }; }).sort(function (a, b) { return b.n - a.n; });
      var mx = rows.length ? rows[0].n : 1, mineC = (mine.answers[sc.scope] || {}).c;
      h += '<section class="poll-r"><div class="poll-h"><h3>' + esc(sc.title) + '</h3>' + (sc.scope === 'pres' ? '<label class="field2">' + esc(t('pk.dept')) + ' <select id="poll-fdept">' + deptOptions(dept, true) + '</select></label>' : '') + '</div>' +
        '<p class="note-s" style="margin-top:4px">' + esc(t(d.total > 1 ? 'poll.total' : 'poll.total1', { n: fmt(d.total) })) + (sc.scope === 'pres' && dept ? ' · ' + esc(dept) : '') + '</p>';
      if (sc.scope === 'pres' && dept && d.total > 0 && d.total < FEW) { h += '<p class="note-s">' + esc(t('poll.few')) + '</p>'; }
      if (!d.total) { h += '<p class="empty">' + esc(t('poll.none')) + '</p>'; }
      else {
        h += '<ul class="rank">' + rows.map(function (r) {
          var pc = Math.round(1000 * r.n / d.total) / 10;
          return '<li><div class="rk hist-r"><span class="rk-l">' + esc(nameOf(sc, r.c)) + (mineC === r.c ? ' <span class="poll-me">✓ ' + esc(t('poll.mine')) + '</span>' : '') + '</span><span class="rk-b"><i style="width:' + Math.round(100 * r.n / mx) + '%"></i></span><span class="rk-n">' + pc.toLocaleString('fr-FR') + ' % <small>' + fmt(r.n) + '</small></span></div></li>';
        }).join('') + '</ul>';
      }
      h += '</section>';
    });
    if (!S.loc) { h += '<p class="note-s">' + esc(t('poll.needCommune')) + '</p>'; }
    h += '<p class="note-s">' + esc(t('poll.how')) + '</p><div class="pk-act"><button type="button" class="btn ' + (answered() ? 'ghost' : 'primary') + '" data-pedit>' + esc(t(answered() ? 'poll.change' : 'poll.vote')) + '</button></div>';
    root.innerHTML = h;
  }
  function showResults(dept, fresh) {
    var S = scopes(); view = 'results';
    root.innerHTML = warn + '<p class="empty">…</p>';
    var ids = S.list.slice(0, MAXS).map(function (s) { return s.scope; });
    post('/results', { scopes: ids, dept: dept || '', t: fresh ? Date.now() : 0 }).then(function (d) { if (view === 'results') { renderResults(S, d, dept || '', false); } }, function () { renderResults(S, null, dept || '', true); });
  }
  function show() {
    if (!base) { root.innerHTML = '<p class="empty">' + esc(t('poll.soon')) + '</p>'; return; }
    if (view === 'form' || (!view && !answered())) { view = 'form'; renderForm(); } else { showResults(''); }
  }

  /* ---- événements ---- */
  root.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, btn = document.getElementById('poll-send'), msg = document.getElementById('poll-msg'), votes = [];
    f.querySelectorAll('fieldset[data-scope]').forEach(function (fs) {
      var ch = fs.querySelector('input[type=radio]:checked'); if (ch) { votes.push({ scope: fs.getAttribute('data-scope'), choice: ch.value }); }
    });
    if (!votes.length) { msg.textContent = t('poll.nosel'); return; }
    var dept = document.getElementById('poll-dept').value;
    btn.disabled = true; msg.textContent = '';
    post('/vote', { device: mine.device, dept: dept, votes: votes, token: token }).then(function () {
      votes.forEach(function (v) { mine.answers[v.scope] = { c: v.choice }; });
      mine.dept = dept; A.store.set('poll', mine); token = '';
      A.toast(t('poll.thanks')); showResults('', true);
    }, function (er) {
      btn.disabled = false;
      msg.textContent = er.status === 429 ? t('poll.limit') : (er.status === 403 ? t('poll.bot') : t('poll.err'));
    });
  });
  root.addEventListener('click', function (e) {
    if (e.target.closest('[data-pedit]')) { view = 'form'; renderForm(); return; }
    if (e.target.closest('[data-pcancel]')) { view = 'results'; showResults(''); return; }
    if (e.target.closest('[data-pres]')) { showResults(''); return; }
    if (e.target.closest('[data-pretry]')) { show(); }
  });
  root.addEventListener('change', function (e) {
    if (e.target.id === 'poll-fdept') { showResults(e.target.value); }
    if (e.target.id === 'poll-sec') { var l = A.loc(); if (l && +e.target.value >= 0) { A.setLoc(l.pi, +e.target.value); } }
  });
  A.onPage(function (p) { if (p === 'poll') { view = ''; show(); } });
  A.on('loc', function () { if (!document.getElementById('p-poll').hidden) { show(); } });
  var hp = document.querySelector('[data-poll-home] .btn');
  if (hp) { hp.addEventListener('click', function () { A.show('poll'); }); }
})();
