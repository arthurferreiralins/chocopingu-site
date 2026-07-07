/* =========================================================
   SISTEMA DE CONTA — localStorage
   ========================================================= */
const AUTH_KEY = 'chocopingu_user';

function getUser()       { const r = localStorage.getItem(AUTH_KEY); return r ? JSON.parse(r) : null; }
function saveUser(u)     { localStorage.setItem(AUTH_KEY, JSON.stringify(u)); }
function clearUser()     { localStorage.removeItem(AUTH_KEY); }

function primeiraLetra(nome) { return nome ? nome.trim()[0].toUpperCase() : '?'; }

function renderNavAuth() {
  const navAuth = document.getElementById('navAuth');
  const user = getUser();
  if (user) {
    const avatarHtml = user.foto
      ? `<img src="${user.foto}" alt="${user.nome}" class="nav-user-avatar-img" referrerpolicy="no-referrer" />`
      : `<div class="nav-user-avatar">${primeiraLetra(user.nome)}</div>`;
    navAuth.innerHTML = `
      <div class="nav-user">
        ${avatarHtml}
        <span class="nav-user-nome">${user.nome.split(' ')[0]}</span>
        <button class="btn-sair" id="btnSair">Sair da conta</button>
      </div>`;
    document.getElementById('btnSair').addEventListener('click', () => {
      clearUser(); renderNavAuth();
    });
  } else {
    navAuth.innerHTML = '';
  }
}

/* Modal auth */
const modalAuth  = document.getElementById('modalAuth');
const fecharAuth = document.getElementById('fecharAuth');

function abrirAuth() {
  modalAuth.classList.add('aberto');
  document.body.style.overflow = 'hidden';
}
function fecharAuthModal() {
  modalAuth.classList.remove('aberto');
  document.body.style.overflow = '';
  limparMensagens();
}

function msg(id, texto, tipo) {
  const el = document.getElementById(id);
  el.textContent = texto;
  el.className = 'auth-msg ' + tipo;
  if (tipo === 'erro') setTimeout(() => { el.textContent = ''; el.className = 'auth-msg'; }, 3500);
}

function limparMensagens() {
  const el = document.getElementById('msgEntrar');
  if (el) { el.textContent = ''; el.className = 'auth-msg'; }
}

fecharAuth.addEventListener('click', fecharAuthModal);
modalAuth.addEventListener('click', e => { if (e.target === modalAuth) fecharAuthModal(); });

/* Entrar */
document.getElementById('btnEntrar').addEventListener('click', () => {
  const email = document.getElementById('entrarEmail').value.trim();
  const senha = document.getElementById('entrarSenha').value;
  const user  = getUser();
  if (!user) { msg('msgEntrar','Nenhuma conta encontrada. Crie uma conta primeiro.','erro'); return; }
  if (user.email !== email) { msg('msgEntrar','E-mail não encontrado.','erro'); return; }
  if (user.senha !== senha) { msg('msgEntrar','Senha incorreta.','erro'); return; }
  msg('msgEntrar', `Bem-vindo(a) de volta, ${user.nome.split(' ')[0]}!`, 'ok');
  setTimeout(() => { fecharAuthModal(); renderNavAuth(); }, 1000);
});

/* =========================================================
   GOOGLE SIGN-IN
   Substitua GOOGLE_CLIENT_ID pelo seu Client ID real do
   Google Cloud Console → APIs & Serviços → Credenciais
   ========================================================= */
const GOOGLE_CLIENT_ID = 'COLE_SEU_CLIENT_ID_AQUI';

function iniciarGoogleSignIn() {
  if (typeof google === 'undefined' || !GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'COLE_SEU_CLIENT_ID_AQUI') {
    msg('msgEntrar', 'Configure o Client ID do Google para ativar este login.', 'erro');
    return;
  }
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential,
    auto_select: false,
    cancel_on_tap_outside: true,
  });
  google.accounts.id.prompt();
}

function handleGoogleCredential(response) {
  try {
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    const user = {
      nome:   payload.name,
      email:  payload.email,
      foto:   payload.picture,
      google: true,
    };
    saveUser(user);
    fecharAuthModal();
    renderNavAuth();
  } catch {
    msg('msgEntrar', 'Erro ao processar login com Google. Tente novamente.', 'erro');
  }
}

document.getElementById('btnGoogleEntrar').addEventListener('click', iniciarGoogleSignIn);

/* Inicia navbar auth ao carregar */
renderNavAuth();

/* =========================================================
   CARRINHO DE COMPRAS
   ========================================================= */
let carrinho = [];

const carrinhoSidebar  = document.getElementById('carrinhoSidebar');
const carrinhoOverlay  = document.getElementById('carrinhoOverlay');
const carrinhoItensEl  = document.getElementById('carrinhoItens');
const carrinhoRodapeEl = document.getElementById('carrinhoRodape');
const carrinhoBadgeEl  = document.getElementById('carrinhoBadge');

function abrirCarrinho() {
  carrinhoSidebar.classList.add('aberto');
  carrinhoOverlay.classList.add('aberto');
  document.body.style.overflow = 'hidden';
  renderCarrinho();
}
function fecharCarrinho() {
  carrinhoSidebar.classList.remove('aberto');
  carrinhoOverlay.classList.remove('aberto');
  document.body.style.overflow = '';
}

document.getElementById('btnCarrinho').addEventListener('click', abrirCarrinho);
document.getElementById('fecharCarrinho').addEventListener('click', fecharCarrinho);
carrinhoOverlay.addEventListener('click', fecharCarrinho);

function adicionarAoCarrinho(nome, img, preco, pontos) {
  const idx = carrinho.findIndex(i => i.nome === nome);
  if (idx >= 0) {
    carrinho[idx].qtd++;
  } else {
    const item = { nome, img, preco: Number(preco) || 0, qtd: 1 };
    if (pontos) item.pontos = Number(pontos);
    carrinho.push(item);
  }
  atualizarBadge();
  flashBotao(nome);
  abrirCarrinho();
}

function removerItem(idx) {
  carrinho.splice(idx, 1);
  atualizarBadge();
  renderCarrinho();
}
function mudarQtd(idx, delta) {
  carrinho[idx].qtd += delta;
  if (carrinho[idx].qtd <= 0) carrinho.splice(idx, 1);
  atualizarBadge();
  renderCarrinho();
}

function atualizarBadge() {
  const total = carrinho.reduce((s, i) => s + i.qtd, 0);
  if (total > 0) {
    carrinhoBadgeEl.textContent = total;
    carrinhoBadgeEl.classList.remove('hidden');
    carrinhoBadgeEl.classList.add('pulsa');
    setTimeout(() => carrinhoBadgeEl.classList.remove('pulsa'), 400);
  } else {
    carrinhoBadgeEl.classList.add('hidden');
  }
}

function flashBotao(nome) {
  document.querySelectorAll('.btn-add-carrinho').forEach(btn => {
    if (btn.closest('.produto-info').querySelector('h3').textContent === nome) {
      btn.classList.add('adicionado');
      btn.textContent = '✓ Adicionado!';
      setTimeout(() => {
        btn.classList.remove('adicionado');
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Adicionar ao carrinho`;
      }, 1500);
    }
  });
}

function renderCarrinho() {
  if (carrinho.length === 0) {
    carrinhoItensEl.innerHTML = `
      <div class="carrinho-vazio">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        <p>Seu carrinho está vazio</p>
      </div>`;
    carrinhoRodapeEl.innerHTML = '';
    return;
  }

  carrinhoItensEl.innerHTML = carrinho.map((item, i) => `
    <div class="carrinho-item">
      <img src="${item.img}" alt="${item.nome}" />
      <div class="item-info">
        <h4>${item.nome}</h4>
        ${item.preco ? `<span class="item-preco">R$ ${(item.preco * item.qtd).toFixed(2).replace('.', ',')}</span>` : ''}
        <div class="item-qtd">
          <button onclick="mudarQtd(${i}, -1)">−</button>
          <span>${item.qtd}</span>
          <button onclick="mudarQtd(${i}, +1)">+</button>
        </div>
      </div>
      <button class="item-remover" onclick="removerItem(${i})" title="Remover">✕</button>
    </div>
  `).join('');

  const totalItens = carrinho.reduce((s, i) => s + i.qtd, 0);
  const totalValor = carrinho.reduce((s, i) => s + (i.preco || 0) * i.qtd, 0);
  carrinhoRodapeEl.innerHTML = `
    <div class="carrinho-total">
      <span>${totalItens} ${totalItens === 1 ? 'item' : 'itens'}</span>
      <strong>R$ ${totalValor.toFixed(2).replace('.', ',')}</strong>
    </div>
    <button class="btn-finalizar" onclick="irParaCheckout()">Finalizar pedido ›</button>
  `;
}

function irParaCheckout(modo) {
  if (carrinho.length === 0) return;
  localStorage.setItem('chocopingu_checkout_mode', modo || 'dinheiro');
  fecharCarrinho();
  abrirModalTipoChocolate();
}

/* =========================================================
   MODAL TIPO DE CHOCOLATE
   ========================================================= */
const TIPOS_CHOCO = ['Ao Leite', 'Meio Amargo', 'Branco'];

const modalTipoChoco   = document.getElementById('modalTipoChocolate');
const fecharTipoChocoBtn = document.getElementById('fecharTipoChocolate');

function abrirModalTipoChocolate() {
  const container = document.getElementById('tipoChocoItens');
  container.innerHTML = carrinho.map((item, i) => `
    <div class="tipo-choco-item" id="tipo-item-${i}">
      <img src="${item.img}" alt="${item.nome}" class="tipo-choco-img" />
      <div class="tipo-choco-info">
        <strong>${item.nome}</strong>
        <span class="tipo-choco-qtd">${item.qtd}x</span>
        <div class="tipo-choco-opcoes">
          ${TIPOS_CHOCO.map(t => `
            <button class="btn-tipo${item.tipo === t ? ' selecionado' : ''}"
              onclick="selecionarTipo(${i}, '${t}', this)">
              ${t}
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');

  atualizarBtnConfirmar();
  modalTipoChoco.classList.add('aberto');
  document.body.style.overflow = 'hidden';
}

function fecharModalTipoChocolate() {
  modalTipoChoco.classList.remove('aberto');
  document.body.style.overflow = '';
}

function atualizarBtnConfirmar() {
  const btn = document.getElementById('btnConfirmarTipo');
  const todosSelecionados = carrinho.every(i => i.tipo);
  btn.style.display = todosSelecionados ? 'block' : 'none';
}

window.selecionarTipo = function(idx, tipo, btn) {
  carrinho[idx].tipo = tipo;
  btn.closest('.tipo-choco-opcoes').querySelectorAll('.btn-tipo').forEach(b => b.classList.remove('selecionado'));
  btn.classList.add('selecionado');
  atualizarBtnConfirmar();
};

fecharTipoChocoBtn.addEventListener('click', fecharModalTipoChocolate);
modalTipoChoco.addEventListener('click', e => { if (e.target === modalTipoChoco) fecharModalTipoChocolate(); });

document.getElementById('btnConfirmarTipo').addEventListener('click', () => {
  localStorage.setItem('chocopingu_checkout_cart', JSON.stringify(
    carrinho.map(i => ({ nome: i.nome, img: i.img, preco: i.preco || 0, qtd: i.qtd, tipo: i.tipo, pontos: i.pontos }))
  ));
  window.location.href = 'pedido.html';
});

/* =========================================================
   ENDEREÇO RÁPIDO — localStorage
   ========================================================= */
const END_KEY = 'chocopingu_endereco';

function getEndereco()    { const r = localStorage.getItem(END_KEY); return r ? JSON.parse(r) : null; }
function salvarEndereco(e){ localStorage.setItem(END_KEY, JSON.stringify(e)); }

const modalEnd    = document.getElementById('modalEndereco');
const fecharEnd   = document.getElementById('fecharEndereco');

function abrirEndereco() {
  modalEnd.classList.add('aberto');
  document.body.style.overflow = 'hidden';
  preencherFormEndereco();
}
function fecharEnderecoModal() {
  modalEnd.classList.remove('aberto');
  document.body.style.overflow = '';
  document.getElementById('msgCep').textContent = '';
  document.getElementById('msgCep').className = 'cep-msg';
}

function preencherFormEndereco() {
  const end = getEndereco();
  if (!end) return;
  document.getElementById('endCep').value         = end.cep         || '';
  document.getElementById('endRua').value         = end.rua         || '';
  document.getElementById('endNumero').value      = end.numero      || '';
  document.getElementById('endComplemento').value = end.complemento || '';
  document.getElementById('endBairro').value      = end.bairro      || '';
  document.getElementById('endCidade').value      = end.cidade      || '';
  document.getElementById('endEstado').value      = end.estado      || '';
}

/* Formata CEP enquanto digita */
document.getElementById('endCep').addEventListener('input', e => {
  let v = e.target.value.replace(/\D/g,'').slice(0,8);
  if (v.length > 5) v = v.slice(0,5) + '-' + v.slice(5);
  e.target.value = v;
});

/* Busca CEP via ViaCEP */
document.getElementById('btnBuscarCep').addEventListener('click', async () => {
  const cep = document.getElementById('endCep').value.replace(/\D/g,'');
  const msgEl = document.getElementById('msgCep');
  if (cep.length !== 8) { msgEl.textContent = 'Digite um CEP com 8 dígitos.'; msgEl.className = 'cep-msg erro'; return; }
  msgEl.textContent = 'Buscando...'; msgEl.className = 'cep-msg';
  try {
    const res  = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();
    if (data.erro) { msgEl.textContent = 'CEP não encontrado.'; msgEl.className = 'cep-msg erro'; return; }
    document.getElementById('endRua').value    = data.logradouro || '';
    document.getElementById('endBairro').value = data.bairro     || '';
    document.getElementById('endCidade').value = data.localidade || '';
    document.getElementById('endEstado').value = data.uf         || '';
    msgEl.textContent = 'Endereço encontrado! Preencha o número.';
    msgEl.className = 'cep-msg';
    document.getElementById('endNumero').focus();
  } catch {
    msgEl.textContent = 'Erro ao buscar CEP. Verifique sua conexão.';
    msgEl.className = 'cep-msg erro';
  }
});

/* Salvar endereço */
document.getElementById('btnSalvarEndereco').addEventListener('click', () => {
  const end = {
    cep:         document.getElementById('endCep').value.trim(),
    rua:         document.getElementById('endRua').value.trim(),
    numero:      document.getElementById('endNumero').value.trim(),
    complemento: document.getElementById('endComplemento').value.trim(),
    bairro:      document.getElementById('endBairro').value.trim(),
    cidade:      document.getElementById('endCidade').value.trim(),
    estado:      document.getElementById('endEstado').value,
  };
  const msgEl = document.getElementById('msgEndereco');
  if (!end.rua || !end.numero || !end.bairro || !end.cidade || !end.estado) {
    msgEl.textContent = 'Preencha pelo menos Rua, Número, Bairro, Cidade e Estado.';
    msgEl.className = 'auth-msg erro'; return;
  }
  salvarEndereco(end);
  msgEl.textContent = 'Endereço salvo com sucesso!';
  msgEl.className = 'auth-msg ok';
  setTimeout(() => fecharEnderecoModal(), 1200);
});

/* Abrir via navbar */
document.getElementById('btnAbrirEndereco').addEventListener('click', e => { e.preventDefault(); abrirEndereco(); });
fecharEnd.addEventListener('click', fecharEnderecoModal);
modalEnd.addEventListener('click', e => { if (e.target === modalEnd) fecharEnderecoModal(); });

// Abas do catálogo
function mudarAba(aba) {
  const gridTodos = document.getElementById('gridTodos');
  const gridCopa  = document.getElementById('gridCopa');
  const tabTodos  = document.getElementById('tabTodos');
  const tabCopa   = document.getElementById('tabCopa');
  if (aba === 'copa') {
    gridTodos.classList.add('hidden');
    gridCopa.classList.remove('hidden');
    tabTodos.classList.remove('ativo');
    tabCopa.classList.add('ativo');
    renderCopaPaises();
  } else {
    gridCopa.classList.add('hidden');
    gridTodos.classList.remove('hidden');
    tabCopa.classList.remove('ativo');
    tabTodos.classList.add('ativo');
  }
}

/* =========================================================
   COPA DO MUNDO 2026 — SISTEMA DE VOTAÇÃO
   ========================================================= */
const COPA_VOTOS_KEY = 'chocopingu_copa_votos';
const COPA_MEU_KEY   = 'chocopingu_copa_meu_voto';

const copaSelecoes = [
  { id:'bra', nome:'Brasil',          flag:'🇧🇷' },
  { id:'arg', nome:'Argentina',       flag:'🇦🇷' },
  { id:'fra', nome:'França',          flag:'🇫🇷' },
  { id:'ger', nome:'Alemanha',        flag:'🇩🇪' },
  { id:'esp', nome:'Espanha',         flag:'🇪🇸' },
  { id:'eng', nome:'Inglaterra',      flag:'🇬🇧' },
  { id:'por', nome:'Portugal',        flag:'🇵🇹' },
  { id:'ned', nome:'Holanda',         flag:'🇳🇱' },
  { id:'ita', nome:'Itália',          flag:'🇮🇹' },
  { id:'bel', nome:'Bélgica',         flag:'🇧🇪' },
  { id:'cro', nome:'Croácia',         flag:'🇭🇷' },
  { id:'pol', nome:'Polônia',         flag:'🇵🇱' },
  { id:'sui', nome:'Suíça',           flag:'🇨🇭' },
  { id:'din', nome:'Dinamarca',       flag:'🇩🇰' },
  { id:'tur', nome:'Turquia',         flag:'🇹🇷' },
  { id:'ser', nome:'Sérvia',          flag:'🇷🇸' },
  { id:'aut', nome:'Áustria',         flag:'🇦🇹' },
  { id:'usa', nome:'EUA',             flag:'🇺🇸' },
  { id:'can', nome:'Canadá',          flag:'🇨🇦' },
  { id:'mex', nome:'México',          flag:'🇲🇽' },
  { id:'col', nome:'Colômbia',        flag:'🇨🇴' },
  { id:'uru', nome:'Uruguai',         flag:'🇺🇾' },
  { id:'ecu', nome:'Equador',         flag:'🇪🇨' },
  { id:'ven', nome:'Venezuela',       flag:'🇻🇪' },
  { id:'par', nome:'Paraguai',        flag:'🇵🇾' },
  { id:'crc', nome:'Costa Rica',      flag:'🇨🇷' },
  { id:'jam', nome:'Jamaica',         flag:'🇯🇲' },
  { id:'mar', nome:'Marrocos',        flag:'🇲🇦' },
  { id:'sen', nome:'Senegal',         flag:'🇸🇳' },
  { id:'nig', nome:'Nigéria',         flag:'🇳🇬' },
  { id:'gha', nome:'Gana',            flag:'🇬🇭' },
  { id:'civ', nome:'Costa do Marfim', flag:'🇨🇮' },
  { id:'cam', nome:'Camarões',        flag:'🇨🇲' },
  { id:'alg', nome:'Argélia',         flag:'🇩🇿' },
  { id:'jap', nome:'Japão',           flag:'🇯🇵' },
  { id:'cor', nome:'Coreia do Sul',   flag:'🇰🇷' },
  { id:'sau', nome:'Arábia Saudita',  flag:'🇸🇦' },
  { id:'ira', nome:'Irã',             flag:'🇮🇷' },
  { id:'aust',nome:'Austrália',       flag:'🇦🇺' },
];

function getVotosCopa()  { const r = localStorage.getItem(COPA_VOTOS_KEY); return r ? JSON.parse(r) : {}; }
function getMeuVotoCopa(){ return localStorage.getItem(COPA_MEU_KEY); }

function votarCopa(id) {
  if (getMeuVotoCopa()) return;
  const votos = getVotosCopa();
  votos[id] = (votos[id] || 0) + 1;
  localStorage.setItem(COPA_VOTOS_KEY, JSON.stringify(votos));
  localStorage.setItem(COPA_MEU_KEY, id);
  renderCopaPaises();
}

function mudarVotoCopa() {
  const anterior = getMeuVotoCopa();
  if (!anterior) return;
  const votos = getVotosCopa();
  if (votos[anterior] > 0) votos[anterior]--;
  localStorage.setItem(COPA_VOTOS_KEY, JSON.stringify(votos));
  localStorage.removeItem(COPA_MEU_KEY);
  renderCopaPaises();
}

function renderCopaPaises() {
  const grid = document.getElementById('copaPaisesGrid');
  if (!grid) return;

  const votos   = getVotosCopa();
  const meuVoto = getMeuVotoCopa();
  const total   = Object.values(votos).reduce((s, v) => s + v, 0);
  const jaVotou = !!meuVoto;

  const totalEl = document.getElementById('copaTotalVotos');
  if (totalEl) totalEl.textContent = total.toLocaleString('pt-BR');

  const infoEl = document.getElementById('copaVotadoInfo');
  const nomeEl = document.getElementById('copaVotadoNome');
  const flagEl = document.getElementById('copaVotadoFlag');
  if (infoEl) {
    if (jaVotou) {
      const p = copaSelecoes.find(x => x.id === meuVoto);
      if (p) { if (nomeEl) nomeEl.textContent = p.nome; if (flagEl) flagEl.textContent = p.flag; }
      infoEl.classList.remove('hidden');
    } else {
      infoEl.classList.add('hidden');
    }
  }

  if (jaVotou) grid.classList.add('ja-votou');
  else grid.classList.remove('ja-votou');

  grid.innerHTML = copaSelecoes.map(p => {
    const qtd  = votos[p.id] || 0;
    const pct  = total > 0 ? ((qtd / total) * 100).toFixed(1) : '0.0';
    const isMe = meuVoto === p.id;

    const corpo = jaVotou
      ? `<div class="copa-barra-wrap"><div class="copa-barra" style="width:${pct}%"></div></div>
         <div class="copa-pais-pct">${pct}% &middot; ${qtd} voto${qtd !== 1 ? 's' : ''}</div>
         ${isMe ? '<div class="copa-check">&#10003; Seu voto</div>' : ''}`
      : `<div class="copa-pais-btn">Votar &#9917;</div>`;

    return `<div class="copa-pais-card${isMe ? ' meu-voto' : ''}"
              ${!jaVotou ? `onclick="votarCopa('${p.id}')"` : ''}>
              <div class="copa-pais-flag">${p.flag}</div>
              <div class="copa-pais-nome">${p.nome}</div>
              ${corpo}
            </div>`;
  }).join('');
}

// Cursor personalizado
const dot  = document.getElementById('cursorDot');
const ring = document.getElementById('cursorRing');
document.addEventListener('mousemove', e => {
  dot.style.left  = e.clientX + 'px';
  dot.style.top   = e.clientY + 'px';
  ring.style.left = e.clientX + 'px';
  ring.style.top  = e.clientY + 'px';
});
document.addEventListener('mousedown', () => dot.style.transform = 'translate(-50%,-50%) scale(0.7)');
document.addEventListener('mouseup',   () => dot.style.transform = 'translate(-50%,-50%) scale(1)');

// Scroll reveal: elementos aparecem rápido ao entrar na tela (descendo ou subindo)
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => entry.target.classList.toggle('mostrar', entry.isIntersecting));
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Navbar: transparente no hero, sólida ao scrollar
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

// Menu mobile
const toggle   = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
toggle.addEventListener('click', () => navLinks.classList.toggle('aberto'));
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('aberto')));

// Modal Chocopontos
const modal        = document.getElementById('modalChocopontos');
const fecharModal  = document.getElementById('fecharModal');

function abrirModal() {
  modal.classList.add('aberto');
  document.body.style.overflow = 'hidden';
  navLinks.classList.remove('aberto');
}
function fechar() {
  modal.classList.remove('aberto');
  document.body.style.overflow = '';
}

document.getElementById('btnChocopontos').addEventListener('click', e => { e.preventDefault(); abrirModal(); });
document.getElementById('btnChocopontosBanner').addEventListener('click', abrirModal);
fecharModal.addEventListener('click', fechar);
modal.addEventListener('click', e => { if (e.target === modal) fechar(); });

/* ===== CHOCOPONTOS: consultar saldo pelo CPF dentro do modal ===== */
const cpfSaldoInput = document.getElementById('cpfSaldoChocopontos');
const saldoResultEl = document.getElementById('saldoChocopontosModal');

cpfSaldoInput.addEventListener('input', function () {
  let v = this.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 9) v = v.slice(0, 3) + '.' + v.slice(3, 6) + '.' + v.slice(6, 9) + '-' + v.slice(9);
  else if (v.length > 6) v = v.slice(0, 3) + '.' + v.slice(3, 6) + '.' + v.slice(6);
  else if (v.length > 3) v = v.slice(0, 3) + '.' + v.slice(3);
  this.value = v;
  saldoResultEl.style.display = 'none';
});

async function verSaldoChocopontos() {
  const cpf = cpfSaldoInput.value.replace(/\D/g, '');
  if (cpf.length !== 11) {
    saldoResultEl.style.display = 'block';
    saldoResultEl.style.background = '#fff0f0';
    saldoResultEl.style.color = '#c62828';
    saldoResultEl.textContent = 'Digite um CPF válido (11 dígitos).';
    return;
  }
  try {
    const resp = await fetch('/api/chocopontos-saldo?cpf=' + cpf);
    const data = await resp.json();
    saldoResultEl.style.display = 'block';
    if (!resp.ok) {
      saldoResultEl.style.background = '#fff0f0';
      saldoResultEl.style.color = '#c62828';
      saldoResultEl.textContent = 'Não foi possível consultar seu saldo agora.';
      return;
    }
    saldoResultEl.style.background = '#e6f4ec';
    saldoResultEl.style.color = '#1a7a3a';
    saldoResultEl.textContent = 'Você tem ' + data.saldo + ' chocoponto(s)!';
  } catch (e) {
    saldoResultEl.style.display = 'block';
    saldoResultEl.style.background = '#fff0f0';
    saldoResultEl.style.color = '#c62828';
    saldoResultEl.textContent = 'Não foi possível consultar seu saldo agora.';
  }
}
document.getElementById('btnVerSaldoChocopontos').addEventListener('click', verSaldoChocopontos);
cpfSaldoInput.addEventListener('keydown', e => { if (e.key === 'Enter') verSaldoChocopontos(); });

/* ===== CHOCOPONTOS: leva pro carrinho normal, pagamento vira uma aba no checkout ===== */
function comprarChocopontos(id, pontos) {
  var p = (typeof PRODS_DEF !== 'undefined') ? PRODS_DEF.find(function (x) { return x.id === id; }) : null;
  if (!p) return;
  carrinho = [];
  adicionarAoCarrinho(p.nome, p.img, p.preco, pontos);
  fechar();
  irParaCheckout('chocopontos');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { fechar(); fecharAuthModal(); fecharEnderecoModal(); fecharCarrinho(); fecharVideo(); fecharModalTipoChocolate(); } });

/* ===== CONTADOR ANIMADO ===== */
function animarContador(el) {
  const meta = parseInt(el.dataset.meta);
  const duracao = 1800;
  const inicio = performance.now();
  function tick(agora) {
    const progresso = Math.min((agora - inicio) / duracao, 1);
    const ease = 1 - Math.pow(1 - progresso, 3);
    el.textContent = Math.floor(ease * meta);
    if (progresso < 1) requestAnimationFrame(tick);
    else el.textContent = meta;
  }
  requestAnimationFrame(tick);
}
const obsContador = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { animarContador(e.target); obsContador.unobserve(e.target); } });
}, { threshold: 0.5 });
document.querySelectorAll('.contador-num').forEach(el => obsContador.observe(el));

/* ===== MODAL VÍDEO CACAU ===== */
const modalVideo  = document.getElementById('modalVideo');
const playerCacau = document.getElementById('playerCacau');

function abrirVideo() {
  modalVideo.classList.add('aberto');
  document.body.style.overflow = 'hidden';
}
function fecharVideo() {
  modalVideo.classList.remove('aberto');
  playerCacau.pause();
  document.body.style.overflow = '';
}

document.getElementById('btnAbrirVideo').addEventListener('click', abrirVideo);
document.getElementById('fecharVideo').addEventListener('click', fecharVideo);
modalVideo.addEventListener('click', e => { if (e.target === modalVideo) fecharVideo(); });

/* ===== INSTAGRAM: feed de posts (embed oficial via embed.js, sem scraping/API) ===== */
function processarEmbedsInstagram(tentativas) {
  if (window.instgrm && window.instgrm.Embeds) {
    window.instgrm.Embeds.process();
  } else if (tentativas > 0) {
    // embed.js carrega async e pode ainda não estar pronto quando os posts chegam da API
    setTimeout(() => processarEmbedsInstagram(tentativas - 1), 300);
  }
}

async function carregarInstagram() {
  const grid = document.getElementById('instagramGrid');
  if (!grid) return;
  try {
    const resp = await fetch('/api/instagram-posts');
    const data = await resp.json();
    if (!resp.ok || !Array.isArray(data) || data.length === 0) {
      grid.innerHTML = '<p class="instagram-empty">Em breve, novidades por aqui! Enquanto isso, siga <a href="https://www.instagram.com/lojadopingu" target="_blank" rel="noopener">@lojadopingu</a>.</p>';
      return;
    }
    grid.innerHTML = data.map(p =>
      `<div class="instagram-card"><blockquote class="instagram-media" data-instgrm-permalink="${p.url}" data-instgrm-version="14" style="margin:0 auto;"></blockquote></div>`
    ).join('');
    processarEmbedsInstagram(10);
  } catch (e) {
    grid.innerHTML = '<p class="instagram-empty">Não foi possível carregar o Instagram agora.</p>';
  }
}
carregarInstagram();

