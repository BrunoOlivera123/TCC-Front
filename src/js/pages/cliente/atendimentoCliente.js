// Acompanhamento do chamado no painel do cliente (status, mapa, linha do tempo, avisos).

import { renderizarLinhaTempo } from '../../components/chamado/linhaTempo.js';
import { renderizarHistorico } from '../../components/chamado/listaHistorico.js';
import { Mapa } from '../../components/map/mapa.js';
import { ESTADOS_ATENDIMENTO } from '../../constants/atendimento.js';
import { LOCALIZACAO_RESERVA } from '../../constants/localizacao.js';
import { btnCancelarChamado, btnFecharCancelamento, clienteHistoricoEl, detalhesEl, linhaTempoClienteEl, modalAvaliacao } from './elementos.js';
import { chamadosApi } from '../../services/api/chamados.js';
import { notificarNovosEventos } from '../../services/storage/atendimentoStorage.js';
import { state } from '../../state/appState.js';
import { formatarData, resumirEndereco, rotuloStatus, textoDescricao } from '../../utils/formatters.js';
import { escaparHtml } from '../../utils/html.js';

const semChamadoEl = document.getElementById('cliente-sem-chamado'); // formulário de "pedir socorro"
const comChamadoEl = document.getElementById('cliente-com-chamado'); // acompanhamento do chamado atual
const progressoEl = document.getElementById('progresso-chamado'); // "trilha" com as 4 etapas do chamado
const statusBannerEl = document.getElementById('chamado-status-banner');
const statusTituloEl = document.getElementById('chamado-status-titulo');
const statusSubEl = document.getElementById('chamado-status-sub');

// Atualiza o banner de status do acompanhamento (título e subtítulo conforme o
// status do chamado) e anima só quando o status realmente mudou.
function atualizarBannerStatus(chamado) {
  const estado = ESTADOS_ATENDIMENTO[chamado.status] || { titulo: rotuloStatus(chamado.status), sub: '' };
  let sub = estado.sub;
  if (chamado.status === 'concluido') {
    sub = chamado.avaliacao ? 'Obrigado pela avaliação.' : 'Avalie o atendimento abaixo.';
  } else if (chamado.status === 'cancelado') {
    const quem = { prestador: 'Cancelado pelo prestador.', admin: 'Cancelado pela administração.', cliente: 'Você cancelou este chamado.' }[chamado.canceladoPor];
    sub = [quem, chamado.motivoCancelamentoTexto ? `Motivo: ${chamado.motivoCancelamentoTexto}` : ''].filter(Boolean).join(' ');
  }
  statusTituloEl.textContent = estado.titulo;
  statusSubEl.textContent = sub;
  statusBannerEl.dataset.estado = chamado.status;
  const chave = `${chamado.id}:${chamado.status}`;
  if (state.statusBannerChave !== null && state.statusBannerChave !== chave) {
    statusBannerEl.classList.remove('status-troca');
    void statusBannerEl.offsetWidth; // reinicia a animação
    statusBannerEl.classList.add('status-troca');
  }
  state.statusBannerChave = chave;
}

// Busca o chamado atual (se houver) e o histórico, e redesenha a tela
// do cliente de acordo. Chamada tanto na entrada do painel quanto a
// cada "tick" do polling (setInterval acima).
function renderizarMapaLocalizacaoCliente(latitude, longitude, titulo = 'Sua localização') {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return;
  Mapa.criarOuAtualizar('mapa-cliente', latitude, longitude, titulo, 'padrao');
  Mapa.removerPrestador('mapa-cliente');
}

// Atualiza o painel do cliente: busca o chamado atual e o histórico e mostra o
// formulário de pedir socorro OU o acompanhamento. Roda na entrada do painel e a
// cada tique do polling.
export async function atualizarPainelCliente() {
  const [atual, historico] = await Promise.all([chamadosApi.chamadoAtual(), chamadosApi.historico()]);
  state.chamadoEmFoco = atual;
  if (atual) notificarNovosEventos(atual);
  else state.statusBannerChave = null; // o próximo chamado não deve "animar" como se tivesse mudado de status

  // Mostra OU o formulário de pedir socorro, OU o acompanhamento do
  // chamado — nunca os dois ao mesmo tempo.
  semChamadoEl.classList.toggle('oculta', !!atual);
  comChamadoEl.classList.toggle('oculta', !atual);

  if (atual) {
    renderizarChamadoCliente(atual);
  } else if (navigator.geolocation && window.isSecureContext) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        renderizarMapaLocalizacaoCliente(pos.coords.latitude, pos.coords.longitude, 'Sua localização');
      },
      () => {
        renderizarMapaLocalizacaoCliente(LOCALIZACAO_RESERVA.latitude, LOCALIZACAO_RESERVA.longitude, 'Localização de demonstração');
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
    );
  } else {
    renderizarMapaLocalizacaoCliente(LOCALIZACAO_RESERVA.latitude, LOCALIZACAO_RESERVA.longitude, 'Localização de demonstração');
  }

  renderizarHistorico(clienteHistoricoEl, historico, (c) => c.categoriaNome);
}

// Desenha a "trilha" de progresso (Aberto -> Aceito -> A caminho ->
// Concluído), os detalhes do chamado e decide se mostra o botão de
// cancelar e/ou o formulário de avaliação.
function renderizarChamadoCliente(chamado) {
  const passos = ['aberto', 'aceito', 'em_andamento', 'concluido'];
  const indiceAtual = passos.indexOf(chamado.status);

  [...progressoEl.children].forEach((li, i) => {
    li.classList.remove('concluido', 'atual', 'cancelado');
    if (chamado.status === 'cancelado') {
      li.classList.add('cancelado'); // troca a trilha inteira por um "x" (ver CSS)
      return;
    }
    if (i < indiceAtual) li.classList.add('concluido'); // etapas já passadas
    if (i === indiceAtual) li.classList.add('atual'); // etapa em que o chamado está agora
  });

  const notaPrestadorHtml =
    chamado.prestadorTotalAvaliacoes > 0
      ? ` · ★ ${chamado.prestadorNotaMedia.toFixed(1)} (${chamado.prestadorTotalAvaliacoes})`
      : '';
  atualizarBannerStatus(chamado);
  detalhesEl.innerHTML = `
      <dt>Status</dt><dd>${rotuloStatus(chamado.status)}</dd>
      <dt>Solicitado em</dt><dd>${formatarData(chamado.dataAbertura)}</dd>
      <dt>Categoria</dt><dd>${escaparHtml(chamado.categoriaNome) || '—'}</dd>
      <dt>Endereço</dt><dd>${escaparHtml(resumirEndereco(chamado.endereco))}</dd>
      <dt>Descrição</dt><dd>${escaparHtml(textoDescricao(chamado))}</dd>
      ${chamado.prestadorNome ? `<dt>Prestador</dt><dd>${escaparHtml(chamado.prestadorNome)} · ${escaparHtml(chamado.prestadorTelefone) || 'sem telefone'}${notaPrestadorHtml}</dd>` : ''}
    `;
  renderizarLinhaTempo(linhaTempoClienteEl, chamado);

  Mapa.criarOuAtualizar('mapa-cliente', chamado.latitude, chamado.longitude, 'Local do chamado', 'padrao');
  const prestadorAceito = ['aceito', 'em_andamento'].includes(chamado.status) && !!chamado.prestadorId;
  const prestadorTemLocalizacao =
    typeof chamado.prestadorLatitude === 'number' && typeof chamado.prestadorLongitude === 'number';

  if (prestadorAceito) {
    const categoriaPrestador = chamado.categoriaNome || 'Mecânico';
    const latitudePrestador = prestadorTemLocalizacao ? chamado.prestadorLatitude : chamado.latitude;
    const longitudePrestador = prestadorTemLocalizacao ? chamado.prestadorLongitude : chamado.longitude;

    Mapa.criarOuAtualizarPrestador(
      'mapa-cliente',
      latitudePrestador,
      longitudePrestador,
      `Prestador: ${escaparHtml(chamado.prestadorNome)}`,
      categoriaPrestador
    );

    if (prestadorTemLocalizacao) {
      Mapa.criarOuAtualizarRota(
        'mapa-cliente',
        [chamado.latitude, chamado.longitude],
        [chamado.prestadorLatitude, chamado.prestadorLongitude]
      );
    }
  } else {
    Mapa.removerPrestador('mapa-cliente');
  }

  // Cliente pode cancelar enquanto ninguém aceitou, ou dentro de 1
  // minuto após o aceite. Depois disso, o botão some.
  let podeCancelarCliente = false;
  if (chamado.status === 'aberto') {
    podeCancelarCliente = true;
  } else if (chamado.status === 'aceito' && chamado.dataAceite) {
    const diff = Date.now() - new Date(chamado.dataAceite).getTime();
    if (!Number.isNaN(diff) && diff <= 60 * 1000) podeCancelarCliente = true;
  }
  btnCancelarChamado.classList.toggle('oculto', !podeCancelarCliente);
  btnFecharCancelamento.classList.toggle('oculto', chamado.status !== 'cancelado');

  const avaliacaoObrigatoria = chamado.status === 'concluido' && !chamado.avaliacao;
  if (modalAvaliacao) {
    modalAvaliacao.classList.toggle('oculto', !avaliacaoObrigatoria);
    if (avaliacaoObrigatoria) {
      modalAvaliacao.setAttribute('aria-hidden', 'false');
    } else {
      modalAvaliacao.setAttribute('aria-hidden', 'true');
    }
  }
}
