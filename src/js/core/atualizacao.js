// Atualização automática (polling) dos painéis e parada do GPS ao sair/trocar de tela.

import { toast } from '../components/feedback/toast.js';
import { atualizarNotificacoes } from '../components/notifications/centralNotificacoes.js';
import { state } from '../state/appState.js';

// Para tudo o que roda em segundo plano: o polling periódico e o acompanhamento
// de GPS. Chamada no logout e quando a sessão expira.
export function pararAtualizacaoAutomatica() {
  if (state.intervaloAtualizacao) clearInterval(state.intervaloAtualizacao);
  state.intervaloAtualizacao = null;
  if (state.watchIdCliente !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(state.watchIdCliente);
    state.watchIdCliente = null;
  }
  if (state.watchIdPrestador !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(state.watchIdPrestador);
    state.watchIdPrestador = null;
  }
}

// Roda "atualizar" agora e depois a cada "intervaloMs" (o polling que
// mantém os painéis em dia). Diferente de um setInterval solto:
//  - não empilha requisições: se a anterior ainda não terminou (rede
//    lenta), o tique é pulado;
//  - erros não viram "unhandled rejection": avisa com um toast na
//    primeira falha e fica quieto até a conexão voltar, em vez de
//    repetir o aviso a cada 3 segundos.
export function iniciarAtualizacaoAutomatica(atualizar, intervaloMs) {
  let emAndamento = false;
  let avisouFalha = false;
  const tique = async () => {
    if (emAndamento) return;
    emAndamento = true;
    try {
      await atualizar();
      // A Central de Notificações viaja no MESMO ciclo (nenhum timer/conexão a mais).
      if (state.usuarioTipoAtual === 'cliente' || state.usuarioTipoAtual === 'prestador') {
        await atualizarNotificacoes().catch(() => {});
      }
      avisouFalha = false;
    } catch (err) {
      // Sessão expirada: o evento "sessao-expirada" já cuidou de tudo.
      if (state.usuarioTipoAtual && !avisouFalha) {
        avisouFalha = true;
        toast(err.message);
      }
    } finally {
      emAndamento = false;
    }
  };
  tique();
  state.intervaloAtualizacao = setInterval(tique, intervaloMs);
}
