// Memória de quantos eventos do chamado o usuário já viu.
//
// O navegador lembra quantos eventos do chamado atual já foram mostrados (para não
// repetir avisos a cada atualização de 3 s ou ao recarregar a página). Os avisos em si
// (toast e contador do sino) vêm da Central de Notificações do servidor; aqui só se
// registra o que já foi visto.
//
// Obs.: hoje nenhuma tela LÊ este valor para decidir o que mostrar (sobrou de quando os
// toasts eram gerados no front). Mantido como estava para não mudar o comportamento;
// é candidato a remoção junto com a chamada em atendimentoCliente.js.
import { lerJson, gravarJson } from './storage.js';

const CHAVE_EVENTOS_VISTOS = 'sos-car-eventos-vistos';

// Quantos eventos do chamado o usuário já viu (null se não há registro).
function lerEventosVistos(chamadoId) {
  const salvo = lerJson(CHAVE_EVENTOS_VISTOS, null);
  return salvo && salvo.id === chamadoId && Number.isInteger(salvo.n) ? salvo.n : null;
}

// Guarda quantos eventos do chamado já foram vistos. Sem armazenamento, os avisos
// valem só enquanto a aba estiver aberta.
function gravarEventosVistos(chamadoId, quantidade) {
  gravarJson(CHAVE_EVENTOS_VISTOS, { id: chamadoId, n: quantidade });
}

// Sem localStorage, cai para a memória da aba.
let eventosVistosMemoria = { id: null, n: 0 };

// Compara os eventos do chamado com os já vistos e registra os novos.
export function notificarNovosEventos(chamado) {
  const eventos = chamado.eventos || [];
  let vistos = lerEventosVistos(chamado.id);
  if (vistos === null && eventosVistosMemoria.id === chamado.id) vistos = eventosVistosMemoria.n;
  if (vistos !== eventos.length) {
    gravarEventosVistos(chamado.id, eventos.length);
    eventosVistosMemoria = { id: chamado.id, n: eventos.length };
  }
}
