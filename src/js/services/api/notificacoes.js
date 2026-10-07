// Central de Notificações (cliente e prestador).
import { requisitar } from './client.js';

export const notificacoesApi = {
  notificacoes: () => requisitar('/notificacoes'),
  marcarNotificacaoLida: (id) => requisitar(`/notificacoes/${encodeURIComponent(id)}/lida`, { method: 'POST' }),
  marcarTodasNotificacoesLidas: () => requisitar('/notificacoes/lidas', { method: 'POST' })
};
