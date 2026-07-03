module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase não configurado' });

  const { nome, endereco, produto, pontos } = req.body || {};
  if (!nome || !endereco || !produto)
    return res.status(400).json({ error: 'nome, endereco e produto são obrigatórios' });

  const pedido = {
    order_id: 'chocopontos_' + Date.now(),
    status: 'pendente',
    metodo: 'chocopontos',
    nome_cliente: String(nome),
    email_cliente: '',
    cpf_cliente: '',
    whatsapp_cliente: '',
    endereco: { endereco: String(endereco) },
    itens: [{ nome: String(produto), qtd: 1, pontos: Number(pontos) || 0 }],
    total_centavos: 0
  };

  try {
    const resp = await fetch(`${SB_URL}/rest/v1/pedidos`, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(pedido)
    });
    if (!resp.ok) {
      const detail = await resp.text();
      return res.status(resp.status).json({ error: 'Erro ao salvar no Supabase', detail });
    }
    return res.json({ ok: true, order_id: pedido.order_id });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
};
