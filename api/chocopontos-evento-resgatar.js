const { buscarPedidos, buscarHistorico, calcularSaldo, registrarHistorico } = require('./_lib/chocopontos');

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
  const eventoId = (req.body || {}).eventoId;
  if (cpf.length !== 11) return res.status(400).json({ error: 'CPF inválido' });
  if (!eventoId) return res.status(400).json({ error: 'eventoId obrigatório' });

  try {
    const respE = await fetch(`${SB_URL}/rest/v1/chocopontos_eventos?id=eq.${encodeURIComponent(eventoId)}&select=id,titulo,pontos_bonus,data_inicio,data_fim,ativo`, {
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
    });
    const eventos = await respE.json();
    if (!respE.ok || !Array.isArray(eventos) || eventos.length === 0)
      return res.status(404).json({ error: 'Evento não encontrado' });
    const evento = eventos[0];
    const agora = new Date();
    if (!evento.ativo || agora < new Date(evento.data_inicio) || agora > new Date(evento.data_fim))
      return res.status(400).json({ error: 'Esse evento não está mais ativo' });

    const [pedidos, historico] = await Promise.all([buscarPedidos(cpf), buscarHistorico(cpf)]);
    if (historico.some(h => h.tipo === 'evento' && h.referencia_id === evento.id))
      return res.status(409).json({ error: 'Você já resgatou o bônus desse evento' });

    await registrarHistorico(cpf, 'evento', evento.id, evento.titulo, Number(evento.pontos_bonus) || 0);
    historico.push({ tipo: 'evento', referencia_id: evento.id, pontos: Number(evento.pontos_bonus) || 0 });
    const novoSaldo = await calcularSaldo(cpf, { pedidos, historico });

    return res.json({ ok: true, pontosGanhos: Number(evento.pontos_bonus) || 0, ...novoSaldo });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
};
