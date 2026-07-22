const { registrarHistorico } = require('./_lib/chocopontos');

const TABELAS = {
  missoes: {
    nome: 'chocopontos_missoes',
    order: 'created_at.desc',
    campos: ['titulo', 'descricao', 'pontos', 'icone', 'criterio_tipo', 'criterio_valor', 'ativa'],
    defaults: (b) => ({
      titulo: String(b.titulo || '').trim(),
      descricao: b.descricao || '',
      pontos: Number(b.pontos) || 0,
      icone: b.icone || '🎯',
      criterio_tipo: b.criterio_tipo || 'manual',
      criterio_valor: Number(b.criterio_valor) || 0,
      ativa: b.ativa !== false
    })
  },
  conquistas: {
    nome: 'chocopontos_conquistas',
    order: 'created_at.desc',
    campos: ['titulo', 'descricao', 'icone', 'criterio_tipo', 'criterio_valor', 'pontos_bonus', 'ativa'],
    defaults: (b) => ({
      titulo: String(b.titulo || '').trim(),
      descricao: b.descricao || '',
      icone: b.icone || '🏅',
      criterio_tipo: b.criterio_tipo || 'pontos_acumulados',
      criterio_valor: Number(b.criterio_valor) || 0,
      pontos_bonus: Number(b.pontos_bonus) || 0,
      ativa: b.ativa !== false
    })
  },
  eventos: {
    nome: 'chocopontos_eventos',
    order: 'data_inicio.desc',
    campos: ['titulo', 'descricao', 'pontos_bonus', 'data_inicio', 'data_fim', 'ativo'],
    defaults: (b) => ({
      titulo: String(b.titulo || '').trim(),
      descricao: b.descricao || '',
      pontos_bonus: Number(b.pontos_bonus) || 0,
      data_inicio: new Date(b.data_inicio).toISOString(),
      data_fim: new Date(b.data_fim).toISOString(),
      ativo: b.ativo !== false
    })
  }
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Supabase não configurado' });
  const headers = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };

  const tipo = req.query.tipo;

  // ── HISTÓRICO (ledger): listagem + ajuste manual ──
  if (tipo === 'historico') {
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
  }

  // ── PROMOÇÕES por produto (preço promocional + janela de datas) ──
  if (tipo === 'promocoes') {
    if (req.method === 'GET') {
      try {
        const resp = await fetch(`${SB_URL}/rest/v1/promocoes?order=data_inicio.desc`, { headers });
        const data = await resp.json();
        if (!resp.ok) return res.status(resp.status).json({ error: data });
        return res.json(data);
      } catch (err) {
        return res.status(500).json({ error: err?.message || String(err) });
      }
    }
    if (req.method === 'POST') {
      const { produto_id, preco_promocional, data_inicio, data_fim } = req.body || {};
      const pid = Number(produto_id);
      const preco = Number(preco_promocional);
      if (!pid) return res.status(400).json({ error: 'produto_id é obrigatório' });
      if (!preco || preco <= 0) return res.status(400).json({ error: 'preco_promocional deve ser maior que zero' });
      if (!data_inicio || !data_fim) return res.status(400).json({ error: 'Data de início e fim são obrigatórias' });
      if (new Date(data_fim) <= new Date(data_inicio)) return res.status(400).json({ error: 'A data de fim precisa ser depois da data de início' });
      try {
        const resp = await fetch(`${SB_URL}/rest/v1/promocoes`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({
            produto_id: pid,
            preco_promocional: preco,
            data_inicio: new Date(data_inicio).toISOString(),
            data_fim: new Date(data_fim).toISOString()
          })
        });
        if (!resp.ok) {
          const detail = await resp.text();
          return res.status(resp.status).json({ error: 'Erro ao criar promoção', detail });
        }
        return res.json({ ok: true });
      } catch (err) {
        return res.status(500).json({ error: err?.message || String(err) });
      }
    }
    if (req.method === 'PATCH') {
      const { id, produto_id, preco_promocional, data_inicio, data_fim } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id obrigatório' });
      const campos = {};
      if (produto_id !== undefined) campos.produto_id = Number(produto_id);
      if (preco_promocional !== undefined) campos.preco_promocional = Number(preco_promocional);
      if (data_inicio !== undefined) campos.data_inicio = new Date(data_inicio).toISOString();
      if (data_fim !== undefined) campos.data_fim = new Date(data_fim).toISOString();
      try {
        const resp = await fetch(`${SB_URL}/rest/v1/promocoes?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(campos)
        });
        if (!resp.ok) {
          const detail = await resp.text();
          return res.status(resp.status).json({ error: 'Erro ao atualizar promoção', detail });
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
        const resp = await fetch(`${SB_URL}/rest/v1/promocoes?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { ...headers, Prefer: 'return=minimal' }
        });
        if (!resp.ok) {
          const detail = await resp.text();
          return res.status(resp.status).json({ error: 'Erro ao excluir promoção', detail });
        }
        return res.json({ ok: true });
      } catch (err) {
        return res.status(500).json({ error: err?.message || String(err) });
      }
    }
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // ── LUGARES (mapa "Mundo Chocopingu") ──
  if (tipo === 'lugares') {
    if (req.method === 'GET') {
      try {
        const resp = await fetch(`${SB_URL}/rest/v1/lugares?order=nome.asc`, { headers });
        const data = await resp.json();
        if (!resp.ok) return res.status(resp.status).json({ error: data });
        return res.json(data);
      } catch (err) {
        return res.status(500).json({ error: err?.message || String(err) });
      }
    }
    if (req.method === 'POST') {
      const b = req.body || {};
      const nome = String(b.nome || '').trim();
      const lat = Number(b.latitude);
      const lng = Number(b.longitude);
      if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
      if (!isFinite(lat) || !isFinite(lng)) return res.status(400).json({ error: 'Localização (latitude/longitude) é obrigatória — use o botão de buscar endereço no mapa' });
      try {
        const resp = await fetch(`${SB_URL}/rest/v1/lugares`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({
            nome,
            categoria: b.categoria || 'loja',
            endereco: b.endereco || '',
            latitude: lat,
            longitude: lng,
            telefone: b.telefone || '',
            whatsapp: b.whatsapp || '',
            descricao: b.descricao || '',
            foto_url: b.foto_url || '',
            ativo: b.ativo !== false
          })
        });
        if (!resp.ok) {
          const detail = await resp.text();
          return res.status(resp.status).json({ error: 'Erro ao criar lugar', detail });
        }
        return res.json({ ok: true });
      } catch (err) {
        return res.status(500).json({ error: err?.message || String(err) });
      }
    }
    if (req.method === 'PATCH') {
      const { id, ...b } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id obrigatório' });
      const campos = {};
      ['nome', 'categoria', 'endereco', 'telefone', 'whatsapp', 'descricao', 'foto_url'].forEach(k => {
        if (b[k] !== undefined) campos[k] = b[k];
      });
      if (b.latitude !== undefined) campos.latitude = Number(b.latitude);
      if (b.longitude !== undefined) campos.longitude = Number(b.longitude);
      if (b.ativo !== undefined) campos.ativo = !!b.ativo;
      try {
        const resp = await fetch(`${SB_URL}/rest/v1/lugares?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(campos)
        });
        if (!resp.ok) {
          const detail = await resp.text();
          return res.status(resp.status).json({ error: 'Erro ao atualizar lugar', detail });
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
        const resp = await fetch(`${SB_URL}/rest/v1/lugares?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { ...headers, Prefer: 'return=minimal' }
        });
        if (!resp.ok) {
          const detail = await resp.text();
          return res.status(resp.status).json({ error: 'Erro ao excluir lugar', detail });
        }
        return res.json({ ok: true });
      } catch (err) {
        return res.status(500).json({ error: err?.message || String(err) });
      }
    }
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // ── MISSÕES / CONQUISTAS / EVENTOS: CRUD genérico ──
  const cfg = TABELAS[tipo];
  if (!cfg) return res.status(400).json({ error: 'tipo inválido (use missoes, conquistas, eventos ou historico)' });

  if (req.method === 'GET') {
    try {
      const resp = await fetch(`${SB_URL}/rest/v1/${cfg.nome}?order=${cfg.order}`, { headers });
      const data = await resp.json();
      if (!resp.ok) return res.status(resp.status).json({ error: data });
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err?.message || String(err) });
    }
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    if (!body.titulo || !String(body.titulo).trim()) return res.status(400).json({ error: 'Título é obrigatório' });
    if (tipo === 'eventos' && (!body.data_inicio || !body.data_fim)) return res.status(400).json({ error: 'Data de início e fim são obrigatórias' });
    try {
      const resp = await fetch(`${SB_URL}/rest/v1/${cfg.nome}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(cfg.defaults(body))
      });
      if (!resp.ok) {
        const detail = await resp.text();
        return res.status(resp.status).json({ error: 'Erro ao criar', detail });
      }
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err?.message || String(err) });
    }
  }

  if (req.method === 'PATCH') {
    const { id, ...campos } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id obrigatório' });
    const permitido = {};
    cfg.campos.forEach(k => {
      if (campos[k] === undefined) return;
      if (k === 'data_inicio' || k === 'data_fim') permitido[k] = new Date(campos[k]).toISOString();
      else if (k === 'criterio_valor' || k === 'pontos' || k === 'pontos_bonus') permitido[k] = Number(campos[k]) || 0;
      else permitido[k] = campos[k];
    });
    try {
      const resp = await fetch(`${SB_URL}/rest/v1/${cfg.nome}?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(permitido)
      });
      if (!resp.ok) {
        const detail = await resp.text();
        return res.status(resp.status).json({ error: 'Erro ao atualizar', detail });
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
      const resp = await fetch(`${SB_URL}/rest/v1/${cfg.nome}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { ...headers, Prefer: 'return=minimal' }
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
