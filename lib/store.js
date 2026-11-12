// Comptoir Motard – produits ajoutés depuis le mode administrateur (stockés dans Vercel Blob)
const crypto = require('crypto');

const CATS = { casques: 'Casques', gants: 'Gants', cagoules: 'Cagoules', disques: 'Disques de frein', protections: 'Protections', interphones: 'Interphones', entretien: 'Entretien', autres: 'Autres' };
const MAX_PRODUCTS = 200;
const BLOB_HOST = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i;

let mod = null;
async function blob() { return mod || (mod = await import('@vercel/blob')); }
function configured() { return !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID); }

function text(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }
function sanitize(j) {
  if (!j || typeof j !== 'object' || !/^[a-z0-9]{6,24}$/.test(j.id || '') || !CATS[j.cat]) return null;
  const images = (Array.isArray(j.images) ? j.images : []).filter((u) => typeof u === 'string' && BLOB_HOST.test(u)).slice(0, 4);
  const name = text(j.name, 80);
  if (!name || !images.length) return null;
  return { id: j.id, name, cat: j.cat, price: text(j.price, 30), desc: text(j.desc, 400), images, created: Number(j.created) || 0 };
}

let cache = { t: 0, items: null };
async function listProducts(force) {
  if (!configured()) return [];
  if (!force && cache.items && Date.now() - cache.t < 30000) return cache.items;
  const { list } = await blob();
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix: 'products/', cursor, limit: 1000 });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  const metas = blobs.filter((b) => b.pathname.endsWith('.json'));
  const items = (await Promise.all(metas.map(async (b) => {
    try { const r = await fetch(b.url); return r.ok ? sanitize(await r.json()) : null; } catch (e) { return null; }
  }))).filter(Boolean).sort((a, b) => b.created - a.created);
  cache = { t: Date.now(), items };
  return items;
}

async function addProduct(p, images) {
  const current = await listProducts(true);
  if (current.length >= MAX_PRODUCTS) throw new Error('full');
  const { put } = await blob();
  const id = Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
  const urls = [];
  for (let i = 0; i < images.length; i++) {
    const r = await put('products/' + id + '-' + i + '.jpg', images[i], { access: 'public', contentType: 'image/jpeg', addRandomSuffix: true });
    urls.push(r.url);
  }
  const meta = sanitize({ id, name: p.name, cat: p.cat, price: p.price, desc: p.desc, images: urls, created: Date.now() });
  if (!meta) throw new Error('invalid');
  await put('products/' + id + '.json', JSON.stringify(meta), { access: 'public', contentType: 'application/json', addRandomSuffix: false });
  cache = { t: 0, items: null };
  return meta;
}

async function deleteProduct(id) {
  if (!/^[a-z0-9]{6,24}$/.test(id || '')) throw new Error('invalid');
  const { list, del } = await blob();
  const page = await list({ prefix: 'products/' + id, limit: 50 });
  const urls = page.blobs.filter((b) => b.pathname === 'products/' + id + '.json' || b.pathname.startsWith('products/' + id + '-')).map((b) => b.url);
  if (urls.length) await del(urls);
  cache = { t: 0, items: null };
  return urls.length > 0;
}

module.exports = { CATS, configured, listProducts, addProduct, deleteProduct, text };
