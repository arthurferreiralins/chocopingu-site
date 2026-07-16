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
      const resp = await fetch(`${SB_URL}/rest/v1/chocopontos_eventos?order=data_inicio.desc`, { headers });
      const data = await resp.json();
      if (!resp.ok) return res.status(resp.status).json({ error: data });
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err?.message || String(err) });
    }
  }

  if (req.method === 'POST') {
    const { titulo, descricao, pontos_bonus, data_inicio, data_fim, ativo } = req.body || {};
    if (!titulo || !String(titulo).trim()) return res.status(400).json({ error: 'Título é obrigatório' });
    if (!data_inicio || !data_fim) return res.status(400).json({ error: 'Data de início e fim são obrigatórias' });
    try {
      const resp = await fetch(`${SB_URL}/rest/v1/chocopontos_eventos`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({
          titulo: String(titulo).trim(),
          descricao: descricao || '',
          pontos_bonus: Number(pontos_bonus) || 0,
          data_inicio: new Date(data_inicio).toISOString(),
          data_fim: new Date(data_fim).toISOString(),
          ativo: ativo !== false
        })
      });
      if (!resp.ok) {
        const detail = await resp.text();
        return res.status(resp.status).json({ error: 'Erro ao criar evento', detail });
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
    if (campos.titulo !== undefined) permitido.titulo = campos.titulo;
    if (campos.descricao !== undefined) permitido.descricao = campos.descricao;
    if (campos.pontos_bonus !== undefined) permitido.pontos_bonus = Number(campos.pontos_bonus) || 0;
    if (campos.data_inicio !== undefined) permitido.data_inicio = new Date(campos.data_inicio).toISOString();
    if (campos.data_fim !== undefined) permitido.data_fim = new Date(campos.data_fim).toISOString();
    if (campos.ativo !== undefined) permitido.ativo = campos.ativo;
    try {
      const resp = await fetch(`${SB_URL}/rest/v1/chocopontos_eventos?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(permitido)
      });
      if (!resp.ok) {
        const detail = await resp.text();
        return res.status(resp.status).json({ error: 'Erro ao atualizar evento', detail });
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
      const resp = await fetch(`${SB_URL}/rest/v1/chocopontos_eventos?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { ...headers, Prefer: 'return=minimal' }
      });
      if (!resp.ok) {
        const detail = await resp.text();
        return res.status(resp.status).json({ error: 'Erro ao excluir evento', detail });
      }
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err?.message || String(err) });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
