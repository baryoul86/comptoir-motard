/* Comptoir Motard – affiche les produits ajoutés depuis le mode administrateur */
(function () {
  var WA = '212628889066';
  var OK = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function card(p) {
    var c = el('div', 'card prod'); c.dataset.cat = p.cat; c.dataset.dyn = p.id;
    var shots = el('div', 'shots');
    p.images.forEach(function (u) { if (!OK.test(u)) return; var im = el('img'); im.src = u; im.alt = p.name; im.loading = 'lazy'; im.decoding = 'async'; shots.appendChild(im); });
    if (!shots.children.length) return null;
    c.appendChild(shots);
    if (shots.children.length > 1) c.appendChild(el('small', 'hint', '← faites glisser →'));
    c.appendChild(el('h3', null, p.name));
    if (p.price) c.appendChild(el('div', 'price', p.price));
    if (p.desc) c.appendChild(el('p', null, p.desc));
    var a = el('a', 'btn', 'Demander le prix');
    a.href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent('Bonjour, je souhaite le prix de : ' + p.name);
    c.appendChild(a);
    return c;
  }
  function render(list) {
    var box = document.querySelector('#rayons .rayons'); if (!box) return;
    box.querySelectorAll('.prod[data-dyn]').forEach(function (n) { n.remove(); });
    var frag = document.createDocumentFragment(), autres = false;
    (list || []).forEach(function (p) { if (!p || !p.name || !p.cat || !Array.isArray(p.images)) return; var c = card(p); if (c) { frag.appendChild(c); if (p.cat === 'autres') autres = true; } });
    box.insertBefore(frag, box.firstChild);
    document.querySelectorAll('.chip[data-cat="autres"],.tile[href="#autres"]').forEach(function (n) { n.hidden = !autres; });
    if (window.cmRefresh) window.cmRefresh();
  }
  function load(fresh) {
    return fetch('api/products' + (fresh ? '?t=' + Date.now() : ''))
      .then(function (r) { return r.ok ? r.json() : { products: [] }; })
      .then(function (j) { render(j.products); })
      .catch(function () {});
  }
  window.cmProducts = { reload: function () { return load(true); }, render: render };
  load(false);
})();
