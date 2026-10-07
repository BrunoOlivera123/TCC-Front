// Modal do prestador ao aceitar um chamado: detalhes, distância e tempo estimado.

import { Anim } from '../animations/animacoes.js';
import { formatarData, resumirEndereco, rotuloStatus, tempoMedioChegada, textoDescricao } from '../../utils/formatters.js';
import { escaparHtml } from '../../utils/html.js';

const modalConfirmarChamado = document.getElementById('modal-confirmar-chamado');
const modalChamadoDetalhes = document.getElementById('modal-chamado-detalhes');
const modalChamadoAceitar = document.getElementById('modal-chamado-aceitar');
const modalChamadoCancelar = document.getElementById('modal-chamado-cancelar');

// Modal de confirmação do prestador ao aceitar um chamado: mostra cliente, local,
// distância e tempo estimado. Devolve Promise<boolean> (aceitou ou não).
export function confirmarChamado(chamado) {
  const localizacaoCliente =
    typeof chamado.latitude === 'number' && typeof chamado.longitude === 'number'
      ? `${chamado.latitude.toFixed(5)}, ${chamado.longitude.toFixed(5)}`
      : 'Localização não disponível';
  const distanciaInfo = typeof chamado.distanciaKm === 'number' ? `${Number(chamado.distanciaKm).toFixed(1)} km` : 'Distância não disponível';
  const tempoInfo = typeof chamado.distanciaKm === 'number' ? tempoMedioChegada(chamado.distanciaKm) : 'Tempo não disponível';

  modalChamadoDetalhes.innerHTML = `
      <dt>Status</dt><dd>${rotuloStatus(chamado.status)}</dd>
      <dt>Categoria</dt><dd>${escaparHtml(chamado.categoriaNome) || '—'}</dd>
      <dt>Endereço</dt><dd>${escaparHtml(resumirEndereco(chamado.endereco))}</dd>
      <dt>Descrição</dt><dd>${escaparHtml(textoDescricao(chamado))}</dd>
      <dt>Localização do cliente</dt><dd>${escaparHtml(localizacaoCliente)}</dd>
      <dt>Solicitado em</dt><dd>${formatarData(chamado.dataAbertura)}</dd>
      <dt>Distância</dt><dd>${escaparHtml(distanciaInfo)}</dd>
      <dt>Tempo médio</dt><dd>${escaparHtml(tempoInfo)}</dd>
    `;
  modalConfirmarChamado.classList.remove('oculto');
  return new Promise((resolve) => {
    // Fecha o modal e entrega a resposta (aceitou/cancelou), removendo os listeners.
    function limpar(resultado) {
      Anim.sair(modalConfirmarChamado, 'saindo', 160).then(() => modalConfirmarChamado.classList.add('oculto'));
      modalChamadoAceitar.removeEventListener('click', aoAceitar);
      modalChamadoCancelar.removeEventListener('click', aoCancelar);
      resolve(resultado);
    }
    // Clicou em aceitar.
    function aoAceitar() { limpar(true); }
    // Clicou em cancelar.
    function aoCancelar() { limpar(false); }
    modalChamadoAceitar.addEventListener('click', aoAceitar);
    modalChamadoCancelar.addEventListener('click', aoCancelar);
  });
}
