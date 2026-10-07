// Chamados de socorro (cliente e prestador).
import { requisitar, enviar } from './client.js';

export const chamadosApi = {
  abrirChamado: (dados) => enviar('POST', '/chamados', dados),
  chamadoAtual: () => requisitar('/chamados/atual'),
  historico: () => requisitar('/chamados/historico'),
  atualizarLocalizacaoChamado: (id, dados) => enviar('PATCH', `/chamados/${id}/localizacao`, dados),
  cancelarChamado: (id) => requisitar(`/chamados/${id}/cancelar`, { method: 'POST' }),
  avaliarChamado: (id, dados) => enviar('POST', `/chamados/${id}/avaliacao`, dados),
  // O cliente viu que o atendimento foi cancelado: libera o formulário de novo pedido.
  cancelamentoVisto: (id) => requisitar(`/chamados/${id}/cancelamento-visto`, { method: 'POST' }),

  // ordenar: 'proximos' (padrão) | 'recentes' | 'antigos'
  chamadosDisponiveis: (ordenar) =>
    requisitar('/chamados/disponiveis' + (ordenar ? `?ordenar=${encodeURIComponent(ordenar)}` : '')),
  aceitarChamado: (id) => requisitar(`/chamados/${id}/aceitar`, { method: 'POST' }),
  iniciarAtendimento: (id) => requisitar(`/chamados/${id}/iniciar`, { method: 'POST' }),
  concluirAtendimento: (id) => requisitar(`/chamados/${id}/concluir`, { method: 'POST' }),
  // dados = { motivo, detalhe? } — o motivo é obrigatório.
  cancelarPorPrestador: (id, dados) => enviar('POST', `/chamados/${id}/cancelar-prestador`, dados)
};
