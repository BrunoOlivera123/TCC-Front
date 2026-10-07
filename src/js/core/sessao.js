// Sessão do usuário: entrar em um painel, sair (logout) e tratar sessão expirada.

import { EVENTO_SESSAO_EXPIRADA } from '../services/api/client.js';
import { Anim } from '../components/animations/animacoes.js';
import { toast } from '../components/feedback/toast.js';
import { reiniciarNotificacoes } from '../components/notifications/centralNotificacoes.js';
import { pararAtualizacaoAutomatica } from './atualizacao.js';
import { btnSair, telas } from './elementos.js';
import { mostrarTela } from './telas.js';
import { adminLoginEl, adminPainelEl } from '../pages/admin/elementos.js';
import { iniciarPainelAdmin } from '../pages/admin/painelAdmin.js';
import { prepararBotaoGoogle } from '../pages/auth/loginGoogle.js';
import { clienteHistoricoEl, detalhesEl, linhaTempoClienteEl } from '../pages/cliente/elementos.js';
import { iniciarPainelCliente } from '../pages/cliente/painelCliente.js';
import { listaDisponiveisEl, modalCancelarAtendimento, prestadorChamadoDetalhesEl, prestadorComChamadoEl, prestadorHistoricoEl, prestadorLinhaTempoEl, prestadorListaAvaliacoesEl } from '../pages/prestador/elementos.js';
import { iniciarPainelPrestador } from '../pages/prestador/painelPrestador.js';
import { authApi } from '../services/api/auth.js';
import { authStorage } from '../services/storage/authStorage.js';
import { state } from '../state/appState.js';

// Depois de login/cadastro bem-sucedido, decide qual painel abrir, de
// acordo com o tipo de usuário.
export function entrarComoUsuario(tipo, usuario) {
  state.usuarioTipoAtual = tipo;
  state.ultimoUsuario = usuario;
  if (tipo === 'cliente') iniciarPainelCliente(usuario);
  else if (tipo === 'prestador') iniciarPainelPrestador(usuario);
  else if (tipo === 'admin') iniciarPainelAdmin();
}

// Botão "Sair": avisa a API (para invalidar o token no servidor),
// apaga o token local e volta para a tela de login. Funciona para
// cliente, prestador OU admin — o backend só olha o token, não o tipo.
btnSair.addEventListener('click', async () => {
  // A tela atual some suavemente ainda preenchida; só então limpamos tudo.
  const atual = Object.values(telas).find((el) => !el.classList.contains('oculta'));
  await Anim.sair(atual);
  const pedido = authApi.logout().catch(() => {
    // Mesmo que o logout no servidor falhe (ex.: sessão já expirada),
    // seguimos limpando o token local e voltando para o login.
  });
  encerrarSessaoLocal();
  mostrarTela('auth'); // a tela de login entra com a animação padrão
  await pedido;
  authStorage.definirToken(null);
});

// Zera tudo o que a interface guardava de quem estava logado: para o
// polling e o GPS, esquece o usuário e limpa as listas da tela (para a
// próxima pessoa que entrar neste navegador não ver, nem por um instante,
// o histórico da anterior). Usada no "Sair" e quando a sessão expira.
function encerrarSessaoLocal() {
  // Pede ao Google para não "relogar" sozinho a mesma conta (auto-select do One
  // Tap): sem isso, depois de sair, o Google poderia entrar de novo sem o
  // usuário clicar em nada. Seguro mesmo se o Google não estiver carregado.
  if (window.google && window.google.accounts && window.google.accounts.id) {
    window.google.accounts.id.disableAutoSelect();
  }
  pararAtualizacaoAutomatica();
  reiniciarNotificacoes();
  state.usuarioTipoAtual = null;
  state.ultimoUsuario = null;
  state.chamadoEmFoco = null;
  [
    clienteHistoricoEl,
    prestadorHistoricoEl,
    listaDisponiveisEl,
    prestadorListaAvaliacoesEl,
    detalhesEl,
    prestadorChamadoDetalhesEl,
    linhaTempoClienteEl,
    prestadorLinhaTempoEl
  ].forEach((el) => {
    el.innerHTML = '';
    delete el.dataset.assinatura;
  });
  // Estado do atendimento do prestador (ver "Painel do prestador").
  state.prestadorVendoFinal = false;
  state.acaoPrestadorEmCurso = false;
  prestadorComChamadoEl.classList.add('oculto');
  modalCancelarAtendimento.classList.add('oculto');
  state.statusBannerChave = null;
  // O painel admin esconde o formulário de login ao entrar; sem restaurar,
  // o próximo "Acesso administrativo" abriria o painel vazio, sem pedir senha.
  adminLoginEl.classList.remove('oculta');
  adminPainelEl.classList.add('oculta');
  // O nonce da última entrada com Google foi gasto: prepara o botão de novo.
  prepararBotaoGoogle();
}

// services/api/client.js dispara este evento quando o servidor recusa o token (sessão de
// 24 h vencida ou servidor reiniciado). Levamos o usuário ao login em vez
// de deixar o painel falhando em silêncio a cada atualização.
window.addEventListener(EVENTO_SESSAO_EXPIRADA, () => {
  if (!state.usuarioTipoAtual) return; // não estava logado: nada a fazer
  encerrarSessaoLocal();
  mostrarTela('auth');
  toast('Sua sessão expirou. Faça login novamente.');
});
