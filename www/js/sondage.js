/* Sondage ouvert : « pour qui comptez-vous voter ? ». Anonyme, non scientifique, un choix modifiable par appareil. */
(function () {
  'use strict';
  var V = window.VV, A = window.VVApp, root = document.getElementById('poll-out');
  if (!V || !A || !root) { return; }
  var esc = A.esc, fmt = A.fmt;
  var CFG = window.NAPVOTE || {}, base = CFG.pollUrl || '';
  var dev = /^(localhost|127\.0\.0\.1)$/.test(location.hostname), q = /[?&]poll=([^&]+)/.exec(location.search);
  if (dev && q) { base = decodeURIComponent(q[1]); }
  base = base.replace(/\/$/, '');
  if (!base) { document.querySelectorAll('[data-go="poll"], [data-poll-home]').forEach(function (el) { (el.closest('li') || el).hidden = true; }); }

  var FEW = 30;
  var opts = A.pres.map(function (c) { return { k: A.norm(c.nom + ' ' + c.pre), n: c.pre + ' ' + c.nom, p: V.parties[c.pa] }; });
  var byKey = {}; opts.forEach(function (o) { byKey[o.k] = o; });
  var FIXED = [{ k: 'indecis', n: t('poll.undecided') }, { k: 'abstention', n: t('poll.abstain') }];
  FIXED.forEach(function (o) { byKey[o.k] = o; });

  var mine = A.store.get('poll', null), editing = false, seeResults = false, token = '';
  if (!mine || !mine.device) {
    var id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
    mine = { device: id.replace(/[^A-Za-z0-9-]/g, '').slice(0, 64), choice: '', dept: '' };
    if (mine.device.length < 16) { mine.device += '0000000000000000'; }
    A.store.set('poll', mine);
  }
  function order() { // ordre aléatoire, stable pendant la visite : aucun candidat n'est systématiquement premier
    var st; try { st = JSON.parse(sessionStorage.getItem('vv.pollorder')); } catch (e) { st = null; }
    var keys = opts.map(function (o) { return o.k; });
    if (!st || st.length !== keys.length || keys.some(function (k) { return st.indexOf(k) < 0; })) {
      st = keys.slice();
      for (var i = st.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = st[i]; st[i] = st[j]; st[j] = x; }
      try { sessionStorage.setItem('vv.pollorder', JSON.stringify(st)); } catch (e) { /* ignore */ }
    }
    return st.map(function (k) { return byKey[k]; });
  }
  function myDept() {
    if (mine.dept) { return mine.dept; }
    var l = A.loc(); return l ? V.deptNames[V.places[l.pi].d] : '';
  }
  function deptOptions(sel, all) {
    return (all ? '<option value="">' + esc(t('poll.all')) + '</option>' : '<option value="">' + esc(t('pk.choose')) + '</option>') +
      V.deptNames.map(function (n) { return '<option value="' + esc(n) + '"' + (n === sel ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('');
  }
  var warn = '<div class="notice"><b>' + esc(t('poll.warn.t')) + '</b> ' + esc(t('poll.warn')) + '</div>';

  function renderVote(err) {
    var o = order(), cur = mine.choice;
    var h = warn + '<form id="poll-form"><fieldset class="poll-f"><legend>' + esc(t('poll.q')) + '</legend><ul class="rows poll-l">' +
      o.concat(FIXED).map(function (x) {
        return '<li><label class="poll-o"><input type="radio" name="choice" value="' + esc(x.k) + '"' + (x.k === cur ? ' checked' : '') + '><span class="poll-t"><b>' + esc(x.n) + '</b>' + (x.p ? '<span>' + esc(x.p) + '</span>' : '') + '</span></label></li>';
      }).join('') + '</ul></fieldset>' +
      '<label class="pk-f poll-d"><span>' + esc(t('poll.dept')) + '</span><select id="poll-dept">' + deptOptions(myDept()) + '</select></label>' +
      (CFG.turnstileKey ? '<div id="poll-ts" class="poll-ts"></div>' : '') +
      '<p class="pk-msg" id="poll-msg" role="status">' + (err ? esc(err) : '') + '</p>' +
      '<div class="pk-act"><button type="submit" class="btn primary" id="poll-send" disabled>' + esc(t('poll.send')) + '</button>' + (mine.choice ? '<button type="button" class="btn ghost" data-pcancel>' + esc(t('poll.cancel')) + '</button>' : '<button type="button" class="btn ghost" data-pres>' + esc(t('poll.seeResults')) + '</button>') + '</div>' +
      '<p class="note-s">' + esc(t('poll.how')) + '</p></form>';
    root.innerHTML = h;
    var f = document.getElementById('poll-form'), btn = document.getElementById('poll-send');
    f.addEventListener('change', function () { btn.disabled = !f.querySelector('input[name=choice]:checked'); });
    btn.disabled = !f.querySelector('input[name=choice]:checked');
    if (CFG.turnstileKey) { mountTurnstile(); }
  }
  function mountTurnstile() {
    function draw() { if (window.turnstile && document.getElementById('poll-ts')) { window.turnstile.render('#poll-ts', { sitekey: CFG.turnstileKey, callback: function (tk) { token = tk; } }); } }
    if (window.turnstile) { draw(); return; }
    var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = draw; document.head.appendChild(s);
  }
  function send(choice, dept) {
    return fetch(base + '/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device: mine.device, choice: choice, dept: dept, token: token }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.error || 'erreur'); e.status = r.status; throw e; } return j; }); });
  }

  function renderResults(dept, data, failed) {
    var h = warn;
    if (failed) { root.innerHTML = h + '<p class="empty">' + esc(t('poll.err')) + '</p><p><button type="button" class="btn" data-pretry>' + esc(t('err.reload')) + '</button></p>'; return; }
    var rows = Object.keys(data.choices).map(function (k) { return { k: k, n: data.choices[k] }; }).sort(function (a, b) { return b.n - a.n; });
    var mx = rows.length ? rows[0].n : 1;
    h += '<div class="poll-h"><h2>' + esc(t('poll.results')) + '</h2><label class="field2">' + esc(t('pk.dept')) + ' <select id="poll-fdept">' + deptOptions(dept, true) + '</select></label></div>' +
      '<p class="lead">' + esc(t(data.total > 1 ? 'poll.total' : 'poll.total1', { n: fmt(data.total) })) + (dept ? ' · ' + esc(dept) : '') + '</p>';
    if (dept && data.total < FEW && data.total > 0) { h += '<p class="note-s">' + esc(t('poll.few')) + '</p>'; }
    if (!data.total) { h += '<p class="empty">' + esc(t('poll.none')) + '</p>'; }
    else {
      h += '<ul class="rank">' + rows.map(function (r) {
        var o = byKey[r.k], name = o ? o.n : r.k, pc = Math.round(1000 * r.n / data.total) / 10;
        var me = mine.choice === r.k && (!dept || dept === mine.dept);
        return '<li><div class="rk hist-r"><span class="rk-l">' + esc(name) + (me ? ' <span class="poll-me">✓ ' + esc(t('poll.mine')) + '</span>' : '') + '</span><span class="rk-b"><i style="width:' + Math.round(100 * r.n / mx) + '%"></i></span><span class="rk-n">' + pc.toLocaleString('fr-FR') + ' % <small>' + fmt(r.n) + '</small></span></div></li>';
      }).join('') + '</ul>';
    }
    h += '<p class="note-s">' + esc(t('poll.how')) + '</p><div class="pk-act">' + (mine.choice ? '<button type="button" class="btn ghost" data-pedit>' + esc(t('poll.change')) + '</button>' : '<button type="button" class="btn primary" data-pedit>' + esc(t('poll.vote')) + '</button>') + '</div>';
    root.innerHTML = h;
  }
  function showResults(dept, fresh) {
    root.innerHTML = warn + '<p class="empty">…</p>';
    var qs = [dept ? 'dept=' + encodeURIComponent(dept) : '', fresh ? '_=' + Date.now() : ''].filter(Boolean).join('&');
    fetch(base + '/results' + (qs ? '?' + qs : '')).then(function (r) { if (!r.ok) { throw new Error('http'); } return r.json(); })
      .then(function (d) { renderResults(dept || '', d, false); }, function () { renderResults(dept || '', null, true); });
  }
  function view() {
    if (!base) { root.innerHTML = '<p class="empty">' + esc(t('poll.soon')) + '</p>'; return; }
    if (mine.choice && !editing || seeResults) { showResults(''); } else { renderVote(); }
  }

  root.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, ch = f.querySelector('input[name=choice]:checked'), btn = document.getElementById('poll-send'), msg = document.getElementById('poll-msg');
    if (!ch) { return; }
    var dept = document.getElementById('poll-dept').value;
    btn.disabled = true; msg.textContent = '';
    send(ch.value, dept).then(function () {
      mine.choice = ch.value; mine.dept = dept; A.store.set('poll', mine); editing = false; seeResults = false; token = '';
      A.toast(t('poll.thanks')); showResults('', true);
    }, function (er) {
      btn.disabled = false;
      msg.textContent = er.status === 429 ? t('poll.limit') : (er.status === 403 ? t('poll.bot') : t('poll.err'));
    });
  });
  root.addEventListener('click', function (e) {
    if (e.target.closest('[data-pedit]')) { editing = true; seeResults = false; renderVote(); return; }
    if (e.target.closest('[data-pcancel]')) { editing = false; view(); return; }
    if (e.target.closest('[data-pres]')) { seeResults = true; showResults(''); return; }
    if (e.target.closest('[data-pretry]')) { view(); }
  });
  root.addEventListener('change', function (e) { if (e.target.id === 'poll-fdept') { showResults(e.target.value); } });
  A.onPage(function (p) { if (p === 'poll') { editing = false; seeResults = false; view(); } });
  // accueil : bouton vers le sondage
  var hp = document.querySelector('[data-poll-home] .btn');
  if (hp) { hp.addEventListener('click', function () { A.show('poll'); }); }
})();
