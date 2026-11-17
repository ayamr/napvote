/* Partage des résultats d'un scrutin du sondage (ex. les députés de Jacmel) : image générée sur l'appareil, avec un QR code vers la page de ce scrutin.
   Rien n'est envoyé à un serveur ; la personne choisit elle-même où partager l'image et le lien. */
(function () {
  'use strict';
  var A = window.VVApp, root = document.getElementById('sres-out');
  if (!A || !root || !A.sresInfo) { return; }
  var W = 1080, PAD = 64, TOPN = 6;  // 6 lignes : l'image reste dans le format 9:16 des statuts (1080 x 1920)
  var C = { navy: '#0B2447', ink: '#14243B', ink3: '#5C6B82', line: '#D3DAE4', bg: '#F4F6F9', white: '#FFFFFF', bar: '#0F3D8A', track: '#E3E9F2' };
  var SANS = '"Source Sans 3", "Helvetica Neue", Arial, sans-serif', SERIF = '"Source Serif 4", Georgia, "Times New Roman", serif';
  var cap = window.Capacitor, dlg = null, blob = null, url = '', info = null;

  function wrap(ctx, text, max) {
    var words = String(text).split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      var test = cur ? cur + ' ' + w : w;
      if (cur && ctx.measureText(test).width > max) { lines.push(cur); cur = w; } else { cur = test; }
    });
    if (cur) { lines.push(cur); }
    return lines;
  }
  function qrCanvas(link, size) {
    var q = window.qrcode(0, 'M'); q.addData(link); q.make();
    var n = q.getModuleCount(), quiet = 3, cell = Math.floor(size / (n + 2 * quiet)), px = cell * (n + 2 * quiet);
    var c = document.createElement('canvas'); c.width = c.height = px;
    var x = c.getContext('2d'); x.fillStyle = C.white; x.fillRect(0, 0, px, px); x.fillStyle = C.navy;
    for (var r = 0; r < n; r++) { for (var k = 0; k < n; k++) { if (q.isDark(r, k)) { x.fillRect((k + quiet) * cell, (r + quiet) * cell, cell, cell); } } }
    return c;
  }
  function when(iso) {
    if (!iso) { return ''; }
    return new Date(iso).toLocaleString([], { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  }

  function draw(ctx, I, dry) {
    var y = 0, inner = W - 2 * PAD, cands = I.rows.filter(function (r) { return !r.fixed; }), shown = cands.slice(0, TOPN), hidden = I.rows.length - shown.length;
    var lst = ['may', 'cas', 'asec'].indexOf(String(I.scope).split('|')[0]) >= 0;  // listes : le parti en majuscules, le titulaire tel quel ; sinon : « Prénom NOM » tel quel, le parti en majuscules
    shown = shown.map(function (r) { return { name: lst ? r.name.toLocaleUpperCase('fr') : r.name, sub: lst ? (r.sub || '') : (r.sub || '').toLocaleUpperCase('fr'), n: r.n, pc: r.pc }; });
    if (!dry) {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, ctx.canvas.height);
      ctx.fillStyle = C.navy; ctx.fillRect(0, 0, W, 190);
      ctx.fillStyle = C.white; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 60px ' + SERIF; ctx.fillText('NapVote', PAD, 94);
      ctx.font = '400 30px ' + SANS; ctx.fillStyle = '#C9D6EA'; ctx.fillText(t('sres.sh.sub'), PAD, 142);
    }
    y = 190 + 74;
    ctx.fillStyle = C.ink; ctx.font = '700 52px ' + SERIF;
    wrap(ctx, I.title, inner).forEach(function (l) { if (!dry) { ctx.fillText(l, PAD, y); } y += 60; });
    ctx.fillStyle = C.ink3; ctx.font = '400 32px ' + SANS;
    if (I.place) { if (!dry) { ctx.fillText(I.place, PAD, y); } y += 42; }
    var meta = [t(I.total > 1 ? 'poll.total' : 'poll.total1', { n: I.total.toLocaleString('fr-FR') }), t('sres.sh.asof', { d: when(I.asof) })].filter(Boolean).join(' · ');
    ctx.font = '400 28px ' + SANS;
    wrap(ctx, meta, inner).forEach(function (l) { if (!dry) { ctx.fillText(l, PAD, y); } y += 36; });
    y += 22;
    shown.forEach(function (r, i) {
      if (!dry) { ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke(); }
      y += 52;
      ctx.font = '700 38px ' + SANS;
      var pcw = 200, ls = wrap(ctx, r.name, inner - pcw);
      ctx.fillStyle = C.ink;
      ls.forEach(function (l, j) { if (!dry) { ctx.fillText(l, PAD, y + j * 46); } });
      if (!dry) { ctx.textAlign = 'right'; ctx.fillStyle = i === 0 ? C.navy : C.ink; ctx.font = '700 42px ' + SANS; ctx.fillText(r.pc, W - PAD, y); ctx.textAlign = 'left'; }
      y += (ls.length - 1) * 46;
      if (r.sub) {
        ctx.fillStyle = C.ink3; ctx.font = '400 28px ' + SANS;
        wrap(ctx, r.sub, inner - pcw).forEach(function (l) { y += 36; if (!dry) { ctx.fillText(l, PAD, y); } });
      }
      y += 22;
      if (!dry) {
        ctx.fillStyle = C.track; ctx.fillRect(PAD, y, inner, 16);
        var mx = shown[0].n || 1; ctx.fillStyle = i === 0 ? C.navy : C.bar; ctx.fillRect(PAD, y, Math.max(4, inner * r.n / mx), 16);
      }
      y += 16 + 22;
    });
    if (hidden > 0) { ctx.fillStyle = C.ink3; ctx.font = '400 28px ' + SANS; if (!dry) { ctx.fillText(t('sres.sh.others', { n: hidden }), PAD, y + 14); } y += 46; }
    if (I.multi) { ctx.fillStyle = C.ink3; ctx.font = '400 26px ' + SANS; wrap(ctx, t('poll.multiNote', { n: I.multi }), inner).forEach(function (l) { if (!dry) { ctx.fillText(l, PAD, y + 14); } y += 34; }); }
    y += 18;
    var qs = 260, top = y;
    if (!dry) {
      ctx.fillStyle = C.white; ctx.fillRect(0, top, W, qs + 2 * 48 + 130);
      ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(W, top); ctx.stroke();
      ctx.drawImage(qrCanvas(I.link, qs), PAD, top + 48, qs, qs);
    }
    var tx = PAD + qs + 44, tw = W - PAD - tx, ty = top + 48 + 52;
    ctx.fillStyle = C.ink; ctx.font = '700 40px ' + SERIF;
    wrap(ctx, t('sres.sh.cta'), tw).forEach(function (l) { if (!dry) { ctx.fillText(l, tx, ty); } ty += 48; });
    ctx.fillStyle = C.ink3; ctx.font = '400 28px ' + SANS;
    wrap(ctx, t('sres.sh.cta2'), tw).forEach(function (l) { if (!dry) { ctx.fillText(l, tx, ty + 8); } ty += 36; });
    ctx.fillStyle = C.navy; ctx.font = '700 40px ' + SANS; if (!dry) { ctx.fillText('napvote-ht.com', tx, ty + 30); }
    y = top + 48 + qs + 40;
    ctx.fillStyle = C.ink3; ctx.font = '400 24px ' + SANS;
    wrap(ctx, t('sres.sh.note'), inner).forEach(function (l) { if (!dry) { ctx.fillText(l, PAD, y + 10); } y += 32; });
    return y + 40;
  }

  /* ---- carte « ma commune » : plusieurs scrutins, avec la photo (ou les initiales) de chaque candidat ----
     I.sections = [{ title, total, rows:[{ name, sub, tag, n, pc, ini, photo, img }] }] ; I.title = la commune ; I.place = la ligne sous le titre. */
  var RH = 96, AV = 76;
  function fit(ctx, text, weight, size, min, max) {
    var s = size; ctx.font = weight + ' ' + s + 'px ' + SANS;
    while (s > min && ctx.measureText(text).width > max) { s -= 2; ctx.font = weight + ' ' + s + 'px ' + SANS; }
    return s;
  }
  function avatar(ctx, r, x, y) {
    var cx = x + AV / 2, cy = y + AV / 2;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, AV / 2, 0, Math.PI * 2); ctx.clip();
    if (r.img) { var s = Math.min(r.img.naturalWidth, r.img.naturalHeight); ctx.drawImage(r.img, (r.img.naturalWidth - s) / 2, 0, s, s, x, y, AV, AV); }
    else {
      ctx.fillStyle = C.track; ctx.fillRect(x, y, AV, AV);
      ctx.fillStyle = C.navy; ctx.font = '700 32px ' + SANS; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(r.ini || '', cx, cy + 2);
    }
    ctx.restore(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  function drawCard(ctx, I, dry) {
    var inner = W - 2 * PAD, y;
    if (!dry) {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, ctx.canvas.height);
      ctx.fillStyle = C.navy; ctx.fillRect(0, 0, W, 190);
      ctx.fillStyle = C.white; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 60px ' + SERIF; ctx.fillText('NapVote', PAD, 94);
      ctx.font = '400 30px ' + SANS; ctx.fillStyle = '#C9D6EA'; ctx.fillText(t('sres.sh.sub'), PAD, 142);
    }
    y = 190 + 76;
    ctx.fillStyle = C.ink; ctx.font = '700 60px ' + SERIF;
    wrap(ctx, I.title, inner).forEach(function (l) { if (!dry) { ctx.fillText(l, PAD, y); } y += 66; });
    ctx.fillStyle = C.ink3; ctx.font = '400 30px ' + SANS;
    wrap(ctx, I.place, inner).forEach(function (l) { if (!dry) { ctx.fillText(l, PAD, y); } y += 40; });
    y += 14;
    I.sections.forEach(function (S) {
      if (!dry) { ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke(); }
      y += 44;
      ctx.fillStyle = C.ink; ctx.font = '700 34px ' + SERIF;
      var tl = wrap(ctx, S.title, inner);
      tl.forEach(function (l, j) { if (!dry) { ctx.fillText(l, PAD, y); } if (j < tl.length - 1) { y += 40; } });
      var cnt = t(S.total > 1 ? 'poll.total' : 'poll.total1', { n: S.total.toLocaleString('fr-FR') }), w1 = ctx.measureText(tl[tl.length - 1]).width;
      ctx.font = '400 26px ' + SANS;
      if (tl.length === 1 && w1 + 24 + ctx.measureText(cnt).width <= inner) { ctx.fillStyle = C.ink3; if (!dry) { ctx.fillText(cnt, W - PAD - ctx.measureText(cnt).width, y); } }
      y += 16;
      var mx = S.rows.length ? S.rows[0].n || 1 : 1;
      S.rows.forEach(function (r) {
        var tx = PAD + AV + 22, pcw = 170, room = W - PAD - pcw - tx;
        if (!dry) {
          avatar(ctx, r, PAD, y + 4);
          ctx.fillStyle = C.ink; fit(ctx, r.name, '700', 36, 24, room); ctx.fillText(r.name, tx, y + 34);
          var sub = (r.sub || '') + (r.tag ? ' · ' + r.tag : '');
          ctx.fillStyle = C.ink3; fit(ctx, sub, '400', 26, 20, room); ctx.fillText(sub, tx, y + 62);
          ctx.textAlign = 'right'; ctx.fillStyle = C.navy; ctx.font = '700 40px ' + SANS; ctx.fillText(r.pc, W - PAD, y + 38); ctx.textAlign = 'left';
          ctx.fillStyle = C.track; ctx.fillRect(tx, y + 72, W - PAD - tx, 12);
          ctx.fillStyle = C.bar; ctx.fillRect(tx, y + 72, Math.max(4, (W - PAD - tx) * r.n / mx), 12);
        }
        y += RH;
      });
      y += 16;
    });
    var qs = 180, top = y;
    if (!dry) {
      ctx.fillStyle = C.white; ctx.fillRect(0, top, W, qs + 2 * 40 + 120);
      ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(W, top); ctx.stroke();
      ctx.drawImage(qrCanvas(I.link, qs), PAD, top + 40, qs, qs);
    }
    var tx2 = PAD + qs + 40, tw = W - PAD - tx2, ty = top + 40 + 44;
    ctx.fillStyle = C.ink; ctx.font = '700 38px ' + SERIF;
    wrap(ctx, t('sres.sh.cta'), tw).forEach(function (l) { if (!dry) { ctx.fillText(l, tx2, ty); } ty += 46; });
    ctx.fillStyle = C.ink3; ctx.font = '400 26px ' + SANS;
    wrap(ctx, t('sres.sh.cta2'), tw).forEach(function (l) { if (!dry) { ctx.fillText(l, tx2, ty + 6); } ty += 34; });
    ctx.fillStyle = C.navy; ctx.font = '700 38px ' + SANS; if (!dry) { ctx.fillText('napvote-ht.com', tx2, ty + 28); }
    y = top + 40 + qs + 34;
    ctx.fillStyle = C.ink3; ctx.font = '400 24px ' + SANS;
    wrap(ctx, t('sres.sh.note'), inner).forEach(function (l) { if (!dry) { ctx.fillText(l, PAD, y + 8); } y += 32; });
    return y + 36;
  }
  function loadImgs(I) {
    var jobs = [];
    I.sections.forEach(function (S) { S.rows.forEach(function (r) {
      if (!r.photo) { return; }
      jobs.push(new Promise(function (res) { var im = new Image(); im.onload = function () { r.img = im; res(); }; im.onerror = function () { res(); }; im.src = r.photo; }));
    }); });
    return Promise.all(jobs);
  }

  function render(I) {
    var f1 = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 40px "Source Sans 3"'), document.fonts.load('400 30px "Source Sans 3"'), document.fonts.load('700 40px "Source Serif 4"')]).catch(function () { /* polices de repli */ }) : Promise.resolve();
    return f1.then(function () {
      var cv = document.createElement('canvas'), ctx = cv.getContext('2d');
      cv.width = W; cv.height = 10;
      var fn = I.sections ? drawCard : draw, h = fn(ctx, I, true);
      cv.width = W; cv.height = Math.ceil(h);
      fn(cv.getContext('2d'), I, false);
      return new Promise(function (res, rej) { cv.toBlob(function (b) { if (b) { res(b); } else { rej(new Error('toBlob')); } }, 'image/png'); });
    });
  }

  function textOf() {
    if (info.text) { return info.text + ' ' + info.link; }
    var top = info.rows.filter(function (r) { return !r.fixed; }).slice(0, 3).map(function (r, i) { return (i + 1) + '. ' + r.name + ' ' + r.pc; }).join(' ; ');
    return t('sres.sh.txt', { s: info.title + (info.place ? ' · ' + info.place : ''), r: top }) + ' ' + info.link;
  }
  function b64(b) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1]); }; r.onerror = rej; r.readAsDataURL(b); }); }
  var NAME = 'resultats-napvote.png';
  function send() {
    var pl = cap && cap.Plugins;
    if (A.native && pl && pl.Filesystem && pl.Share) {
      b64(blob).then(function (d) { return pl.Filesystem.writeFile({ path: NAME, data: d, directory: 'CACHE' }); })
        .then(function (r) { return pl.Share.share({ title: info.title, text: textOf(), files: [r.uri], dialogTitle: t('sres.share') }); })
        .catch(function () { /* annulé */ });
      return;
    }
    var file = null; try { file = new File([blob], NAME, { type: 'image/png' }); } catch (e) { /* ancien navigateur */ }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: info.title, text: textOf() }).catch(function () { /* annulé */ });
    } else if (navigator.share) {
      navigator.share({ title: info.title, text: textOf() }).catch(function () { /* annulé */ });
    } else { save(); }
  }
  function save() {
    var a = document.createElement('a'); a.href = url; a.download = NAME;
    document.body.appendChild(a); a.click(); a.remove();
  }

  function open(scope) { present(A.sresInfo(scope)); }
  /* aussi appelée par le bilan (js/bilan.js) avec ses propres lignes : A.shareCard({ scope, title, place, total, asof, multi, link, rows:[{ name, sub, n, pc }] }) */
  function present(I) {
    info = I;
    if (!info || !(info.total || info.sections)) { return; }
    (info.sections ? loadImgs(info) : Promise.resolve()).then(function () { return render(info); }).then(function (b) {
      blob = b; if (url) { URL.revokeObjectURL(url); } url = URL.createObjectURL(b);
      if (!dlg) {
        dlg = document.createElement('dialog'); dlg.id = 'rshare'; dlg.className = 'sheetd'; dlg.setAttribute('aria-labelledby', 'rshare-t');
        document.body.appendChild(dlg);
        dlg.addEventListener('click', function (e) {
          if (e.target === dlg || e.target.closest('.f-x')) { dlg.close(); return; }
          if (e.target.closest('[data-rsend]')) { send(); }
          if (e.target.closest('[data-rsave]')) { save(); }
          if (e.target.closest('[data-rcopy]')) { A.sresCopy(info.link); }
        });
      }
      var esc = A.esc, canShare = !!(A.native || navigator.share);
      dlg.innerHTML = '<div class="f-in"><button type="button" class="f-x" aria-label="' + esc(t('sres.sh.close')) + '">✕</button>' +
        '<h2 id="rshare-t" class="menu-t">' + esc(t('sres.share')) + '</h2>' +
        '<img class="pshare-img" src="' + url + '" alt="' + esc(info.title + (info.place ? ' · ' + info.place : '')) + '">' +
        '<div class="pk-act">' + (canShare ? '<button type="button" class="btn primary" data-rsend>' + esc(t('sres.sh.send')) + '</button>' : '') +
        '<button type="button" class="btn' + (canShare ? ' ghost' : ' primary') + '" data-rsave>' + esc(t('sres.sh.save')) + '</button>' +
        '<button type="button" class="btn ghost" data-rcopy>' + esc(t('sres.sh.copy')) + '</button></div>' +
        '<p class="note-s">' + esc(t('sres.sh.help')) + '</p></div>';
      if (dlg.showModal) { dlg.showModal(); } else { dlg.setAttribute('open', ''); }
    }, function () { A.toast(t('sres.sh.err')); });
  }

  A.shareCard = present;
  root.addEventListener('click', function (e) { var b = e.target.closest('[data-sres-share]'); if (b) { open(b.getAttribute('data-sres-share')); } });
})();
