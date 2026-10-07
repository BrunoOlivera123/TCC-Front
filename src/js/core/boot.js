// Inicialização do app: service worker, link de redefinição de senha, categorias e restauração da sessão.

import { toast } from '../components/feedback/toast.js';
import { carregarCategorias } from '../components/forms/categoriaCards.js';
import { entrarComoUsuario } from './sessao.js';
import { mostrarTela } from './telas.js';
import { authApi } from '../services/api/auth.js';
import { authStorage } from '../services/storage/authStorage.js';
import { state } from '../state/appState.js';

// Registra o service worker (src/sw.js), que permite o app ser
// instalado (PWA) e funcionar de forma básica offline para quem já o
// visitou antes. Puramente incremental: se o navegador não suportar
// ou o registro falhar, o app continua funcionando normalmente.
function registrarServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

// ---------------- Boot ----------------
// Roda uma única vez, assim que a página carrega (chamada lá no final
// do arquivo). Decide qual tela mostrar primeiro.
export async function iniciar() {
  registrarServiceWorker();

  // Verifica imediatamente se o usuário veio pelo
  // link de redefinição enviado por e-mail
  // O token vem no FRAGMENTO da URL (#redefinir=1&tipo=...&token=...): o
  // fragmento não é enviado ao servidor nem no Referer. Ele é lido uma vez e
  // apagado da barra de endereço na hora, antes de qualquer outra coisa.
  const parametros = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token = parametros.get('redefinir') === '1' ? parametros.get('token') : null;
  const tipoRedefinicao = parametros.get('tipo');
  if (window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  if (token && tipoRedefinicao) {
    state.tokenRedefinicaoAtual = token;

    // Abre diretamente a tela para criar a nova senha
    mostrarTela('redefinirSenha');

    return;
  }

  // Se não for redefinição de senha, carrega normalmente
  try {
    await carregarCategorias();
  } catch (err) {
    mostrarTela('auth');
    toast(`Não foi possível carregar a aplicação: ${err.message}`);
    return;
  }

  // Verifica se existe uma sessão salva
  if (authStorage.obterToken()) {
    try {
      const { tipo, usuario } = await authApi.quemSouEu();

      entrarComoUsuario(tipo, usuario);

      return;
    } catch {
      authStorage.definirToken(null);
    }
  }

  // Caso normal: abre a tela de login
  mostrarTela('auth');
}
