// Navegação entre telas (SPA sem roteador): mapa das telas, mostrarTela/irParaTela, botão Voltar e links do rodapé.

import { Anim } from '../components/animations/animacoes.js';
import { notificacoesEl } from '../components/notifications/elementos.js';
import { btnConfig, btnSair, telas } from './elementos.js';
import { state } from '../state/appState.js';

const linkAdmin = document.getElementById('link-admin');

// Mostra só a tela pedida, escondendo as demais (classe "oculta" vem
// do CSS com "display: none !important"). Sair/Configurações/link de
// admin dependem de quem está logado (usuarioTipoAtual), não do nome
// da tela — assim continuam corretos mesmo em telas "de passagem"
// como Sobre/Ajuda, que podem ser abertas tanto logado quanto não.
export function mostrarTela(nome) {
  Object.entries(telas).forEach(([chave, el]) => el.classList.toggle('oculta', chave !== nome));
  const logado = !!state.usuarioTipoAtual;
  btnSair.classList.toggle('oculto', !logado);
  if (btnConfig) btnConfig.classList.toggle('oculto', state.usuarioTipoAtual !== 'cliente' && state.usuarioTipoAtual !== 'prestador');
  if (notificacoesEl) notificacoesEl.classList.toggle('oculto', state.usuarioTipoAtual !== 'cliente' && state.usuarioTipoAtual !== 'prestador');
  if (linkAdmin) linkAdmin.classList.toggle('oculto', logado);
}

// Volta para o painel de quem estiver logado (cliente/prestador/admin)
// ou para a tela de login, se ninguém estiver — usado pelo clique no
// logo e por todos os botões "Voltar" das telas institucionais/admin.
function voltarTelaPrincipal() {
  if (state.usuarioTipoAtual === 'cliente') irParaTela('cliente');
  else if (state.usuarioTipoAtual === 'prestador') irParaTela('prestador');
  else if (state.usuarioTipoAtual === 'admin') irParaTela('admin');
  else irParaTela('auth');
}

// Versão animada de mostrarTela: a tela atual some suavemente (150ms) e
// então a nova entra (a entrada é o CSS de .tela / .tela-aux). Usada nas
// trocas iniciadas pelo usuário; fluxos que precisam da tela visível na
// hora (ex.: iniciar painéis com mapa) continuam chamando mostrarTela.
let trocaDeTelaId = 0;

// Troca de tela com animação: a tela atual some suavemente e só então a nova
// aparece. O contador evita que cliques rápidos mostrem telas fora de ordem.
export async function irParaTela(nome) {
  const id = ++trocaDeTelaId;
  const atual = Object.values(telas).find((el) => !el.classList.contains('oculta'));
  if (atual && atual !== telas[nome]) await Anim.sair(atual);
  if (id === trocaDeTelaId) mostrarTela(nome);
}

// Clique no logo/marca: vai para a tela principal (painel do usuário
// se estiver logado, ou tela de autenticação se não estiver).
const marcaEl = document.querySelector('.marca');

if (marcaEl) {
  marcaEl.addEventListener('click', voltarTelaPrincipal);
}

// Todo botão "Voltar" (telas institucionais, login de admin,
// "esqueci minha senha") tem a mesma classe e o mesmo destino: volta
// para o painel de quem estiver logado, ou para o login.
document.querySelectorAll('.btn-voltar').forEach((botao) => {
  botao.addEventListener('click', voltarTelaPrincipal);
});

// Links do rodapé (Sobre/Ajuda/Termos/Privacidade/Acesso
// administrativo) — delegação num único listener no <nav>, todos
// usando o atributo "data-tela" com o nome da tela a abrir.
document.querySelectorAll('.rodape-links, .lp-flinks').forEach((rodapeLinks) => {
  rodapeLinks.addEventListener('click', (e) => {
    const link = e.target.closest('[data-tela]');
    if (!link) return;
    e.preventDefault();
    irParaTela(link.dataset.tela);
  });
});
