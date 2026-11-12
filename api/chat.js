// Comptoir Motard – assistante : fonction serveur (Vercel)
// Clé à définir dans Vercel > Settings > Environment Variables : OPENAI_API_KEY
// Optionnel : OPENAI_MODEL (modèle à utiliser)
const MODEL = process.env.OPENAI_MODEL || 'gpt-6-astra';

const CATALOG = "MAGASIN\nComptoir Motard – magasin de motos, équipement et pièces. Slogan : « Votre passion, notre priorité ».\nAdresse : 934 rue Ahmed Al Bidaoui, Massira 1, Témara (Maroc).\nTéléphone / WhatsApp : 0628889066 (international +212 628 889 066).\nHoraires d’hiver : lundi–vendredi 10h00–18h00 (fermé 13h00–14h00) ; samedi 10h00–16h00 en continu ; dimanche fermé.\nLivraison partout au Maroc. Prix en dirhams (DH).\n\nPROMOTIONS\n- Pack gants + cagoule : 150 DH au lieu de 220 DH. Livraison partout au Maroc.\n- Cash mains (protège-mains) Ténéré 700 : 550 DH au lieu de 790 DH. Offre valable jusqu’à la fin du stock.\n\nPRODUITS EN MAGASIN\n- [Protections] Carters moteur GBRacing — prix : 850 DH — Protections de carter moteur GBRacing. Compatibles Yamaha MT-07 et Yamaha MT-09.\n- [Cagoules] Cagoule Dainese — prix sur demande — Cagoule moto noire, logo Dainese. Deux versions : logo rouge et blanc, ou logo blanc.\n- [Cagoules] Cagoule Alpinestars — prix sur demande — Cagoule moto noire avec logo Alpinestars.\n- [Cagoules] Cagoule noire simple — prix sur demande — Cagoule moto noire unie.\n- [Casques] Casque Ortak modulable — prix sur demande — Casque modulable homologué DOT / ECE, double visière TSS (Twin Shield System), LED intégrée au casque, câble de charge inclus. Noir brillant, taille M (57–58 cm) en photo.\n- [Casques] Casque AGV K1S — prix sur demande — Casque intégral AGV, décor roses sur fond bleu, visière miroir bleue.\n- [Casques] Casque AGV K1 S — prix sur demande — Casque intégral AGV K1 S, finition mate bleu et jaune, visière transparente Pinlock Ready, écran Ultravision 190°, fermeture double anneau. Taille L en photo.\n- [Protections] Sac à dos Dainese – cartable + protège-dos — prix sur demande — Sac à dos Dainese original, coque rigide finition carbone : cartable et protège-dos en même temps.\n- [Disques de frein] Disque de frein arrière NG – Suzuki V-Strom 650 — prix : 870 DH — Disque de frein arrière (plateau) NG Brake Disc, contour ondulé et perforé, fabriqué en Espagne. Compatible Suzuki V-Strom 650.\n- [Disques de frein] Disque de frein (plateau) NG – Kawasaki Z800 / Z750 — prix : 950 DH — Disque de frein (plateau) NG Brake Disc, contour ondulé et perforé, fabriqué en Espagne. Compatible Kawasaki Z800 et Z750.\n- [Gants] Gants Madbike City — prix sur demande — Gants textile gris, inscriptions réfléchissantes, fermeture velcro au poignet.\n- [Gants] Gants AXG Rahln8 — prix sur demande — Gants noirs avec coque de protection sur les phalanges et protections sur les doigts.\n- [Interphones] Interphone moto V50 — prix sur demande — Wireless Earphone V50, interphone Bluetooth pour casque. Livré avec câble USB et fixation.\n- [Entretien] Kit entretien chaîne K9 Bardahl — prix sur demande — Kits nettoyant, lubrifiant et brosse : version Off-road et version Strada-Pista (route / piste).\n- [Entretien] Kits d’entretien et filtres — prix sur demande — Kit soin du casque IPONE, kits d’entretien chaîne K9, kit nettoyage filtre à air K&N, kit DNA, liquide de frein Lubrex DOT 4.\n\nPLAQUETTES DE FREIN EN MAGASIN (prix et compatibilité sur demande) : SBS 613HF, SBS 960HS, SBS 734HF, SBS 806HS, SBS 807H.HF, SBS 834HF, SBS 146HM, SBS 107HM, SBS 704HF, SBS 828HF, SBS 675HF, SBS 657HF, SBS 638HF, SBS 634HF, SBS 881HM, SBS 555LS, SBS 209HF, Kolmio-Lam Plaquettes de frein, SBS 627HF, SBS 671HF, SBS 810SI, SBS 940HS, SBS 900HF, SBS 953LS, SBS 769LS, SBS 767SI, SBS 796HS, SBS 833LS, SBS 183HF, SBS 841HS, SBS 877HS, Freno Carbon 176 / 674-CFB, Freno Carbon 183 / 627-CFB, GHB OEM Quality, SBS 657HM, SBS 691HF, SBS 735HF, SBS 810HF, SBS 671LS, SBS 674H.HF, SBS 675HM, SBS 183HM, SBS 128HM, SBS 193HM, SBS 169HM.\n\nPIÈCE HORS STOCK : si une pièce n’est pas en magasin, le client envoie la marque, le modèle et l’année de sa moto et le magasin la commande pour lui.";

const INSTRUCTIONS = `Tu es l'assistante virtuelle du magasin de moto « Comptoir Motard » à Témara (Maroc). Tu parles aux clients sur le site du magasin, dans une petite bulle de discussion.

LANGUE
- Réponds toujours dans la langue du dernier message du client : français, italien ou arabe (arabe standard ou darija marocaine, en lettres arabes si le client écrit en lettres arabes).
- Si la langue n'est pas claire, utilise la langue d'interface indiquée.

STYLE
- Chaleureuse, naturelle, comme une vendeuse sympathique. Tu réponds aux salutations et à la petite conversation (« bonjour, ça va ? ») avec simplicité, puis tu proposes ton aide.
- Réponses courtes : 2 à 5 phrases. Pas de titres, pas de tableaux, pas de listes longues, pas de gras.
- Tu restes sur le magasin, la moto, les pièces, l'équipement et l'entretien. Pour tout autre sujet, réponds brièvement et ramène gentiment la conversation au magasin.

CE QUE TU SAIS (informations du site, à utiliser en priorité)
${CATALOG}

RÈGLES
- Pour les produits, prix, promotions, horaires, adresse et contact : utilise uniquement les informations ci-dessus. N'invente jamais un prix, un stock ou un délai. Si le prix n'est pas indiqué, dis qu'il est communiqué sur demande.
- Pour les caractéristiques techniques qui ne sont pas ci-dessus (homologation, poids, tailles, compatibilité d'une pièce avec un modèle, quelle référence de plaquette, de filtre, de pneu ou d'huile il faut pour un véhicule donné, etc.) : fais une recherche sur internet, puis réponds en résumant simplement. Si l'information reste incertaine, dis-le et conseille de confirmer avec le magasin.
- Si la pièce demandée n'est pas dans la liste : explique que le magasin peut la commander (pièce hors stock) et demande la marque, le modèle et l'année du véhicule s'ils manquent.
- Ne donne pas de conseils de réparation dangereux ; pour le freinage et la sécurité, recommande un montage par un professionnel.

COMMANDE
- Quand le client veut acheter ou commander quelque chose, ou quand tu as identifié la pièce qu'il lui faut, demande-lui s'il veut la commander et termine ta réponse par une ligne seule, exactement à ce format :
[[ORDER: désignation courte de la pièce, avec marque/modèle/année du véhicule si connus]]
- La désignation est toujours en français. Le site affichera automatiquement un bouton de commande : n'écris donc pas toi-même de lien WhatsApp ni de numéro à cet endroit.
- N'ajoute cette ligne que s'il y a un produit ou une pièce précise à commander.`;

const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < win);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 25;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  // Accepte seulement les appels venant du site lui-même.
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
  const raw = body && Array.isArray(body.messages) ? body.messages : null;
  if (!raw || !raw.length) return res.status(400).json({ error: 'bad_request' });

  const messages = raw.slice(-10)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, m.role === 'user' ? 600 : 2000) }));
  if (!messages.length || messages[messages.length - 1].role !== 'user') return res.status(400).json({ error: 'bad_request' });

  const lang = { fr: 'français', it: 'italien', ar: 'arabe' }[body.lang] || 'français';

  try {
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model: MODEL,
        instructions: INSTRUCTIONS + '\n\nLangue d\'interface choisie par le client : ' + lang + '.',
        input: messages,
        tools: [{ type: 'web_search' }],
        max_output_tokens: 2500,
        store: false,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('openai', r.status, JSON.stringify(data && data.error));
      return res.status(502).json({ error: 'upstream' });
    }

    let text = '';
    const sources = [];
    for (const item of data.output || []) {
      if (item.type !== 'message') continue;
      for (const c of item.content || []) {
        if (c.type !== 'output_text') continue;
        text += c.text || '';
        for (const a of c.annotations || []) {
          if (a.type === 'url_citation' && /^https?:\/\//.test(a.url || '') && !sources.some((s) => s.url === a.url) && sources.length < 3) {
            let title = '';
            try { title = new URL(a.url).host.replace(/^www\./, ''); } catch (e) {}
            sources.push({ url: a.url, title: title || 'source' });
          }
        }
      }
    }

    let order = null;
    text = text.replace(/\[\[\s*ORDER\s*:\s*([^\]]{2,200})\]\]/gi, (m, p) => { order = p.trim(); return ''; });
    // Retire les citations en ligne (elles sont affichées sous le message).
    text = text.replace(/\s*\(\s*\[[^\]]+\]\(https?:\/\/[^)]+\)\s*\)/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!text) return res.status(502).json({ error: 'empty' });

    return res.status(200).json({ text, order, sources });
  } catch (e) {
    console.error('chat', e && e.message);
    return res.status(502).json({ error: 'upstream' });
  }
};
