const { buscarPedidos, buscarHistorico, calcularSaldo, avaliarCriterio, registrarHistorico } = require('./_lib/chocopontos');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase não configurado' });

  const cpf = String((req.body || {}).cpf || '').replace(/\D/g, '');
  const missaoId = (req.body || {}).missaoId;
  if (cpf.length !== 11) return res.status(400).json({ error: 'CPF inválido' });
  if (!missaoId) return res.status(400).json({ error: 'missaoId obrigatório' });

  try {
    const respM = await fetch(`${SB_URL}/rest/v1/chocopontos_missoes?id=eq.${encodeURIComponent(missaoId)}&select=id,titulo,pontos,criterio_tipo,criterio_valor,ativa`, {
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
    });
    const missoes = await respM.json();
    if (!respM.ok || !Array.isArray(missoes) || missoes.length === 0)
      return res.status(404).json({ error: 'Missão não encontrada' });
    const missao = missoes[0];
    if (!missao.ativa) return res.status(400).json({ error: 'Essa missão não está mais disponível' });

    const [pedidos, historico] = await Promise.all([buscarPedidos(cpf), buscarHistorico(cpf)]);
    if (historico.some(h => h.tipo === 'missao' && h.referencia_id === missao.id))
      return res.status(409).json({ error: 'Você já resgatou essa missão' });

    const { ganhos } = await calcularSaldo(cpf, { pedidos, historico });
    if (!avaliarCriterio(missao.criterio_tipo, missao.criterio_valor, { pedidos, historico, ganhos }))
      return res.status(400).json({ error: 'Você ainda não cumpre os requisitos dessa missão' });

    await registrarHistorico(cpf, 'missao', missao.id, missao.titulo, Number(missao.pontos) || 0);
    historico.push({ tipo: 'missao', referencia_id: missao.id, pontos: Number(missao.pontos) || 0 });
    const novoSaldo = await calcularSaldo(cpf, { pedidos, historico });

    return res.json({ ok: true, pontosGanhos: Number(missao.pontos) || 0, ...novoSaldo });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
};
