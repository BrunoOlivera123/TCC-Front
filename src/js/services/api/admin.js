// Painel administrativo.
import { requisitar, enviar } from './client.js';

export const adminApi = {
  adminEstatisticas: () => requisitar('/admin/estatisticas'),
  adminUsuarios: () => requisitar('/admin/usuarios'),
  // dados = { confirmarSemPerfil: true } quando o admin aceita aprovar um prestador sem CPF/telefone.
  adminAprovarPrestador: (id, dados) => enviar('POST', `/admin/prestadores/${id}/aprovar`, dados || {}),
  adminChamados: (status) => requisitar('/admin/chamados' + (status ? `?status=${encodeURIComponent(status)}` : '')),
  adminCancelarChamado: (id) => requisitar(`/admin/chamados/${id}/cancelar`, { method: 'POST' }),
  adminCategorias: () => requisitar('/admin/categorias'),
  adminRenomearCategoria: (id, nome) => enviar('PATCH', `/admin/categorias/${id}`, { nome })
};
