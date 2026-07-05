module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const SK = process.env.PAGARME_SECRET_KEY;
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SK) return res.status(500).json({ error: 'PAGARME_SECRET_KEY não configurada' });

  const { itens, cliente, metodo, card_token, parcelas } = req.body || {};

  if (!Array.isArray(itens) || itens.length === 0)
    return res.status(400).json({ error: 'itens[] obrigatório' });
  if (!cliente || !cliente.nome || !cliente.email || !cliente.cpf)
    return res.status(400).json({ error: 'cliente.nome, .email e .cpf obrigatórios' });

  const orderItems = itens.map(it => ({
    amount: Math.round(Number(it.preco) * 100),
    description: String(it.nome),
    quantity: Number(it.qtd) || 1
  }));
  const totalAmount = orderItems.reduce((s, it) => s + it.amount * it.quantity, 0);
  const cpf = String(cliente.cpf).replace(/\D/g, '');
  const tel = String(cliente.whatsapp || '').replace(/\D/g, '');

  const order = {
    items: orderItems,
    customer: {
      name: String(cliente.nome),
      email: String(cliente.email),
      document: cpf,
      document_type: 'cpf',
      type: 'individual',
      ...(tel.length >= 10 && {
        phones: {
          mobile_phone: {
            country_code: '55',
            area_code: tel.slice(0, 2),
            number: tel.slice(2)
          }
        }
      })
    },
    payments: []
  };

  if (cliente.endereco && cliente.endereco.rua) {
    const e = cliente.endereco;
    order.shipping = {
      amount: 0,
      description: 'Entrega Chocopingu',
      address: {
        line_1: `${e.numero}, ${e.rua}, ${e.bairro}`,
        line_2: e.complemento || '',
        zip_code: String(e.cep).replace(/\D/g, ''),
        city: e.cidade,
        state: e.estado || 'PE',
        country: 'BR'
      }
    };
  }

  if (metodo === 'pix') {
    order.payments.push({
      payment_method: 'pix',
      amount: totalAmount,
      pix: { expires_in: 3600 }
    });
  } else if (metodo === 'boleto') {
    const due = new Date();
    due.setDate(due.getDate() + 3);
    order.payments.push({
      payment_method: 'boleto',
      amount: totalAmount,
      boleto: {
        instructions: 'Pague até a data de vencimento. Não receber após o vencimento.',
        due_at: due.toISOString().replace(/\.\d+Z$/, 'Z')
      }
    });
  } else if (metodo === 'cartao') {
    if (!card_token)
      return res.status(400).json({ error: 'card_token obrigatório para cartão' });
    order.payments.push({
      payment_method: 'credit_card',
      amount: totalAmount,
      credit_card: {
        installments: Math.max(1, Number(parcelas) || 1),
        statement_descriptor: 'CHOCOPINGU',
        card_token: String(card_token)
      }
    });
  } else {
    return res.status(400).json({ error: 'metodo inválido — use: pix, boleto ou cartao' });
  }

  try {
    const auth = Buffer.from(SK + ':').toString('base64');
    const resp = await fetch('https://api.pagar.me/core/v5/orders', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });

    const data = await resp.json();
    if (!resp.ok)
      return res.status(resp.status).json({ error: 'PagarMe API error', detail: data });

    const charge = data.charges?.[0];
    const tx = charge?.last_transaction;

    if (metodo !== 'cartao' && (data.status === 'failed' || charge?.status === 'failed')) {
      const motivo = tx?.gateway_response?.errors?.[0]?.message
        || 'Pagamento recusado. Verifique os dados informados e tente novamente.';
      return res.status(400).json({ error: motivo });
    }

    const result = { order_id: data.id, status: data.status, metodo };

    if (metodo === 'pix' && tx) {
      result.pix_qr_code = tx.qr_code;
      result.pix_qr_code_url = tx.qr_code_url;
    } else if (metodo === 'boleto' && tx) {
      result.boleto_linha = tx.line;
      result.boleto_pdf = tx.pdf;
      result.boleto_vencimento = tx.due_at;
    } else if (metodo === 'cartao' && charge) {
      result.charge_status = charge.status;
      result.brand = tx?.card?.brand;
      result.last_four = tx?.card?.last_four_digits;
    }

    // Salvar no Supabase
    if (SB_URL && SB_KEY) {
      const pedido = {
        order_id: data.id,
        status: data.status,
        metodo,
        nome_cliente: cliente.nome,
        email_cliente: cliente.email,
        cpf_cliente: cpf,
        whatsapp_cliente: tel,
        endereco: cliente.endereco || null,
        itens: itens,
        total_centavos: totalAmount,
        pix_qr_code: result.pix_qr_code || null,
        boleto_linha: result.boleto_linha || null,
        boleto_pdf: result.boleto_pdf || null
      };

      fetch(`${SB_URL}/rest/v1/pedidos`, {
        method: 'POST',
        headers: {
          'apikey': SB_KEY,
          'Authorization': 'Bearer ' + SB_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(pedido)
      }).catch(err => console.error('Supabase save error:', err));
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
};
