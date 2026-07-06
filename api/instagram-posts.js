module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase não configurado' });

  if (req.method === 'GET') {
    try {
      const resp = await fetch(`${SB_URL}/rest/v1/instagram_posts?order=created_at.desc&limit=12`, {
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
      });
      const data = await resp.json();
      if (!resp.ok) return res.status(resp.status).json({ error: data });
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err?.message || String(err) });
    }
  }

  if (req.method === 'POST') {
    const { url } = req.body || {};
    if (!url || !/^https:\/\/(www\.)?instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+/.test(String(url).trim()))
      return res.status(400).json({ error: 'URL de post/reel do Instagram inválida' });

    try {
      const resp = await fetch(`${SB_URL}/rest/v1/instagram_posts`, {
        method: 'POST',
        headers: {
          apikey: SB_KEY,
          Authorization: 'Bearer ' + SB_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ url: String(url).trim() })
      });
      if (!resp.ok) {
        const detail = await resp.text();
        return res.status(resp.status).json({ error: 'Erro ao salvar link', detail });
      }
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err?.message || String(err) });
    }
  }

  if (req.method === 'DELETE') {
    const id = req.query?.id || req.body?.id;
    if (!id) return res.status(400).json({ error: 'id obrigatório' });
    try {
      const resp = await fetch(`${SB_URL}/rest/v1/instagram_posts?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, Prefer: 'return=minimal' }
      });
      if (!resp.ok) {
        const detail = await resp.text();
        return res.status(resp.status).json({ error: 'Erro ao excluir', detail });
      }
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err?.message || String(err) });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
