// Área do prestador.
import { requisitar, enviar } from './client.js';

export const prestadorApi = {
  atualizarDisponibilidade: (dados) => enviar('PATCH', '/prestador/disponibilidade', dados),
  minhasAvaliacoes: () => requisitar('/prestador/me/avaliacoes')
};
