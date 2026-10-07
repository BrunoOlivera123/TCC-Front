// Modais do painel do prestador: avaliações recebidas e histórico completo.

import { renderizarHistorico } from '../../components/chamado/listaHistorico.js';
import { toast } from '../../components/feedback/toast.js';
import { prestadorHistoricoEl, prestadorListaAvaliacoesEl } from './elementos.js';
import { chamadosApi } from '../../services/api/chamados.js';
import { prestadorApi } from '../../services/api/prestador.js';
import { formatarData } from '../../utils/formatters.js';
import { escaparHtml } from '../../utils/html.js';

const prestadorHistoricoCompletoEl = document.getElementById('prestador-historico-completo');
const prestadorAvaliacaoResumoEl = document.getElementById('prestador-avaliacao-resumo');
const btnVerAvaliacoes = document.getElementById('btn-ver-avaliacoes');
const btnVerHistorico = document.getElementById('btn-ver-historico');
const modalAvaliacoes = document.getElementById('modal-avaliacoes');
const modalHistorico = document.getElementById('modal-historico');
const botoesFecharModal = document.querySelectorAll('.modal-fechar');

// Histórico + avaliações do painel (também usado depois de concluir/cancelar,
// enquanto o card do atendimento ainda está na tela).
export async function atualizarHistoricoPrestador() {
  renderizarHistorico(prestadorHistoricoEl, await chamadosApi.historico(), (c) => c.clienteNome);
  await atualizarAvaliacoesPrestador();
}

// Abre um modal (remove a classe que o esconde).
function abrirModal(modal) {
  if (!modal) return;
  modal.classList.remove('oculto');
}

// Fecha um modal (adiciona a classe que o esconde).
function fecharModal(modal) {
  if (!modal) return;
  modal.classList.add('oculto');
}

// Preenche o card "Minhas avaliações": nota média + total no topo, e
// a lista de comentários recebidos logo abaixo (mais recente primeiro).
async function atualizarAvaliacoesPrestador() {
  const { media, total, avaliacoes } = await prestadorApi.minhasAvaliacoes();

  prestadorAvaliacaoResumoEl.innerHTML =
    total > 0
      ? `<strong>★ ${media.toFixed(1)}</strong><span class="texto-auxiliar">de 5 · ${total} avaliaç${total === 1 ? 'ão' : 'ões'}</span>`
      : '<span class="texto-auxiliar">Você ainda não recebeu nenhuma avaliação.</span>';

  prestadorListaAvaliacoesEl.innerHTML = avaliacoes.length
    ? avaliacoes
        .map(
          (a) => `
          <li class="item-historico">
            <div>
              <strong>${'★'.repeat(a.nota)}${'☆'.repeat(5 - a.nota)}</strong>
              <div class="texto-auxiliar">${escaparHtml(a.clienteNome)} · ${formatarData(a.data)}</div>
              <div class="texto-auxiliar avaliacao-comentario">${escaparHtml(a.comentario) || 'Sem comentário'}</div>
            </div>
          </li>`
        )
        .join('')
    : '<li class="estado-vazio">Ainda não há avaliações para mostrar.</li>';
}

btnVerAvaliacoes.addEventListener('click', async () => {
  try {
    await atualizarAvaliacoesPrestador();
    abrirModal(modalAvaliacoes);
  } catch (err) {
    toast(err.message || 'Não foi possível carregar as avaliações.', 'erro');
  }
});

btnVerHistorico.addEventListener('click', async () => {
  try {
    const historico = await chamadosApi.historico();
    renderizarHistorico(prestadorHistoricoCompletoEl, historico, (c) => c.clienteNome);
    abrirModal(modalHistorico);
  } catch (err) {
    toast(err.message || 'Não foi possível carregar o histórico.', 'erro');
  }
});

botoesFecharModal.forEach((botao) => {
  botao.addEventListener('click', () => {
    const modal = botao.closest('.modal');
    fecharModal(modal);
  });
});

document.querySelectorAll('.modal').forEach((modal) => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) fecharModal(modal);
  });
});
