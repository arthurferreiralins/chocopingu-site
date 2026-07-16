const { buscarPedidos, buscarHistorico, calcularSaldo, avaliarCriterio, registrarHistorico } = require('./_lib/chocopontos');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase não configurado' });

  const cpf = String(req.query.cpf || '').replace(/\D/g, '');
  if (cpf.length !== 11) return res.status(400).json({ error: 'CPF inválido' });

  try {
    const [pedidos, historico] = await Promise.all([buscarPedidos(cpf), buscarHistorico(cpf)]);
    let { ganhos, gastos, saldo } = await calcularSaldo(cpf, { pedidos, historico });

    // Avalia conquistas ativas e desbloqueia automaticamente as que ainda não foram registradas
    const respConq = await fetch(`${SB_URL}/rest/v1/chocopontos_conquistas?ativa=eq.true&select=id,titulo,descricao,icone,criterio_tipo,criterio_valor,pontos_bonus`, {
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
    });
    const conquistas = await respConq.json();
    const conquistasIds = new Set(historico.filter(h => h.tipo === 'conquista').map(h => h.referencia_id));
    const novasDesbloqueadas = [];
    if (respConq.ok && Array.isArray(conquistas)) {
      for (const c of conquistas) {
        if (conquistasIds.has(c.id)) continue;
        const ctx = { pedidos, historico, ganhos };
        if (avaliarCriterio(c.criterio_tipo, c.criterio_valor, ctx)) {
          const bonus = Number(c.pontos_bonus) || 0;
          await registrarHistorico(cpf, 'conquista', c.id, c.titulo, bonus);
          historico.push({ tipo: 'conquista', referencia_id: c.id, titulo: c.titulo, pontos: bonus, created_at: new Date().toISOString() });
          conquistasIds.add(c.id);
          novasDesbloqueadas.push(c.id);
          ganhos += bonus > 0 ? bonus : 0;
          saldo += bonus;
        }
      }
    }

    const missoesClaimed = historico.filter(h => h.tipo === 'missao').map(h => h.referencia_id);
    const eventosClaimed = historico.filter(h => h.tipo === 'evento').map(h => h.referencia_id);

    // Histórico unificado: pedidos (compras/resgates) + eventos de bônus (missão/conquista/evento/ajuste)
    const historicoUnificado = [];
    for (const p of pedidos) {
      if (p.metodo === 'chocopontos') {
        const pts = (Array.isArray(p.itens) ? p.itens : []).reduce((s, it) => s + (Number(it.pontos) || 0), 0);
        historicoUnificado.push({ data: p.created_at, tipo: 'resgate', titulo: 'Resgate de produto', pontos: -pts });
      } else {
        historicoUnificado.push({ data: p.created_at, tipo: 'compra', titulo: 'Compra em dinheiro', pontos: 2 });
      }
    }
    for (const h of historico) {
      historicoUnificado.push({ data: h.created_at, tipo: h.tipo, titulo: h.titulo, pontos: h.pontos });
    }
    historicoUnificado.sort((a, b) => new Date(b.data) - new Date(a.data));

    return res.json({
      ganhos, gastos, saldo,
      missoesClaimed,
      conquistasUnlocked: Array.from(conquistasIds),
      novasConquistas: novasDesbloqueadas,
      eventosClaimed,
      historico: historicoUnificado.slice(0, 100)
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
};
