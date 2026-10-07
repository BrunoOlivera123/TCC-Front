// Login/cadastro com Google (Google Identity Services); a validação real é do servidor.

import { toast } from '../../components/feedback/toast.js';
import { confirmar } from '../../components/modals/modalConfirmar.js';
import { entrarComoUsuario } from '../../core/sessao.js';
import { esconderErro, mostrarErro, mostrarModoAuth } from './autenticacao.js';
import { formCadastro } from './elementos.js';
import { authApi } from '../../services/api/auth.js';
import { authStorage } from '../../services/storage/authStorage.js';
import { state } from '../../state/appState.js';

// =================================================================
// Login com Google (Google Identity Services)
//
// O botão só aparece se o servidor tiver GOOGLE_CLIENT_ID. O Google devolve
// um ID token; quem o valida é o SERVIDOR (POST /api/auth/google). O script
// do Google só é carregado quando o recurso está ligado.
//
// NONCE (anti-replay): antes de mostrar o botão pedimos ao servidor um nonce
// de uso único e o entregamos ao Google (initialize). O Google o grava dentro
// do token assinado; o servidor confere e gasta esse nonce no login. Como cada
// nonce só funciona uma vez, depois de TODA tentativa pedimos um novo e
// reconfiguramos o botão (prepararBotaoGoogle).
// =================================================================
const googleArea = document.getElementById('google-area');

const googleBotao = document.getElementById('google-botao');
let googleClientId = null; // preenchido por iniciarGoogle(); null = recurso desligado
let googlePreparando = false; // evita duas preparações simultâneas do botão

// Monta o corpo e chama POST /api/auth/google. "confirmarVinculo" só vai
// como true depois que o usuário aceitou o aviso de vínculo de conta.
function enviarCredencialGoogle(credential, confirmarVinculo, tipoEscolhido) {
  const categoriaId = formCadastro.elements.categoriaId ? formCadastro.elements.categoriaId.value : '';
  const corpo = { credential };
  // Na tela de LOGIN não mandamos o tipo (o servidor acha a conta existente).
  // Na tela de CRIAR CONTA mandamos o perfil escolhido (cliente/prestador).
  if (tipoEscolhido) corpo.tipo = tipoEscolhido;
  else if (state.modoAuth === 'cadastro') corpo.tipo = state.perfilSelecionado;
  if (corpo.tipo === 'prestador' && categoriaId) corpo.categoriaId = Number(categoriaId);
  if (confirmarVinculo) corpo.confirmarVinculo = true;
  return authApi.loginGoogle(corpo);
}

// Chamada pelo Google quando o usuário escolhe uma conta.
async function aoReceberCredencialGoogle(resposta) {
  esconderErro();
  try {
    let resultado;
    let tipoEscolhido; // só preenchido se o servidor pedir para escolher cliente/prestador
    try {
      try {
        resultado = await enviarCredencialGoogle(resposta.credential, false);
      } catch (err) {
        if (err.codigo !== 'ESCOLHER_PERFIL') throw err;
        // O mesmo Google está ligado a uma conta de cliente e a uma de prestador.
        const comoPrestador = await confirmar(
          'Este Google está ligado a uma conta de cliente e a uma de prestador. Deseja entrar como PRESTADOR? (Se cancelar, você entra como cliente.)'
        );
        tipoEscolhido = comoPrestador ? 'prestador' : 'cliente';
        resultado = await enviarCredencialGoogle(resposta.credential, false, tipoEscolhido);
      }
    } catch (err) {
      if (err.codigo !== 'CONFIRMAR_VINCULO') throw err;
      // Já existe uma conta com senha neste e-mail: vincular ao Google remove a
      // senha. O servidor não altera nada até o usuário confirmar aqui; se
      // confirmar, reenviamos o MESMO token (o nonce ainda não foi gasto).
      const aceitou = await confirmar(err.message);
      if (!aceitou) return;
      resultado = await enviarCredencialGoogle(resposta.credential, true, tipoEscolhido);
    }

    if (resultado.pendente) {
      mostrarErro(resultado.mensagem || 'Cadastro enviado para aprovação do administrador.');
      return;
    }
    authStorage.definirToken(resultado.token);
    entrarComoUsuario(resultado.tipo, resultado.usuario);
    if (resultado.vinculada) {
      toast('Conta vinculada ao Google. Para voltar a entrar com senha, use "Esqueceu sua senha?".', 'sucesso');
    }
  } catch (err) {
    if (err.codigo === 'CATEGORIA_OBRIGATORIA' || err.codigo === 'PERFIL_NECESSARIO') {
      // Prestador novo precisa escolher a categoria, e quem ainda não tem conta
      // precisa dizer se é cliente ou prestador: ambos acontecem em "Criar conta".
      mostrarModoAuth('cadastro');
    }
    mostrarErro(err.message);
  } finally {
    // O nonce desta tentativa já foi usado (ou descartado): prepara outro.
    // Se o login deu certo (usuarioTipoAtual definido) não há botão visível;
    // o botão é preparado de novo no logout (ver encerrarSessaoLocal).
    if (!state.usuarioTipoAtual) prepararBotaoGoogle();
  }
}

// Pede um nonce novo, reconfigura o Google e redesenha o botão. É chamada no
// início, depois de cada tentativa, a cada 10 min (o nonce vale 15) e quando
// a aba volta a ficar visível (pode ter passado muito tempo escondida).
export async function prepararBotaoGoogle() {
  if (!googleClientId || googlePreparando) return;
  if (!window.google || !window.google.accounts) return;
  googlePreparando = true;
  try {
    const { nonce } = await authApi.googleNonce();
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: aoReceberCredencialGoogle,
      nonce
    });
    // A área precisa estar visível ANTES de redesenhar: se estiver escondida,
    // clientWidth vale 0 e o botão sairia sempre com a largura padrão.
    googleArea.classList.remove('oculto');
    window.google.accounts.id.renderButton(googleBotao, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      locale: 'pt-BR',
      width: Math.min(360, Math.max(200, googleBotao.clientWidth || 300))
    });

    const iframeGoogle = googleBotao.querySelector('iframe');
    if (iframeGoogle) {
      iframeGoogle.style.borderRadius = '999px';
      iframeGoogle.style.overflow = 'hidden';
    }
  } catch {
    // Sem nonce não há como logar com Google com segurança: esconde o botão.
    // O login por e-mail e senha segue funcionando normalmente.
    googleArea.classList.add('oculto');
  } finally {
    googlePreparando = false;
  }
}

// Ponto de partida do login com Google: pergunta ao servidor se o recurso está
// ligado (GOOGLE_CLIENT_ID) e, se estiver, carrega o script do Google e agenda a
// renovação do nonce. Qualquer falha só esconde o botão; o login por senha continua.
async function iniciarGoogle() {
  if (!googleArea || !googleBotao) return;
  let clientId = null;
  try {
    ({ clientId } = await authApi.googleConfig());
  } catch {
    return; // sem servidor/Google: o login por e-mail e senha segue normal
  }
  if (!clientId) return;
  googleClientId = clientId;

  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.onload = prepararBotaoGoogle;
  // Se o script do Google não carregar (bloqueador, sem internet), o botão simplesmente não aparece.
  document.head.appendChild(script);

  // Renova o nonce antes de vencer e quando a aba volta a ser vista.
  setInterval(() => {
    if (!state.usuarioTipoAtual && !document.hidden) prepararBotaoGoogle();
  }, 10 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !state.usuarioTipoAtual) prepararBotaoGoogle();
  });
}

iniciarGoogle();
