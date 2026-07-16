const PONTOS_POR_COMPRA = 2;

function sbHeaders(SB_KEY) {
  return { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };
}

async function buscarPedidos(cpf) {
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  const resp = await fetch(`${SB_URL}/rest/v1/pedidos?cpf_cliente=eq.${cpf}&select=metodo,itens,created_at`, {
    headers: sbHeaders(SB_KEY)
  });
  const rows = await resp.json();
  if (!resp.ok) throw new Error('Erro ao consultar pedidos no Supabase');
  return rows;
}

async function buscarHistorico(cpf) {
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  const resp = await fetch(`${SB_URL}/rest/v1/chocopontos_historico?cpf_cliente=eq.${cpf}&order=created_at.desc&select=id,tipo,referencia_id,titulo,pontos,created_at`, {
    headers: sbHeaders(SB_KEY)
  });
  const rows = await resp.json();
  if (!resp.ok) throw new Error('Erro ao consultar histórico de chocopontos no Supabase');
  return rows;
}

// Saldo = (compras em dinheiro - resgates de produto, já existentes em `pedidos`)
// + (bônus de missões/conquistas/eventos, registrados em `chocopontos_historico`)
async function calcularSaldo(cpf, opts) {
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_URL || !SB_KEY) throw new Error('Supabase não configurado');

  const pedidos = (opts && opts.pedidos) || await buscarPedidos(cpf);
  const historico = (opts && opts.historico) || await buscarHistorico(cpf);

  let ganhosPedidos = 0;
  let gastosPedidos = 0;
  for (const r of pedidos) {
    if (r.metodo === 'chocopontos') {
      gastosPedidos += (Array.isArray(r.itens) ? r.itens : []).reduce((s, it) => s + (Number(it.pontos) || 0), 0);
    } else {
      ganhosPedidos += PONTOS_POR_COMPRA;
    }
  }

  let ganhosLedger = 0;
  let gastosLedger = 0;
  for (const h of historico) {
    const p = Number(h.pontos) || 0;
    if (p >= 0) ganhosLedger += p; else gastosLedger += -p;
  }

  const ganhos = ganhosPedidos + ganhosLedger;
  const gastos = gastosPedidos + gastosLedger;
  return { ganhos, gastos, saldo: ganhos - gastos };
}

function avaliarCriterio(tipo, valor, ctx) {
  const alvo = Number(valor) || 0;
  switch (tipo) {
    case 'pedidos_realizados':
      return ctx.pedidos.filter(p => p.metodo !== 'chocopontos').length >= alvo;
    case 'pontos_acumulados':
      return ctx.ganhos >= alvo;
    case 'missoes_completas':
      return ctx.historico.filter(h => h.tipo === 'missao').length >= alvo;
    case 'manual':
    default:
      return true;
  }
}

async function registrarHistorico(cpf, tipo, referenciaId, titulo, pontos) {
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  const resp = await fetch(`${SB_URL}/rest/v1/chocopontos_historico`, {
    method: 'POST',
    headers: { ...sbHeaders(SB_KEY), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ cpf_cliente: cpf, tipo, referencia_id: referenciaId || null, titulo, pontos })
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error('Erro ao registrar histórico: ' + detail);
  }
}

module.exports = {
  PONTOS_POR_COMPRA,
  sbHeaders,
  buscarPedidos,
  buscarHistorico,
  calcularSaldo,
  avaliarCriterio,
  registrarHistorico
};
