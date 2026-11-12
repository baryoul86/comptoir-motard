/* Comptoir Motard – assistante (chat) */
(function () {
  var WA = '212628889066';
  var T = {
    fr: { tip: 'Parle avec moi 💬', sub: 'Assistante du magasin', ph: 'Écrivez votre message…', send: 'Envoyer',
      hello: 'Bonjour ! Je suis l’assistante de Comptoir Motard. Posez-moi vos questions sur nos produits, une pièce pour votre moto, nos horaires… Je vous réponds en français, en anglais ou en arabe.',
      show: 'Voir les photos sur le site', order: 'Envoyer ma commande sur WhatsApp', orderMsg: 'Bonjour, je souhaite commander : ', src: 'Sources : ',
      err: 'Désolée, je n’arrive pas à répondre pour le moment. Écrivez-nous directement sur WhatsApp :', wa: 'Ouvrir WhatsApp', von: 'Couper la voix', voff: 'Activer la voix', mic: 'Parler au micro', micOn: 'Je vous écoute…', micNo: 'Micro bloqué : autorisez le micro pour ce site dans votre navigateur, puis réessayez.' },
    en: { tip: 'Talk to me 💬', sub: 'Shop assistant', ph: 'Type your message…', send: 'Send',
      hello: 'Hello! I’m the Comptoir Motard assistant. Ask me about our products, a part for your motorcycle, our opening hours… I can answer in English, French or Arabic.',
      show: 'See the photos on the site', order: 'Send my order on WhatsApp', orderMsg: 'Bonjour, je souhaite commander : ', src: 'Sources: ',
      err: 'Sorry, I can’t answer right now. Please message us directly on WhatsApp:', wa: 'Open WhatsApp', von: 'Mute voice', voff: 'Turn voice on', mic: 'Speak', micOn: 'Listening…', micNo: 'Microphone blocked: allow the microphone for this site in your browser, then try again.' },
    ar: { tip: 'تكلّم معي 💬', sub: 'مساعدة المتجر', ph: 'اكتب رسالتك…', send: 'إرسال',
      hello: 'مرحباً! أنا مساعدة متجر Comptoir Motard. اسألني عن منتجاتنا، عن قطعة لدراجتك، أو عن أوقات العمل… أجيبك بالعربية أو الفرنسية أو الإنجليزية.',
      show: 'شاهد الصور في الموقع', order: 'أرسل طلبي عبر واتساب', orderMsg: 'مرحباً، أريد طلب: ', src: 'المصادر: ',
      err: 'عذراً، لا أستطيع الإجابة الآن. راسلنا مباشرة على واتساب:', wa: 'فتح واتساب', von: 'إيقاف الصوت', voff: 'تشغيل الصوت', mic: 'تكلّم بالميكروفون', micOn: 'أسمعك…', micNo: 'الميكروفون محظور: اسمح باستخدام الميكروفون لهذا الموقع في المتصفح ثم حاول مرة أخرى.' }
  };
  var lang = 'fr';
  try { var s = localStorage.getItem('cm-lang'); if (T[s]) lang = s; else { var n = (navigator.language || '').slice(0, 2); if (T[n]) lang = n; } } catch (e) {}
  var PAGES = ['casques', 'gants', 'cagoules', 'disques', 'protections', 'interphones', 'entretien', 'rayons', 'promos', 'plaquettes', 'commande', 'infos'];
  var history = [], busy = false, started = false, talkTimer = null;
  var voiceOn = true; try { if (localStorage.getItem('cm-voice') === '0') voiceOn = false; } catch (e) {}
  var aud = null, audUrl = null, speakId = 0, serverVoice = true, stopCur = null;
  var SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function face() {
    var f = el('span', 'cm-face'); f.dataset.f = '0';
    for (var i = 0; i < 3; i++) { var im = el('img'); im.src = 'img/avatar-' + i + '.webp'; im.alt = ''; f.appendChild(im); }
    return f;
  }

  var launch = el('button', 'cm-launch'); launch.type = 'button';
  var lface = face(), tip = el('span', 'cm-tip');
  launch.appendChild(lface); launch.appendChild(tip);

  var panel = el('div', 'cm-panel'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Chat');
  var head = el('div', 'cm-head'), pface = face(), who = el('div', 'cm-who');
  var name = el('b', null, 'Comptoir Motard'), sub = el('span'), langs = el('div', 'cm-langs');
  [['fr', 'Français'], ['en', 'English'], ['ar', 'العربية']].forEach(function (l) {
    var b = el('button', null, l[1]); b.type = 'button'; b.dataset.l = l[0];
    b.addEventListener('click', function () { setLang(l[0], true); }); langs.appendChild(b);
  });
  who.appendChild(name); who.appendChild(sub); who.appendChild(langs);
  var x = el('button', 'cm-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Fermer');
  var vb = el('button', 'cm-x cm-v'); vb.type = 'button';
  head.appendChild(pface); head.appendChild(who); head.appendChild(vb); head.appendChild(x);
  var log = el('div', 'cm-log'); log.setAttribute('aria-live', 'polite');
  var form = el('form', 'cm-form'), input = el('input'), send = el('button');
  input.type = 'text'; input.maxLength = 500; input.autocomplete = 'off'; input.setAttribute('dir', 'auto'); send.type = 'submit';
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null, listening = false, mic = null;
  form.appendChild(input);
  if (SR) {
    mic = el('button', 'cm-mic'); mic.type = 'button';
    mic.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 0 0-7 0v6A3.5 3.5 0 0 0 12 15Zm6-3.5a1 1 0 1 0-2 0 4 4 0 0 1-8 0 1 1 0 1 0-2 0 6 6 0 0 0 5 5.9V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.6a6 6 0 0 0 5-5.9Z"/></svg>';
    form.appendChild(mic);
  }
  form.appendChild(send);
  panel.appendChild(head); panel.appendChild(log); panel.appendChild(form);
  document.body.appendChild(launch); document.body.appendChild(panel);

  function setLang(l, greet) {
    lang = l; try { localStorage.setItem('cm-lang', l); } catch (e) {}
    var t = T[l]; tip.textContent = t.tip; sub.textContent = t.sub; input.placeholder = t.ph; send.textContent = t.send;
    tip.dir = sub.dir = l === 'ar' ? 'rtl' : 'ltr';
    langs.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.l === l); });
    drawVoice(); if (mic) { mic.setAttribute('aria-label', t.mic); mic.title = t.mic; }
    if (greet && !busy) { unlock(); say(t.hello, null, []); }
  }

  // ---------- voix ----------
  function drawVoice() { vb.textContent = voiceOn ? '🔊' : '🔇'; vb.setAttribute('aria-label', voiceOn ? T[lang].von : T[lang].voff); vb.setAttribute('aria-pressed', String(voiceOn)); vb.title = voiceOn ? T[lang].von : T[lang].voff; }
  function unlock() { // à appeler pendant un geste de l'utilisateur (règles des navigateurs mobiles)
    if (!voiceOn) return;
    try { if (!aud) { aud = new Audio(); aud.preload = 'auto'; } if (aud.paused) { aud.src = SILENCE; var p = aud.play(); if (p && p.catch) p.catch(function () {}); } } catch (e) {}
  }
  function hush() {
    var f = stopCur; stopCur = null; speakId++;
    try { if (aud) { aud.onended = aud.onerror = null; aud.pause(); } } catch (e) {}
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
    if (audUrl) { URL.revokeObjectURL(audUrl); audUrl = null; }
    if (f) f();
  }
  function guess(text) {
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    var en = (text.match(/(^|[^a-z])(the|you|your|is|are|for|with|and|we|can|this|hello|thanks|please|have|what|would)(?![a-z])/gi) || []).length;
    var fr = (text.match(/(^|[^a-zà-ù])(le|les|des|vous|nous|pour|est|sont|avec|bonjour|merci|votre|une|pièce|très)(?![a-zà-ù])/gi) || []).length;
    if (en > fr) return 'en'; if (fr > en) return 'fr'; return lang === 'ar' ? 'fr' : lang;
  }
  function clean(text) {
    return text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1').replace(/https?:\/\/\S+/g, '')
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim();
  }
  // Appelle cb({duration, onend(f)}) quand la voix démarre, ou cb(null) s'il n'y a pas de voix.
  function speak(text, cb) {
    var id = ++speakId, done = false, t = clean(text), endCb = null, ended = false;
    function ret(v) { if (!done) { done = true; cb(v); } }
    function fin() { if (!ended) { ended = true; if (endCb) endCb(); } }
    var handle = { duration: 0, onend: function (f) { endCb = f; if (ended) f(); } };
    if (!voiceOn || !t) return ret(null);
    stopCur = function () { ret(null); fin(); };
    function browserVoice() {
      if (id !== speakId) return;
      try {
        var sy = window.speechSynthesis; if (!sy || !window.SpeechSynthesisUtterance) return ret(null);
        var l = guess(t), u = new SpeechSynthesisUtterance(t);
        var vs = sy.getVoices().filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf(l) === 0; });
        var fem = vs.filter(function (v) { return /female|femme|am[ée]lie|audrey|marie|julie|l[ée]a|samantha|victoria|karen|susan|hazel|laila|salma|zira|google/i.test(v.name); })[0];
        if (fem || vs[0]) u.voice = fem || vs[0];
        u.lang = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-SA' }[l]; u.pitch = 1.1; u.rate = 1;
        u.onstart = function () { if (id === speakId) ret(handle); };
        u.onend = fin; u.onerror = function () { ret(null); fin(); };
        sy.cancel(); sy.speak(u);
        setTimeout(function () { if (!done) { try { sy.cancel(); } catch (e) {} ret(null); fin(); } }, 2500);
      } catch (e) { ret(null); fin(); }
    }
    if (!serverVoice || !aud) return browserVoice();
    var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 9000);
    fetch('api/voice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t }), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) { if (r.status === 502 || r.status === 503 || r.status === 404) serverVoice = false; throw new Error('tts'); } return r.blob(); })
      .then(function (b) {
        clearTimeout(to); if (id !== speakId) return;
        if (audUrl) URL.revokeObjectURL(audUrl); audUrl = URL.createObjectURL(b);
        aud.onended = fin; aud.onerror = fin; aud.src = audUrl;
        function go() { if (id !== speakId) return; handle.duration = isFinite(aud.duration) ? aud.duration : 0; ret(handle); }
        var p = aud.play(); if (p && p.then) p.then(go, browserVoice); else go();
      })
      .catch(function () { clearTimeout(to); browserVoice(); });
  }

  function talk(on) {
    clearInterval(talkTimer); talkTimer = null;
    if (on && !reduce) { var seq = [1, 2, 1, 0, 2, 1, 0, 1], i = 0; talkTimer = setInterval(function () { pface.dataset.f = seq[i++ % seq.length]; }, 130); }
    else pface.dataset.f = '0';
  }
  function scroll() { log.scrollTop = log.scrollHeight; }
  function waLink(text) { return 'https://wa.me/' + WA + (text ? '?text=' + encodeURIComponent(text) : ''); }

  // Texte -> nœuds sûrs : seuls les liens http(s) deviennent cliquables.
  function fill(node, text) {
    node.textContent = '';
    var re = /\[([^\]]{1,120})\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?])/g, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) node.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = el('a', null, m[1] || m[3].replace(/^https?:\/\/(www\.)?/, '').split('/')[0]);
      a.href = m[2] || m[3]; a.target = '_blank'; a.rel = 'noopener nofollow'; node.appendChild(a); last = re.lastIndex;
    }
    if (last < text.length) node.appendChild(document.createTextNode(text.slice(last)));
  }

  function say(text, order, sources, done, show) {
    var b = el('div', 'cm-msg cm-bot'); b.setAttribute('dir', 'auto'); log.appendChild(b);
    var body = el('span'); b.appendChild(body);
    var fdone = false;
    function finish() {
      if (fdone) return; fdone = true;
      talk(false); fill(body, text);
      if (order) { var o = el('a', 'cm-order', T[lang].order + ' →'); o.href = waLink(T[lang].orderMsg + order); o.target = '_blank'; o.rel = 'noopener'; b.appendChild(o); }
      if (show && PAGES.indexOf(show) >= 0) {
        var sb = el('a', 'cm-order cm-show', T[lang].show + ' →'); sb.href = '#' + show;
        sb.addEventListener('click', function () { hush(); document.documentElement.classList.remove('cm-open'); });
        b.appendChild(sb);
      }
      if (sources && sources.length) {
        var s = el('span', 'cm-src', T[lang].src);
        sources.forEach(function (u, i) { if (i) s.appendChild(document.createTextNode(' · ')); var a = el('a', null, u.title); a.href = u.url; a.target = '_blank'; a.rel = 'noopener nofollow'; s.appendChild(a); });
        b.appendChild(s);
      }
      scroll(); if (done) done();
    }
    var plain = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1');
    speak(text, function (v) {
      var typed = false, spoken = !v;
      function both() { if (typed && spoken) finish(); }
      if (v) v.onend(function () { spoken = true; both(); });
      if (reduce) { body.textContent = plain; typed = true; return both(); }
      var total = v && v.duration ? v.duration * 1000 * 0.92 : Math.min(7000, plain.length * 28), tick = 30;
      var step = Math.max(1, Math.ceil(plain.length / Math.max(1, total / tick))), i = 0;
      talk(true);
      var t = setInterval(function () {
        i += step; body.textContent = plain.slice(0, i); scroll();
        if (i >= plain.length) { clearInterval(t); typed = true; both(); }
      }, tick);
    });
  }

  function ask(q) {
    if (busy) return;
    if (adm.on) return adminInput(q);
    if (ADMIN_RE.test(q)) { userMsg(q); return adminStart(); }
    busy = true; send.disabled = true;
    var me = el('div', 'cm-msg cm-me', q); me.setAttribute('dir', 'auto'); log.appendChild(me);
    var wait = el('div', 'cm-msg cm-bot'), dots = el('span', 'cm-dots'); dots.appendChild(el('i')); dots.appendChild(el('i')); dots.appendChild(el('i')); wait.appendChild(dots); log.appendChild(wait); scroll();
    history.push({ role: 'user', content: q });
    var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 75000);
    fetch('api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: lang, messages: history.slice(-10) }), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || (!j.text && !j.admin)) throw new Error(j.error || 'err'); return j; }); })
      .then(function (j) {
        clearTimeout(to); wait.remove();
        if (j.admin) { history.pop(); end(); return adminStart(); } history.push({ role: 'assistant', content: j.text });
        say(j.text, j.order || null, j.sources || [], end, j.show || null);
      })
      .catch(function () {
        clearTimeout(to); wait.remove(); history.pop();
        say(T[lang].err + ' ' + waLink(), null, [], end);
      });
    function end() { busy = false; send.disabled = false; }
  }

  // ---------- mode administrateur (en français, jamais envoyé à l'IA) ----------
  var ADMIN_RE = /(ajouter|rajouter|mettre|publier|supprimer|enlever|retirer|modifier|changer)\s.{0,30}(images?|photos?|produits?|articles?)|\badd\s.{0,20}(images?|photos?|pictures?|products?)|\bmode\s+admin|(إضافة|أضيف|نضيف|نزيد)\s.{0,15}(صور|صورة|منتج|منتوج)/i;
  var adm = { on: false, token: null, stage: null, cats: null };
  function userMsg(q) { var me = el('div', 'cm-msg cm-me', q); me.setAttribute('dir', 'auto'); log.appendChild(me); scroll(); }
  function botBox() { var b = el('div', 'cm-msg cm-bot cm-adm'); log.appendChild(b); return b; }
  function post(data) {
    return fetch('api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j.status = r.status; return j; }); })
      .catch(function () { return { status: 0, error: 'network' }; });
  }
  function adminStart() {
    adm.on = true; adm.token = null; adm.stage = 'password';
    input.type = 'password'; input.autocomplete = 'off'; input.placeholder = 'Mot de passe'; input.value = '';
    say('Mode administrateur. Quel est le mot de passe ?', null, []);
  }
  function adminQuit(msg) {
    adm.on = false; adm.token = null; adm.stage = null; input.type = 'text'; input.placeholder = T[lang].ph; input.value = '';
    say(msg || 'Mode administrateur fermé.', null, []);
  }
  function adminInput(q) {
    if (adm.stage !== 'password') { input.value = ''; return say('Utilisez les boutons ci-dessus, ou touchez « Quitter ».', null, []); }
    userMsg('••••••••'); busy = true; send.disabled = true;
    post({ action: 'login', password: q }).then(function (j) {
      busy = false; send.disabled = false;
      if (j.status === 200 && j.token) {
        adm.token = j.token; adm.cats = j.cats || {}; adm.stage = 'menu'; input.type = 'text'; input.placeholder = T[lang].ph;
        if (!j.storage) return adminQuit('Mot de passe correct, mais le stockage des photos n’est pas encore activé sur Vercel. Activez-le, puis réessayez.');
        say('Mot de passe correct. Que voulez-vous faire ?', null, [], adminMenu);
      } else if (j.status === 401) say('Mot de passe incorrect.' + (j.left != null ? ' Essais restants : ' + j.left + '.' : ''), null, []);
      else if (j.status === 429) adminQuit('Trop d’essais. Réessayez dans 15 minutes.');
      else if (j.error === 'not_configured') adminQuit('Le mot de passe administrateur n’est pas encore configuré sur Vercel.');
      else if (j.error === 'weak_password') adminQuit('Le mot de passe configuré sur Vercel est trop court (10 caractères minimum).');
      else adminQuit('Connexion impossible pour le moment. Réessayez plus tard.');
    });
  }
  function expired(j) { if (j.status === 401) { adm.token = null; adm.stage = 'password'; input.type = 'password'; input.placeholder = 'Mot de passe'; say('Session expirée. Quel est le mot de passe ?', null, []); return true; } return false; }
  function btn(label, cls, fn) { var b = el('button', 'cm-abtn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function adminMenu() {
    if (!adm.on || !adm.token) return;
    var b = botBox();
    b.appendChild(btn('Ajouter un produit', 'red', function () { adminAdd(); }));
    b.appendChild(btn('Supprimer un produit', '', function () { adminDelete(); }));
    b.appendChild(btn('Quitter', '', function () { adminQuit(); }));
    scroll();
  }
  function shrink(file) { // réduit la photo dans le téléphone avant l'envoi (JPEG, 1200 px max)
    return new Promise(function (ok, ko) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var k = Math.min(1, 1200 / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
        var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(im, 0, 0, w, h);
        URL.revokeObjectURL(url);
        var q = 0.84, data = c.toDataURL('image/jpeg', q); while (data.length > 900000 && q > 0.4) { q -= 0.12; data = c.toDataURL('image/jpeg', q); }
        ok(data);
      };
      im.onerror = function () { URL.revokeObjectURL(url); ko(new Error('image')); };
      im.src = url;
    });
  }
  function field(label, node) { var w = el('label', 'cm-field'); w.appendChild(el('span', null, label)); w.appendChild(node); return w; }
  function adminAdd() {
    if (!adm.token) return;
    var b = botBox(), f = el('form', 'cm-aform'); f.noValidate = true;
    b.appendChild(el('b', null, 'Nouveau produit'));
    var file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.multiple = true;
    var prev = el('div', 'cm-prev'), name = el('input'), cat = el('select'), price = el('input'), desc = el('textarea'), msg = el('div', 'cm-amsg');
    name.type = 'text'; name.maxLength = 80; price.type = 'text'; price.maxLength = 30; price.placeholder = 'ex. 850 DH (facultatif)'; desc.maxLength = 400; desc.rows = 3; desc.placeholder = 'facultatif';
    Object.keys(adm.cats).forEach(function (k) { var o = el('option', null, adm.cats[k]); o.value = k; cat.appendChild(o); });
    var photos = [];
    file.addEventListener('change', function () {
      var files = Array.prototype.slice.call(file.files, 0, 4); photos = []; prev.textContent = ''; msg.textContent = files.length ? 'Préparation des photos…' : '';
      Promise.all(files.map(shrink)).then(function (list) {
        photos = list; msg.textContent = file.files.length > 4 ? 'Seules les 4 premières photos sont gardées.' : '';
        list.forEach(function (d) { var im = el('img'); im.src = d; im.alt = ''; prev.appendChild(im); }); scroll();
      }).catch(function () { photos = []; msg.textContent = 'Photo illisible. Choisissez une autre image.'; });
    });
    f.appendChild(field('Photos (1 à 4)', file)); f.appendChild(prev);
    f.appendChild(field('Nom du produit', name)); f.appendChild(field('Catégorie', cat)); f.appendChild(field('Prix', price)); f.appendChild(field('Description', desc));
    var go = btn('Publier', 'red', function () {}); go.type = 'submit';
    var cancel = btn('Annuler', '', function () { b.remove(); adminMenu(); });
    var row = el('div', 'cm-arow'); row.appendChild(go); row.appendChild(cancel); f.appendChild(msg); f.appendChild(row);
    f.addEventListener('submit', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (!photos.length) { msg.textContent = 'Ajoutez au moins une photo.'; return; }
      if (!name.value.trim()) { msg.textContent = 'Écrivez le nom du produit.'; return; }
      go.disabled = cancel.disabled = true; msg.textContent = 'Publication en cours…';
      post({ action: 'add', token: adm.token, name: name.value, cat: cat.value, price: price.value, desc: desc.value, images: photos.map(function (d) { return d.split(',')[1]; }) }).then(function (j) {
        if (j.status === 200 && j.product) {
          b.remove(); if (window.cmProducts) window.cmProducts.reload();
          say('Produit publié : ' + j.product.name + '. Il est visible sur le site.', null, [], adminMenu, j.product.cat);
        } else if (!expired(j)) {
          go.disabled = cancel.disabled = false;
          msg.textContent = j.error === 'full' ? 'Limite de produits atteinte. Supprimez-en un d’abord.' : j.error === 'image' ? 'Photo refusée. Essayez une autre image.' : j.error === 'no_storage' ? 'Le stockage des photos n’est pas activé sur Vercel.' : 'Échec de la publication. Réessayez.';
        } else b.remove();
      });
    });
    b.appendChild(f); scroll();
  }
  function adminDelete() {
    if (!adm.token) return;
    var b = botBox(); b.textContent = 'Chargement…';
    post({ action: 'list', token: adm.token }).then(function (j) {
      if (expired(j)) return b.remove();
      b.textContent = '';
      var list = j.products || [];
      b.appendChild(el('b', null, list.length ? 'Touchez « Supprimer » à côté du produit.' : 'Aucun produit ajouté depuis ce mode.'));
      if (!list.length) b.appendChild(el('div', 'cm-amsg', 'Les produits d’origine du site ne se suppriment pas ici.'));
      list.forEach(function (p) {
        var row = el('div', 'cm-drow'), im = el('img'), nm = el('span', null, p.name), armed = false;
        im.src = p.images[0]; im.alt = '';
        var d = btn('Supprimer', '', function () {
          if (!armed) { armed = true; d.textContent = 'Confirmer ?'; d.classList.add('red'); return; }
          d.disabled = true;
          post({ action: 'delete', token: adm.token, id: p.id }).then(function (r) {
            if (expired(r)) return;
            if (r.status === 200) { row.remove(); if (window.cmProducts) window.cmProducts.reload(); } else { d.disabled = false; d.textContent = 'Échec, réessayer'; }
          });
        });
        row.appendChild(im); row.appendChild(nm); row.appendChild(d); b.appendChild(row);
      });
      b.appendChild(btn('Retour', '', function () { b.remove(); adminMenu(); }));
      scroll();
    });
  }

  // ---------- micro ----------
  function stopMic() { listening = false; if (mic) mic.classList.remove('on'); input.placeholder = T[lang].ph; try { if (rec) rec.abort(); } catch (e) {} rec = null; }
  if (mic) mic.addEventListener('click', function () {
    if (listening) { try { rec.stop(); } catch (e) { stopMic(); } return; }
    if (busy || adm.on) return;
    hush(); unlock();
    var heard = '', r;
    try { r = rec = new SR(); } catch (e) { return; }
    r.lang = { fr: 'fr-FR', en: 'en-US', ar: 'ar-MA' }[lang]; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    r.onstart = function () { listening = true; mic.classList.add('on'); input.value = ''; input.placeholder = T[lang].micOn; };
    r.onresult = function (e) { var t = ''; for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; heard = t.trim(); input.value = heard; };
    r.onerror = function (e) { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { stopMic(); if (!busy) say(T[lang].micNo, null, []); } };
    r.onend = function () { var q = heard; stopMic(); if (q && !busy) { input.value = ''; ask(q.slice(0, 500)); } };
    try { r.start(); } catch (e) { stopMic(); }
  });

  form.addEventListener('submit', function (e) { e.preventDefault(); var q = input.value.trim(); if (!q || busy) return; input.value = ''; unlock(); ask(q); });
  launch.addEventListener('click', function () {
    document.documentElement.classList.add('cm-open');
    if (!started) { started = true; unlock(); say(T[lang].hello, null, []); }
  });
  x.addEventListener('click', function () { hush(); if (listening) stopMic(); document.documentElement.classList.remove('cm-open'); });
  vb.addEventListener('click', function () {
    voiceOn = !voiceOn; try { localStorage.setItem('cm-voice', voiceOn ? '1' : '0'); } catch (e) {}
    if (voiceOn) unlock(); else hush(); drawVoice();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') document.documentElement.classList.remove('cm-open'); });
  setLang(lang, false);
})();
