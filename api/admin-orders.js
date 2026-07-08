module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_URL || !SB_KEY)
    return res.status(500).json({ error: 'Supabase não configurado' });

  if (req.method === 'GET') {
    try {
      const resp = await fetch(`${SB_URL}/rest/v1/pedidos?order=created_at.desc&limit=100`, {
        headers: {
          'apikey': SB_KEY,
          'Authorization': 'Bearer ' + SB_KEY
        }
      });
      const data = await resp.json();
      if (!resp.ok) return res.status(resp.status).json({ error: data });
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err?.message || String(err) });
    }
  }

  if (req.method === 'PATCH') {
    const { id, status } = req.body || {};
    const permitidos = ['pendente', 'pago', 'entregue'];
    if (!id || !permitidos.includes(status))
      return res.status(400).json({ error: 'id e status (pendente/pago/entregue) são obrigatórios' });
    try {
      const resp = await fetch(`${SB_URL}/rest/v1/pedidos?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: {
          'apikey': SB_KEY,
          'Authorization': 'Bearer ' + SB_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status })
      });
      if (!resp.ok) {
        const detail = await resp.text();
        return res.status(resp.status).json({ error: 'Erro ao atualizar status', detail });
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
      const resp = await fetch(`${SB_URL}/rest/v1/pedidos?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'apikey': SB_KEY,
          'Authorization': 'Bearer ' + SB_KEY,
          'Prefer': 'return=minimal'
        }
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
