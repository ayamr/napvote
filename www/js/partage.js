/* Partage du bulletin du sondage : image générée sur l'appareil (commune, choix du président au maire, QR code vers le site).
   Rien n'est envoyé à un serveur ; l'électeur choisit lui-même où partager l'image. */
(function () {
  'use strict';
  var A = window.VVApp, root = document.getElementById('poll-out');
  if (!A || !root || !A.pollSummary) { return; }
  var SITE = 'https://napvote-ht.com/', LINK = SITE + '#poll', W = 1080, PAD = 64;
  var C = { navy: '#0B2447', ink: '#14243B', ink3: '#5C6B82', line: '#D3DAE4', bg: '#F4F6F9', white: '#FFFFFF' };
  var SANS = '"Source Sans 3", "Helvetica Neue", Arial, sans-serif', SERIF = '"Source Serif 4", Georgia, "Times New Roman", serif';
  var cap = window.Capacitor, dlg = null, blob = null, url = '', sum = null;

  function wrap(ctx, text, max) {
    var words = String(text).split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      var test = cur ? cur + ' ' + w : w;
      if (cur && ctx.measureText(test).width > max) { lines.push(cur); cur = w; } else { cur = test; }
    });
    if (cur) { lines.push(cur); }
    return lines;
  }

  function qrCanvas(size) {
    var q = window.qrcode(0, 'M'); q.addData(LINK); q.make();
    var n = q.getModuleCount(), quiet = 3, cell = Math.floor(size / (n + 2 * quiet)), px = cell * (n + 2 * quiet);
    var c = document.createElement('canvas'); c.width = c.height = px;
    var x = c.getContext('2d'); x.fillStyle = C.white; x.fillRect(0, 0, px, px); x.fillStyle = C.navy;
    for (var r = 0; r < n; r++) { for (var k = 0; k < n; k++) { if (q.isDark(r, k)) { x.fillRect((k + quiet) * cell, (r + quiet) * cell, cell, cell); } } }
    return c;
  }

  function draw(ctx, S, dry) {
    var y = 0, inner = W - 2 * PAD;
    if (!dry) { ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, ctx.canvas.height); }
    // bandeau
    if (!dry) {
      ctx.fillStyle = C.navy; ctx.fillRect(0, 0, W, 190);
      ctx.fillStyle = C.white; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 60px ' + SERIF; ctx.fillText('NapVote', PAD, 94);
      ctx.font = '400 30px ' + SANS; ctx.fillStyle = '#C9D6EA'; ctx.fillText(t('poll.share.sub'), PAD, 142);
    }
    y = 190 + 70;
    // lieu
    ctx.fillStyle = C.ink; ctx.font = '700 54px ' + SERIF;
    var place = S.commune || S.dept || t('poll.share.title');
    wrap(ctx, place, inner).forEach(function (l) { if (!dry) { ctx.fillText(l, PAD, y); } y += 62; });
    if (S.commune && S.dept) { ctx.fillStyle = C.ink3; ctx.font = '400 32px ' + SANS; if (!dry) { ctx.fillText(S.dept, PAD, y); } y += 40; }
    if (!S.commune && !S.dept) { y += 0; }
    y += 24;
    // choix
    S.items.forEach(function (it, i) {
      if (!dry) { ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke(); }
      y += 44;
      ctx.fillStyle = C.ink3; ctx.font = '700 26px ' + SANS;
      var label = String(it.title).toUpperCase();
      wrap(ctx, label, inner).forEach(function (l) { if (!dry) { ctx.fillText(l, PAD, y); } y += 34; });
      y += 8;
      ctx.fillStyle = C.ink; ctx.font = '700 42px ' + SANS;
      it.names.forEach(function (nm) {
        var ls = wrap(ctx, nm, inner - 40);
        ls.forEach(function (l, j) {
          if (!dry) {
            if (j === 0) { ctx.fillStyle = C.navy; ctx.fillRect(PAD, y - 26, 16, 16); ctx.fillStyle = C.ink; }
            ctx.fillText(l, PAD + 40, y);
          }
          y += 52;
        });
      });
      y += 18;
    });
    // pied : QR + appel
    var qs = 260, top = y + 10;
    if (!dry) {
      ctx.fillStyle = C.white; ctx.fillRect(0, top, W, qs + 2 * 48 + 70);
      ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(W, top); ctx.stroke();
      ctx.drawImage(qrCanvas(qs), PAD, top + 48, qs, qs);
    }
    var tx = PAD + qs + 44, tw = W - PAD - tx, ty = top + 48 + 52;
    ctx.fillStyle = C.ink; ctx.font = '700 40px ' + SERIF;
    wrap(ctx, t('poll.share.cta'), tw).forEach(function (l) { if (!dry) { ctx.fillText(l, tx, ty); } ty += 48; });
    ctx.fillStyle = C.ink3; ctx.font = '400 28px ' + SANS;
    wrap(ctx, t('poll.share.cta2'), tw).forEach(function (l) { if (!dry) { ctx.fillText(l, tx, ty + 8); } ty += 36; });
    ctx.fillStyle = C.navy; ctx.font = '700 40px ' + SANS; if (!dry) { ctx.fillText('napvote-ht.com', tx, ty + 30); }
    y = top + 48 + qs + 36;
    ctx.fillStyle = C.ink3; ctx.font = '400 24px ' + SANS;
    wrap(ctx, t('poll.share.note'), inner).forEach(function (l) { if (!dry) { ctx.fillText(l, PAD, y + 10); } y += 32; });
    return y + 36;
  }

  function render(S) {
    var f1 = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 40px "Source Sans 3"'), document.fonts.load('400 30px "Source Sans 3"'), document.fonts.load('700 40px "Source Serif 4"')]).catch(function () { /* polices système */ }) : Promise.resolve();
    return f1.then(function () {
      var cv = document.createElement('canvas'), ctx = cv.getContext('2d');
      cv.width = W; cv.height = 10;
      var h = draw(ctx, S, true);
      cv.width = W; cv.height = Math.ceil(h);
      draw(cv.getContext('2d'), S, false);
      return new Promise(function (res, rej) { cv.toBlob(function (b) { if (b) { res(b); } else { rej(new Error('toBlob')); } }, 'image/png'); });
    });
  }

  function textOf() { return t('poll.share.txt', { c: sum.commune || sum.dept || 'Haïti' }) + ' ' + LINK; }
  function b64(b) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1]); }; r.onerror = rej; r.readAsDataURL(b); }); }

  function send() {
    var name = 'mon-bulletin-napvote.png', pl = cap && cap.Plugins;
    if (A.native && pl && pl.Filesystem && pl.Share) {
      b64(blob).then(function (d) { return pl.Filesystem.writeFile({ path: name, data: d, directory: 'CACHE' }); })
        .then(function (r) { return pl.Share.share({ title: t('poll.share.title'), text: textOf(), files: [r.uri], dialogTitle: t('poll.share.title') }); })
        .catch(function () { /* annulé */ });
      return;
    }
    var file = null; try { file = new File([blob], name, { type: 'image/png' }); } catch (e) { /* ancien navigateur */ }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: t('poll.share.title'), text: textOf() }).catch(function () { /* annulé */ });
    } else { save(); }
  }
  function save() {
    var a = document.createElement('a'); a.href = url; a.download = 'mon-bulletin-napvote.png';
    document.body.appendChild(a); a.click(); a.remove();
  }

  function open() {
    sum = A.pollSummary();
    if (!sum.items.length) { return; }
    render(sum).then(function (b) {
      blob = b; if (url) { URL.revokeObjectURL(url); } url = URL.createObjectURL(b);
      if (!dlg) {
        dlg = document.createElement('dialog'); dlg.id = 'pshare'; dlg.className = 'sheetd'; dlg.setAttribute('aria-labelledby', 'pshare-t');
        document.body.appendChild(dlg);
        dlg.addEventListener('click', function (e) {
          if (e.target === dlg || e.target.closest('.f-x') || e.target.closest('[data-pclose]')) { dlg.close(); return; }
          if (e.target.closest('[data-psend]')) { send(); }
          if (e.target.closest('[data-psave]')) { save(); }
        });
      }
      var esc = A.esc, canShare = !!(A.native || navigator.share);
      dlg.innerHTML = '<div class="f-in"><button type="button" class="f-x" aria-label="' + esc(t('poll.share.close')) + '">✕</button>' +
        '<h2 id="pshare-t" class="menu-t">' + esc(t('poll.share')) + '</h2>' +
        '<img class="pshare-img" src="' + url + '" alt="' + esc(t('poll.share.title') + ' · ' + (sum.commune || sum.dept)) + '">' +
        '<div class="pk-act">' + (canShare ? '<button type="button" class="btn primary" data-psend>' + esc(t('poll.share.send')) + '</button>' : '') +
        '<button type="button" class="btn' + (canShare ? ' ghost' : ' primary') + '" data-psave>' + esc(t('poll.share.save')) + '</button></div>' +
        '<p class="note-s">' + esc(t('poll.share.help')) + '</p></div>';
      if (dlg.showModal) { dlg.showModal(); } else { dlg.setAttribute('open', ''); }
    }, function () { A.toast(t('poll.share.err')); });
  }

  root.addEventListener('click', function (e) { if (e.target.closest('[data-pshare]')) { open(); } });
})();
