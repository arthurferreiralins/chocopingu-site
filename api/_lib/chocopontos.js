const PONTOS_POR_COMPRA = 2;

async function calcularSaldo(cpf) {
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_URL || !SB_KEY) throw new Error('Supabase não configurado');

  const resp = await fetch(`${SB_URL}/rest/v1/pedidos?cpf_cliente=eq.${cpf}&select=metodo,itens`, {
    headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY }
  });
  const rows = await resp.json();
  if (!resp.ok) throw new Error('Erro ao consultar pedidos no Supabase');

  let ganhos = 0;
  let gastos = 0;
  for (const r of rows) {
    if (r.metodo === 'chocopontos') {
      gastos += (Array.isArray(r.itens) ? r.itens : []).reduce((s, it) => s + (Number(it.pontos) || 0), 0);
    } else {
      ganhos += PONTOS_POR_COMPRA;
    }
  }
  return { ganhos, gastos, saldo: ganhos - gastos };
}

module.exports = { calcularSaldo, PONTOS_POR_COMPRA };
