// Comptoir Motard – liste publique des produits ajoutés depuis le mode administrateur
const { listProducts } = require('../lib/store');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });
  try {
    const products = await listProducts(false);
    res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
    return res.status(200).json({ products });
  } catch (e) {
    console.error('products', e && e.message);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ products: [] });
  }
};
