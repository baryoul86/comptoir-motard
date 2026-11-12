/* Comptoir Motard – assistante (chat) */
(function () {
  var WA = '212628889066';
  var T = {
    fr: { tip: 'Parle avec moi 💬', sub: 'Assistante du magasin', ph: 'Écrivez votre message…', send: 'Envoyer',
      hello: 'Bonjour ! Je suis l’assistante de Comptoir Motard. Posez-moi vos questions sur nos produits, une pièce pour votre moto, nos horaires… Je vous réponds en français, en italien ou en arabe.',
      order: 'Commander sur WhatsApp', orderMsg: 'Bonjour, je souhaite commander : ', src: 'Sources : ',
      err: 'Désolée, je n’arrive pas à répondre pour le moment. Écrivez-nous directement sur WhatsApp :', wa: 'Ouvrir WhatsApp' },
    it: { tip: 'Parla con me 💬', sub: 'Assistente del negozio', ph: 'Scrivi il tuo messaggio…', send: 'Invia',
      hello: 'Ciao! Sono l’assistente di Comptoir Motard. Chiedimi dei nostri prodotti, di un pezzo per la tua moto, degli orari… Rispondo in italiano, francese o arabo.',
      order: 'Ordina su WhatsApp', orderMsg: 'Buongiorno, vorrei ordinare: ', src: 'Fonti: ',
      err: 'Mi dispiace, in questo momento non riesco a rispondere. Scrivici direttamente su WhatsApp:', wa: 'Apri WhatsApp' },
    ar: { tip: 'تكلّم معي 💬', sub: 'مساعدة المتجر', ph: 'اكتب رسالتك…', send: 'إرسال',
      hello: 'مرحباً! أنا مساعدة متجر Comptoir Motard. اسألني عن منتجاتنا، عن قطعة لدراجتك، أو عن أوقات العمل… أجيبك بالعربية أو الفرنسية أو الإيطالية.',
      order: 'اطلب عبر واتساب', orderMsg: 'مرحباً، أريد طلب: ', src: 'المصادر: ',
      err: 'عذراً، لا أستطيع الإجابة الآن. راسلنا مباشرة على واتساب:', wa: 'فتح واتساب' }
  };
  var lang = 'fr';
  try { var s = localStorage.getItem('cm-lang'); if (T[s]) lang = s; else { var n = (navigator.language || '').slice(0, 2); if (T[n]) lang = n; } } catch (e) {}
  var history = [], busy = false, started = false, talkTimer = null;
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
  [['fr', 'Français'], ['it', 'Italiano'], ['ar', 'العربية']].forEach(function (l) {
    var b = el('button', null, l[1]); b.type = 'button'; b.dataset.l = l[0];
    b.addEventListener('click', function () { setLang(l[0], true); }); langs.appendChild(b);
  });
  who.appendChild(name); who.appendChild(sub); who.appendChild(langs);
  var x = el('button', 'cm-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Fermer');
  head.appendChild(pface); head.appendChild(who); head.appendChild(x);
  var log = el('div', 'cm-log'); log.setAttribute('aria-live', 'polite');
  var form = el('form', 'cm-form'), input = el('input'), send = el('button');
  input.type = 'text'; input.maxLength = 500; input.autocomplete = 'off'; input.setAttribute('dir', 'auto'); send.type = 'submit';
  form.appendChild(input); form.appendChild(send);
  panel.appendChild(head); panel.appendChild(log); panel.appendChild(form);
  document.body.appendChild(launch); document.body.appendChild(panel);

  function setLang(l, greet) {
    lang = l; try { localStorage.setItem('cm-lang', l); } catch (e) {}
    var t = T[l]; tip.textContent = t.tip; sub.textContent = t.sub; input.placeholder = t.ph; send.textContent = t.send;
    tip.dir = sub.dir = l === 'ar' ? 'rtl' : 'ltr';
    langs.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.l === l); });
    if (greet && !busy) say(t.hello, null, []);
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
    function finish() {
      talk(false); fill(body, text);
      if (order) { var o = el('a', 'cm-order', T[lang].order + ' →'); o.href = waLink(T[lang].orderMsg + order); o.target = '_blank'; o.rel = 'noopener'; b.appendChild(o); }
      if (sources && sources.length) {
        var s = el('span', 'cm-src', T[lang].src);
        sources.forEach(function (u, i) { if (i) s.appendChild(document.createTextNode(' · ')); var a = el('a', null, u.title); a.href = u.url; a.target = '_blank'; a.rel = 'noopener nofollow'; s.appendChild(a); });
        b.appendChild(s);
      }
      scroll(); if (done) done();
    }
    if (reduce) return finish();
    var plain = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1'), i = 0, step = Math.max(1, Math.round(plain.length / 160));
    talk(true);
    var t = setInterval(function () {
      i += step; body.textContent = plain.slice(0, i); scroll();
      if (i >= plain.length) { clearInterval(t); finish(); }
    }, 22);
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

  form.addEventListener('submit', function (e) { e.preventDefault(); var q = input.value.trim(); if (!q || busy) return; input.value = ''; ask(q); });
  launch.addEventListener('click', function () {
    document.documentElement.classList.add('cm-open');
    if (!started) { started = true; say(T[lang].hello, null, []); }
  });
  x.addEventListener('click', function () { document.documentElement.classList.remove('cm-open'); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') document.documentElement.classList.remove('cm-open'); });
  setLang(lang, false);
})();
