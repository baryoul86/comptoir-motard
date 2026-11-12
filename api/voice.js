// Comptoir Motard – voix de l'assistante : fonction serveur (Vercel)
// Utilise la même clé OPENAI_API_KEY. Optionnel : OPENAI_TTS_MODEL, OPENAI_TTS_VOICE
// Si ce service ne répond pas, le site utilise automatiquement la voix du téléphone.
const MODEL = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';
const VOICE = process.env.OPENAI_TTS_VOICE || 'coral';

const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < win);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 30;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const origin = req.headers.origin || '';
  if (origin) {
    let host = '';
    try { host = new URL(origin).host; } catch (e) {}
    if (host !== req.headers.host) return res.status(403).json({ error: 'origin' });
  }
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  if (limited(ip)) return res.status(429).json({ error: 'rate' });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ error: 'not_configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const text = body && typeof body.text === 'string' ? body.text.trim().slice(0, 900) : '';
  if (!text) return res.status(400).json({ error: 'bad_request' });

  try {
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model: MODEL, voice: VOICE, input: text, response_format: 'mp3',
        instructions: 'Voix féminine, chaleureuse et naturelle, comme une vendeuse sympathique dans un magasin de moto. Parle dans la langue du texte (français, anglais ou arabe), à un rythme normal.',
      }),
    });
    if (!r.ok) {
      console.error('openai tts', r.status, (await r.text()).slice(0, 300));
      return res.status(502).json({ error: 'upstream' });
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.status(200).send(buf);
  } catch (e) {
    console.error('voice', e && e.message);
    return res.status(502).json({ error: 'upstream' });
  }
};
