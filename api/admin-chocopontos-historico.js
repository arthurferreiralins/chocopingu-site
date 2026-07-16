const { registrarHistorico } = require('./_lib/chocopontos');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase não configurado' });
  const headers = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };

  if (req.method === 'GET') {
    const cpf = String(req.query.cpf || '').replace(/\D/g, '');
    try {
      const filtro = cpf ? `&cpf_cliente=eq.${cpf}` : '';
      const resp = await fetch(`${SB_URL}/rest/v1/chocopontos_historico?order=created_at.desc&limit=300${filtro}`, { headers });
      const data = await resp.json();
      if (!resp.ok) return res.status(resp.status).json({ error: data });
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err?.message || String(err) });
    }
  }

  if (req.method === 'POST') {
    const { cpf, pontos, motivo } = req.body || {};
    const cpfLimpo = String(cpf || '').replace(/\D/g, '');
    const pts = Number(pontos);
    if (cpfLimpo.length !== 11) return res.status(400).json({ error: 'CPF inválido' });
    if (!pts || isNaN(pts)) return res.status(400).json({ error: 'Informe a quantidade de pontos (positiva para creditar, negativa para debitar)' });
    try {
      await registrarHistorico(cpfLimpo, 'ajuste_manual', null, motivo || 'Ajuste manual do admin', pts);
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err?.message || String(err) });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
