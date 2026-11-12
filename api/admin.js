// Comptoir Motard – mode administrateur (ajouter / supprimer des produits depuis le chat)
// À définir dans Vercel > Settings > Environment Variables : ADMIN_PASSWORD (au moins 10 caractères)
// Le stockage des photos demande un « Blob store » public relié au projet (variable BLOB_READ_WRITE_TOKEN).
const crypto = require('crypto');
const { CATS, configured, listProducts, addProduct, deleteProduct, text } = require('../lib/store');

const SESSION_MS = 2 * 60 * 60 * 1000;
const fails = new Map();
let globalFails = [];

function sha(s) { return crypto.createHash('sha256').update(String(s)).digest(); }
function key() { return sha('cm-admin-session:' + process.env.ADMIN_PASSWORD); }
function sign(exp) { return crypto.createHmac('sha256', key()).update(String(exp)).digest('hex'); }
function makeToken() { const exp = Date.now() + SESSION_MS; return exp + '.' + sign(exp); }
function validToken(t) {
  const m = /^(\d{13})\.([a-f0-9]{64})$/.exec(String(t || ''));
  if (!m || Number(m[1]) < Date.now()) return false;
  return crypto.timingSafeEqual(Buffer.from(m[2], 'hex'), Buffer.from(sign(m[1]), 'hex'));
}
function locked(ip) {
  const now = Date.now();
  globalFails = globalFails.filter((t) => now - t < 60 * 60 * 1000);
  const f = (fails.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  fails.set(ip, f);
  return f.length >= 5 || globalFails.length >= 40;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  // Uniquement depuis le site lui-même (l'en-tête Origin est obligatoire ici).
  let host = '';
  try { host = new URL(req.headers.origin || '').host; } catch (e) {}
  if (!host || host !== req.headers.host) return res.status(403).json({ error: 'origin' });

  const pass = process.env.ADMIN_PASSWORD || '';
  if (!pass) return res.status(503).json({ error: 'not_configured' });
  if (pass.length < 10) return res.status(503).json({ error: 'weak_password' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ error: 'bad_request' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';

  try {
    if (body.action === 'login') {
      if (locked(ip)) return res.status(429).json({ error: 'locked' });
      const ok = typeof body.password === 'string' && body.password.length <= 200 && crypto.timingSafeEqual(sha(body.password), sha(pass));
      if (!ok) {
        fails.get(ip).push(Date.now()); globalFails.push(Date.now());
        await wait(900);
        return res.status(401).json({ error: 'wrong', left: Math.max(0, 5 - fails.get(ip).length) });
      }
      fails.delete(ip);
      return res.status(200).json({ token: makeToken(), storage: configured(), cats: CATS });
    }

    if (!validToken(body.token)) return res.status(401).json({ error: 'session' });
    if (!configured()) return res.status(503).json({ error: 'no_storage' });

    if (body.action === 'list') return res.status(200).json({ products: await listProducts(true) });

    if (body.action === 'delete') {
      const done = await deleteProduct(String(body.id || ''));
      return res.status(200).json({ ok: done });
    }

    if (body.action === 'add') {
      const name = text(body.name, 80), cat = String(body.cat || '');
      if (!name || !CATS[cat]) return res.status(400).json({ error: 'fields' });
      const raw = Array.isArray(body.images) ? body.images.slice(0, 4) : [];
      const images = [];
      for (const b64 of raw) {
        if (typeof b64 !== 'string' || b64.length > 1400000) return res.status(400).json({ error: 'image' });
        const buf = Buffer.from(b64, 'base64');
        if (buf.length < 200 || buf.length > 1000000 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) return res.status(400).json({ error: 'image' });
        images.push(buf);
      }
      if (!images.length) return res.status(400).json({ error: 'image' });
      const product = await addProduct({ name, cat, price: text(body.price, 30), desc: text(body.desc, 400) }, images);
      return res.status(200).json({ product });
    }

    return res.status(400).json({ error: 'bad_request' });
  } catch (e) {
    console.error('admin', e && e.message);
    if (e && e.message === 'full') return res.status(400).json({ error: 'full' });
    return res.status(502).json({ error: 'storage' });
  }
};
