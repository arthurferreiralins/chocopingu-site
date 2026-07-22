module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase não configurado' });
  const headers = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };

  const tipo = req.query.tipo;
  let queryUrl;
  if (tipo === 'missoes') {
    queryUrl = `${SB_URL}/rest/v1/chocopontos_missoes?ativa=eq.true&order=created_at.asc&select=id,titulo,descricao,pontos,icone,criterio_tipo,criterio_valor`;
  } else if (tipo === 'conquistas') {
    queryUrl = `${SB_URL}/rest/v1/chocopontos_conquistas?ativa=eq.true&order=criterio_valor.asc&select=id,titulo,descricao,icone,criterio_tipo,criterio_valor,pontos_bonus`;
  } else if (tipo === 'eventos') {
    const agora = new Date().toISOString();
    queryUrl = `${SB_URL}/rest/v1/chocopontos_eventos?ativo=eq.true&data_inicio=lte.${agora}&data_fim=gte.${agora}&order=data_fim.asc&select=id,titulo,descricao,pontos_bonus,data_inicio,data_fim`;
  } else if (tipo === 'lugares') {
    queryUrl = `${SB_URL}/rest/v1/lugares?ativo=eq.true&order=nome.asc&select=id,nome,categoria,endereco,latitude,longitude,telefone,whatsapp,descricao,foto_url`;
  } else {
    return res.status(400).json({ error: 'tipo inválido (use missoes, conquistas, eventos ou lugares)' });
  }

  try {
    const resp = await fetch(queryUrl, { headers });
    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: data });
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
};
