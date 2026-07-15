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
      const resp = await fetch(`${SB_URL}/rest/v1/perguntas?status=eq.respondida&select=id,pergunta,resposta,answered_at&order=answered_at.desc&limit=50`, {
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
    const { pergunta, nome } = req.body || {};
    const perguntaLimpa = String(pergunta || '').trim();
    if (!perguntaLimpa || perguntaLimpa.length < 5)
      return res.status(400).json({ error: 'Escreva a pergunta completa' });
    if (perguntaLimpa.length > 500)
      return res.status(400).json({ error: 'Pergunta muito longa' });

    try {
      const resp = await fetch(`${SB_URL}/rest/v1/perguntas`, {
        method: 'POST',
        headers: {
          apikey: SB_KEY,
          Authorization: 'Bearer ' + SB_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          pergunta: perguntaLimpa,
          nome_cliente: nome ? String(nome).trim().slice(0, 80) : null,
          status: 'pendente'
        })
      });
      if (!resp.ok) {
        const detail = await resp.text();
        return res.status(resp.status).json({ error: 'Erro ao enviar pergunta', detail });
      }
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err?.message || String(err) });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
