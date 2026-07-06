module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase não configurado' });

  if (req.method === 'GET') {
    try {
      const resp = await fetch(`${SB_URL}/rest/v1/avaliacoes?aprovado=eq.true&order=created_at.desc&limit=50`, {
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
    const { nome, nota, comentario } = req.body || {};
    const notaNum = Number(nota);
    if (!nome || String(nome).trim().length < 2)
      return res.status(400).json({ error: 'Nome é obrigatório' });
    if (!Number.isInteger(notaNum) || notaNum < 1 || notaNum > 5)
      return res.status(400).json({ error: 'Nota deve ser de 1 a 5' });
    if (!comentario || String(comentario).trim().length < 3)
      return res.status(400).json({ error: 'Comentário é obrigatório' });

    try {
      const resp = await fetch(`${SB_URL}/rest/v1/avaliacoes`, {
        method: 'POST',
        headers: {
          apikey: SB_KEY,
          Authorization: 'Bearer ' + SB_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          nome: String(nome).trim().slice(0, 80),
          nota: notaNum,
          comentario: String(comentario).trim().slice(0, 500),
          aprovado: false
        })
      });
      if (!resp.ok) {
        const detail = await resp.text();
        return res.status(resp.status).json({ error: 'Erro ao salvar avaliação', detail });
      }
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err?.message || String(err) });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
