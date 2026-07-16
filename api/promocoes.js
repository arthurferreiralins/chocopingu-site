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
      const resp = await fetch(`${SB_URL}/rest/v1/promocoes?order=data_inicio.desc`, { headers });
      const data = await resp.json();
      if (!resp.ok) return res.status(resp.status).json({ error: data });
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err?.message || String(err) });
    }
  }

  if (req.method === 'POST') {
    const { produto_id, preco_promocional, data_inicio, data_fim } = req.body || {};
    const pid = Number(produto_id);
    const preco = Number(preco_promocional);
    if (!pid) return res.status(400).json({ error: 'produto_id é obrigatório' });
    if (!preco || preco <= 0) return res.status(400).json({ error: 'preco_promocional deve ser maior que zero' });
    if (!data_inicio || !data_fim) return res.status(400).json({ error: 'Data de início e fim são obrigatórias' });
    if (new Date(data_fim) <= new Date(data_inicio)) return res.status(400).json({ error: 'A data de fim precisa ser depois da data de início' });
    try {
      const resp = await fetch(`${SB_URL}/rest/v1/promocoes`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({
          produto_id: pid,
          preco_promocional: preco,
          data_inicio: new Date(data_inicio).toISOString(),
          data_fim: new Date(data_fim).toISOString()
        })
      });
      if (!resp.ok) {
        const detail = await resp.text();
        return res.status(resp.status).json({ error: 'Erro ao criar promoção', detail });
      }
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err?.message || String(err) });
    }
  }

  if (req.method === 'PATCH') {
    const { id, produto_id, preco_promocional, data_inicio, data_fim } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id obrigatório' });
    const campos = {};
    if (produto_id !== undefined) campos.produto_id = Number(produto_id);
    if (preco_promocional !== undefined) campos.preco_promocional = Number(preco_promocional);
    if (data_inicio !== undefined) campos.data_inicio = new Date(data_inicio).toISOString();
    if (data_fim !== undefined) campos.data_fim = new Date(data_fim).toISOString();
    try {
      const resp = await fetch(`${SB_URL}/rest/v1/promocoes?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(campos)
      });
      if (!resp.ok) {
        const detail = await resp.text();
        return res.status(resp.status).json({ error: 'Erro ao atualizar promoção', detail });
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
      const resp = await fetch(`${SB_URL}/rest/v1/promocoes?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { ...headers, Prefer: 'return=minimal' }
      });
      if (!resp.ok) {
        const detail = await resp.text();
        return res.status(resp.status).json({ error: 'Erro ao excluir promoção', detail });
      }
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err?.message || String(err) });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
