module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase não configurado' });
  const headers = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };

  if (req.method === 'GET') {
    try {
      const resp = await fetch(`${SB_URL}/rest/v1/chocopontos_conquistas?order=created_at.desc`, { headers });
      const data = await resp.json();
      if (!resp.ok) return res.status(resp.status).json({ error: data });
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err?.message || String(err) });
    }
  }

  if (req.method === 'POST') {
    const { titulo, descricao, icone, criterio_tipo, criterio_valor, pontos_bonus, ativa } = req.body || {};
    if (!titulo || !String(titulo).trim()) return res.status(400).json({ error: 'Título é obrigatório' });
    try {
      const resp = await fetch(`${SB_URL}/rest/v1/chocopontos_conquistas`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({
          titulo: String(titulo).trim(),
          descricao: descricao || '',
          icone: icone || '🏅',
          criterio_tipo: criterio_tipo || 'pontos_acumulados',
          criterio_valor: Number(criterio_valor) || 0,
          pontos_bonus: Number(pontos_bonus) || 0,
          ativa: ativa !== false
        })
      });
      if (!resp.ok) {
        const detail = await resp.text();
        return res.status(resp.status).json({ error: 'Erro ao criar conquista', detail });
      }
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err?.message || String(err) });
    }
  }

  if (req.method === 'PATCH') {
    const { id, ...campos } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id obrigatório' });
    const permitido = {};
    ['titulo', 'descricao', 'icone', 'criterio_tipo', 'criterio_valor', 'pontos_bonus', 'ativa'].forEach(k => {
      if (campos[k] !== undefined) permitido[k] = campos[k];
    });
    try {
      const resp = await fetch(`${SB_URL}/rest/v1/chocopontos_conquistas?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(permitido)
      });
      if (!resp.ok) {
        const detail = await resp.text();
        return res.status(resp.status).json({ error: 'Erro ao atualizar conquista', detail });
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
      const resp = await fetch(`${SB_URL}/rest/v1/chocopontos_conquistas?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { ...headers, Prefer: 'return=minimal' }
      });
      if (!resp.ok) {
        const detail = await resp.text();
        return res.status(resp.status).json({ error: 'Erro ao excluir conquista', detail });
      }
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err?.message || String(err) });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
