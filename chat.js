/* Comptoir Motard – assistante (chat) */
(function () {
  var WA = '212628889066';
  var T = {
    fr: { tip: 'Parle avec moi 💬', sub: 'Assistante du magasin', ph: 'Écrivez votre message…', send: 'Envoyer',
      hello: 'Bonjour ! Je suis l’assistante de Comptoir Motard. Posez-moi vos questions sur nos produits, une pièce pour votre moto, nos horaires… Je vous réponds en français, en anglais ou en arabe.',
      order: 'Envoyer ma commande sur WhatsApp', orderMsg: 'Bonjour, je souhaite commander : ', src: 'Sources : ',
      err: 'Désolée, je n’arrive pas à répondre pour le moment. Écrivez-nous directement sur WhatsApp :', wa: 'Ouvrir WhatsApp', von: 'Couper la voix', voff: 'Activer la voix', mic: 'Parler au micro', micOn: 'Je vous écoute…', micNo: 'Micro bloqué : autorisez le micro pour ce site dans votre navigateur, puis réessayez.' },
    en: { tip: 'Talk to me 💬', sub: 'Shop assistant', ph: 'Type your message…', send: 'Send',
      hello: 'Hello! I’m the Comptoir Motard assistant. Ask me about our products, a part for your motorcycle, our opening hours… I can answer in English, French or Arabic.',
      order: 'Send my order on WhatsApp', orderMsg: 'Bonjour, je souhaite commander : ', src: 'Sources: ',
      err: 'Sorry, I can’t answer right now. Please message us directly on WhatsApp:', wa: 'Open WhatsApp', von: 'Mute voice', voff: 'Turn voice on', mic: 'Speak', micOn: 'Listening…', micNo: 'Microphone blocked: allow the microphone for this site in your browser, then try again.' },
    ar: { tip: 'تكلّم معي 💬', sub: 'مساعدة المتجر', ph: 'اكتب رسالتك…', send: 'إرسال',
      hello: 'مرحباً! أنا مساعدة متجر Comptoir Motard. اسألني عن منتجاتنا، عن قطعة لدراجتك، أو عن أوقات العمل… أجيبك بالعربية أو الفرنسية أو الإنجليزية.',
      order: 'أرسل طلبي عبر واتساب', orderMsg: 'مرحباً، أريد طلب: ', src: 'المصادر: ',
      err: 'عذراً، لا أستطيع الإجابة الآن. راسلنا مباشرة على واتساب:', wa: 'فتح واتساب', von: 'إيقاف الصوت', voff: 'تشغيل الصوت', mic: 'تكلّم بالميكروفون', micOn: 'أسمعك…', micNo: 'الميكروفون محظور: اسمح باستخدام الميكروفون لهذا الموقع في المتصفح ثم حاول مرة أخرى.' }
  };
  var lang = 'fr';
  try { var s = localStorage.getItem('cm-lang'); if (T[s]) lang = s; else { var n = (navigator.language || '').slice(0, 2); if (T[n]) lang = n; } } catch (e) {}
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

  function say(text, order, sources, done) {
    var b = el('div', 'cm-msg cm-bot'); b.setAttribute('dir', 'auto'); log.appendChild(b);
    var body = el('span'); b.appendChild(body);
    var fdone = false;
    function finish() {
      if (fdone) return; fdone = true;
      talk(false); fill(body, text);
      if (order) { var o = el('a', 'cm-order', T[lang].order + ' →'); o.href = waLink(T[lang].orderMsg + order); o.target = '_blank'; o.rel = 'noopener'; b.appendChild(o); }
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
    if (busy) return; busy = true; send.disabled = true;
    var me = el('div', 'cm-msg cm-me', q); me.setAttribute('dir', 'auto'); log.appendChild(me);
    var wait = el('div', 'cm-msg cm-bot'), dots = el('span', 'cm-dots'); dots.appendChild(el('i')); dots.appendChild(el('i')); dots.appendChild(el('i')); wait.appendChild(dots); log.appendChild(wait); scroll();
    history.push({ role: 'user', content: q });
    var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 75000);
    fetch('api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: lang, messages: history.slice(-10) }), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.text) throw new Error(j.error || 'err'); return j; }); })
      .then(function (j) {
        clearTimeout(to); wait.remove(); history.push({ role: 'assistant', content: j.text });
        say(j.text, j.order || null, j.sources || [], end);
      })
      .catch(function () {
        clearTimeout(to); wait.remove(); history.pop();
        say(T[lang].err + ' ' + waLink(), null, [], end);
      });
    function end() { busy = false; send.disabled = false; }
  }

  // ---------- micro ----------
  function stopMic() { listening = false; if (mic) mic.classList.remove('on'); input.placeholder = T[lang].ph; try { if (rec) rec.abort(); } catch (e) {} rec = null; }
  if (mic) mic.addEventListener('click', function () {
    if (listening) { try { rec.stop(); } catch (e) { stopMic(); } return; }
    if (busy) return;
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
