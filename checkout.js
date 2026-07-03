(function () {
  var CART_KEY = 'chocopingu_checkout_cart';
  var PK = 'pk_Z3gzlVhQQU7ejpGY';

  var cart = [];
  var cartTotal = 0;
  var metodoAtivo = 'pix';

  function fmt(n) { return 'R$ ' + Number(n).toFixed(2).replace('.', ','); }

  // ── CARRINHO ──────────────────────────────────────────────
  function carregarCarrinho() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      cart = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(cart) || cart.length === 0) {
        window.location.href = 'index.html';
        return false;
      }
    } catch (e) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }

  function renderResumo() {
    var el = document.getElementById('resumoItens');
    var totalEl = document.getElementById('resumoTotal');
    cartTotal = 0;
    el.innerHTML = cart.map(function (it) {
      var sub = Number(it.preco) * Number(it.qtd);
      cartTotal += sub;
      return '<div class="resumo-item">' +
        '<img src="' + it.img + '" alt="' + it.nome + '">' +
        '<div class="resumo-info"><span>' + it.nome + '</span>' +
        (it.tipo ? '<small class="resumo-tipo">' + it.tipo + '</small>' : '') +
        '<small>' + it.qtd + 'x ' + fmt(it.preco) + '</small></div>' +
        '<strong>' + fmt(sub) + '</strong>' +
        '</div>';
    }).join('');
    totalEl.textContent = fmt(cartTotal);
  }

  // ── TOKENIZAR CARTÃO ──────────────────────────────────────
  async function tokenizarCartao() {
    var numero = document.getElementById('fCardNum').value.replace(/\D/g, '');
    var nome = document.getElementById('fCardNome').value.trim().toUpperCase();
    var valRaw = document.getElementById('fCardVal').value.replace(/\D/g, '');
    var cvv = document.getElementById('fCardCvv').value.trim();

    var resp = await fetch('https://api.pagar.me/core/v5/tokens?appId=' + PK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'card',
        card: {
          number: numero,
          holder_name: nome,
          exp_month: parseInt(valRaw.slice(0, 2), 10),
          exp_year: parseInt(valRaw.slice(2), 10),
          cvv: cvv
        }
      })
    });
    var data = await resp.json();
    if (!resp.ok) {
      var msg = (data.errors && data.errors[0] && data.errors[0].message) || 'Dados do cartão inválidos.';
      throw new Error(msg);
    }
    return data.id;
  }

  var PONTOS_MAP = { 'Barra Coração': 8, 'Barra Normal': 10, 'Pirulitos': 4, 'Boneco Animais': 8 };

  // ── FINALIZAR PAGAMENTO ───────────────────────────────────
  async function finalizarPagamento() {
    showErro('');
    if (!validarForm(metodoAtivo)) return;
    if (metodoAtivo === 'cartao' && !validarCartao()) return;

    var btn = document.getElementById('btnPagar');
    btn.disabled = true;
    btn.textContent = 'Processando...';

    var cliente = {
      nome: document.getElementById('fNome').value.trim(),
      email: document.getElementById('fEmail').value.trim(),
      cpf: document.getElementById('fCpf').value.trim(),
      whatsapp: document.getElementById('fWhatsapp').value.trim(),
      endereco: {
        cep: document.getElementById('fCep').value.trim(),
        rua: document.getElementById('fRua').value.trim(),
        numero: document.getElementById('fNumero').value.trim(),
        complemento: document.getElementById('fComplemento').value.trim(),
        bairro: document.getElementById('fBairro').value.trim(),
        cidade: document.getElementById('fCidade').value.trim(),
        estado: document.getElementById('fEstado').value
      }
    };

    if (metodoAtivo === 'chocopontos') {
      var payloadPontos = {
        itens: cart.map(function (it) { return { nome: it.nome, qtd: it.qtd, pontos: (it.pontos || PONTOS_MAP[it.nome] || 0) * it.qtd }; }),
        cliente: cliente
      };
      try {
        var respP = await fetch('/api/chocopontos-resgate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadPontos)
        });
        var dataP = await respP.json();
        if (!respP.ok) {
          showErro(dataP.error || 'Erro ao registrar resgate. Tente novamente.');
          btn.disabled = false;
          btn.textContent = labelBtn(metodoAtivo);
          return;
        }
        localStorage.removeItem(CART_KEY);
        localStorage.removeItem('chocopingu_checkout_mode');
        showResultado('chocopontos', dataP);
      } catch (e) {
        showErro('Erro de conexão. Verifique sua internet e tente novamente.');
        btn.disabled = false;
        btn.textContent = labelBtn(metodoAtivo);
      }
      return;
    }

    var payload = {
      itens: cart.map(function (it) { return { nome: it.nome, preco: it.preco, qtd: it.qtd, tipo: it.tipo || '' }; }),
      cliente: cliente,
      metodo: metodoAtivo
    };

    if (metodoAtivo === 'cartao') {
      try {
        payload.card_token = await tokenizarCartao();
        payload.parcelas = parseInt(document.getElementById('fParcelas').value, 10) || 1;
      } catch (e) {
        showErro(e.message);
        btn.disabled = false;
        btn.textContent = labelBtn(metodoAtivo);
        return;
      }
    }

    try {
      var resp = await fetch('/api/pagarme-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = await resp.json();

      if (!resp.ok) {
        showErro(data.error || 'Erro ao processar pagamento. Tente novamente.');
        btn.disabled = false;
        btn.textContent = labelBtn(metodoAtivo);
        return;
      }

      localStorage.removeItem(CART_KEY);
      showResultado(metodoAtivo, data);
    } catch (e) {
      showErro('Erro de conexão. Verifique sua internet e tente novamente.');
      btn.disabled = false;
      btn.textContent = labelBtn(metodoAtivo);
    }
  }

  function labelBtn(m) {
    return m === 'pix' ? 'Gerar PIX' : m === 'boleto' ? 'Gerar Boleto' : m === 'chocopontos' ? 'Confirmar resgate' : 'Pagar com Cartão';
  }

  // ── ERROS ─────────────────────────────────────────────────
  function showErro(msg) {
    var el = document.getElementById('erroMsg');
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
    if (msg) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ── RESULTADO ─────────────────────────────────────────────
  function showResultado(metodo, data) {
    document.getElementById('formCheckout').style.display = 'none';
    var el = document.getElementById('resultado');
    var html = '';

    if (metodo === 'pix') {
      html = '<div class="resultado-box">' +
        '<div class="resultado-icone">&#10003;</div>' +
        '<h2>PIX gerado!</h2>' +
        '<p>Pedido <strong>#' + (data.order_id || '') + '</strong></p>' +
        '<p class="resultado-sub">Escaneie o QR Code ou copie o código abaixo</p>' +
        (data.pix_qr_code_url ? '<img src="' + data.pix_qr_code_url + '" alt="QR Code PIX" class="pix-qr">' : '') +
        '<div class="codigo-wrap">' +
        '<input type="text" id="codigoPix" value="' + (data.pix_qr_code || '') + '" readonly>' +
        '<button onclick="window.copiarCodigo(\'codigoPix\')" class="btn-copiar">Copiar</button>' +
        '</div>' +
        '<div class="resultado-info">O código expira em 1 hora. Após o pagamento, entraremos em contato para combinar a entrega.</div>' +
        '</div>';
    } else if (metodo === 'boleto') {
      html = '<div class="resultado-box">' +
        '<div class="resultado-icone">&#10003;</div>' +
        '<h2>Boleto gerado!</h2>' +
        '<p>Pedido <strong>#' + (data.order_id || '') + '</strong></p>' +
        '<div class="codigo-wrap">' +
        '<input type="text" id="codigoBoleto" value="' + (data.boleto_linha || '') + '" readonly>' +
        '<button onclick="window.copiarCodigo(\'codigoBoleto\')" class="btn-copiar">Copiar linha</button>' +
        '</div>' +
        (data.boleto_pdf ? '<a href="' + data.boleto_pdf + '" target="_blank" class="btn-boleto-pdf">Abrir PDF do boleto</a>' : '') +
        '<div class="resultado-info">Vencimento em 3 dias. Pague em qualquer banco, lotérica ou aplicativo. Compensação em até 3 dias úteis.</div>' +
        '</div>';
    } else if (metodo === 'chocopontos') {
      html = '<div class="resultado-box">' +
        '<div class="resultado-icone">&#11088;</div>' +
        '<h2>Resgate registrado!</h2>' +
        '<p>Pedido <strong>#' + (data.order_id || '') + '</strong></p>' +
        '<div class="resultado-info">Seu resgate com Chocopontos foi registrado, sem nenhuma cobrança. Vamos entrar em contato para combinar a entrega.</div>' +
        '</div>';
    } else if (metodo === 'cartao') {
      var ok = data.charge_status === 'paid';
      html = '<div class="resultado-box' + (ok ? '' : ' resultado-pendente') + '">' +
        '<div class="resultado-icone">' + (ok ? '&#10003;' : '!') + '</div>' +
        '<h2>' + (ok ? 'Pagamento aprovado!' : 'Pagamento em análise') + '</h2>' +
        '<p>Pedido <strong>#' + (data.order_id || '') + '</strong></p>' +
        (data.brand ? '<p class="resultado-sub">' + data.brand.toUpperCase() + ' •••• ' + (data.last_four || '') + '</p>' : '') +
        '<div class="resultado-info">' + (ok
          ? 'Seu pedido foi confirmado! Entraremos em contato pelo WhatsApp para combinar a entrega.'
          : 'Seu pagamento está sendo processado. Você receberá uma confirmação por e-mail em breve.') +
        '</div>' +
        '</div>';
    }

    el.innerHTML = html;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth' });
  }

  window.copiarCodigo = function (id) {
    var v = document.getElementById(id).value;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(v).then(function () { alert('Copiado!'); });
    } else {
      var el = document.getElementById(id);
      el.select();
      document.execCommand('copy');
      alert('Copiado!');
    }
  };

  // ── SELEÇÃO DE MÉTODO ─────────────────────────────────────
  window.selecionarMetodo = function (m) {
    metodoAtivo = m;
    document.querySelectorAll('.metodo-btn').forEach(function (b) { b.classList.remove('ativo'); });
    document.getElementById('metodo-' + m).classList.add('ativo');
    document.querySelectorAll('.metodo-form').forEach(function (f) { f.style.display = 'none'; });
    var fm = document.getElementById('form-' + m);
    if (fm) fm.style.display = 'block';
    document.getElementById('btnPagar').textContent = labelBtn(m);
    document.getElementById('tituloForma').textContent = m === 'chocopontos' ? 'Você paga com Chocopontos ⭐' : 'Forma de pagamento';
    document.getElementById('txtFreteAviso').textContent = m === 'chocopontos'
      ? 'entraremos em contato para combinar a entrega do seu resgate.'
      : 'entraremos em contato após a confirmação do pagamento.';
    showErro('');
  };

  // ── VALIDAÇÕES ────────────────────────────────────────────
  function validarForm(metodo) {
    var campos = [
      ['fNome', 'Nome completo'],
      ['fCep', 'CEP'],
      ['fRua', 'Rua'],
      ['fNumero', 'Número'],
      ['fBairro', 'Bairro'],
      ['fCidade', 'Cidade']
    ];
    if (metodo !== 'chocopontos') {
      campos.splice(1, 0, ['fEmail', 'E-mail'], ['fCpf', 'CPF'], ['fWhatsapp', 'WhatsApp']);
    }
    for (var i = 0; i < campos.length; i++) {
      var el = document.getElementById(campos[i][0]);
      if (!el.value.trim()) {
        el.focus();
        showErro('Preencha o campo: ' + campos[i][1]);
        return false;
      }
    }
    if (metodo !== 'chocopontos') {
      var cpf = document.getElementById('fCpf').value.replace(/\D/g, '');
      if (cpf.length < 11) { showErro('CPF inválido. Digite os 11 dígitos.'); return false; }
    }
    return true;
  }

  function validarCartao() {
    var num = document.getElementById('fCardNum').value.replace(/\D/g, '');
    if (num.length < 13) { showErro('Número do cartão inválido.'); return false; }
    if (!document.getElementById('fCardNome').value.trim()) { showErro('Nome impresso no cartão é obrigatório.'); return false; }
    var val = document.getElementById('fCardVal').value.replace(/\D/g, '');
    if (val.length < 6) { showErro('Validade inválida. Use MM/AAAA.'); return false; }
    var cvv = document.getElementById('fCardCvv').value.replace(/\D/g, '');
    if (cvv.length < 3) { showErro('CVV inválido.'); return false; }
    return true;
  }

  // ── MÁSCARAS E CEP ────────────────────────────────────────
  document.getElementById('fCep').addEventListener('blur', async function () {
    var cep = this.value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      var res = await fetch('https://viacep.com.br/ws/' + cep + '/json/');
      var d = await res.json();
      if (!d.erro) {
        document.getElementById('fRua').value = d.logradouro || '';
        document.getElementById('fBairro').value = d.bairro || '';
        document.getElementById('fCidade').value = d.localidade || '';
        document.getElementById('fEstado').value = d.uf || '';
        document.getElementById('fNumero').focus();
      }
    } catch (e) {}
  });

  document.getElementById('fCep').addEventListener('input', function () {
    var v = this.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
    this.value = v;
  });

  document.getElementById('fCpf').addEventListener('input', function () {
    var v = this.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9) v = v.slice(0, 3) + '.' + v.slice(3, 6) + '.' + v.slice(6, 9) + '-' + v.slice(9);
    else if (v.length > 6) v = v.slice(0, 3) + '.' + v.slice(3, 6) + '.' + v.slice(6);
    else if (v.length > 3) v = v.slice(0, 3) + '.' + v.slice(3);
    this.value = v;
  });

  document.getElementById('fCardNum').addEventListener('input', function () {
    var v = this.value.replace(/\D/g, '').slice(0, 16);
    this.value = v.replace(/(\d{4})(?=\d)/g, '$1 ');
  });

  document.getElementById('fCardVal').addEventListener('input', function () {
    var v = this.value.replace(/\D/g, '').slice(0, 6);
    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
    this.value = v;
  });

  document.getElementById('fCardCvv').addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 4);
  });

  document.getElementById('btnPagar').addEventListener('click', finalizarPagamento);

  // ── INIT ──────────────────────────────────────────────────
  if (carregarCarrinho()) {
    renderResumo();
    var modoResgate = localStorage.getItem('chocopingu_checkout_mode') === 'chocopontos';
    if (modoResgate) {
      document.getElementById('metodo-pix').style.display = 'none';
      document.getElementById('metodo-boleto').style.display = 'none';
      document.getElementById('metodo-cartao').style.display = 'none';
      selecionarMetodo('chocopontos');
    } else {
      document.getElementById('metodo-chocopontos').style.display = 'none';
      selecionarMetodo('pix');
    }
  }
})();
