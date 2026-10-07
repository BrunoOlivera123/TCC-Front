// Atendimento em andamento do prestador: Cheguei ao local, Concluir e Cancelar (com motivo).

import { Anim } from '../../components/animations/animacoes.js';
import { renderizarLinhaTempo } from '../../components/chamado/linhaTempo.js';
import { toast } from '../../components/feedback/toast.js';
import { Mapa } from '../../components/map/mapa.js';
import { TITULOS_ATENDIMENTO_PRESTADOR } from '../../constants/atendimento.js';
import { modalCancelarAtendimento, prestadorChamadoDetalhesEl, prestadorComChamadoEl, prestadorLinhaTempoEl } from './elementos.js';
import { atualizarHistoricoPrestador } from './modaisPrestador.js';
import { atualizarPainelPrestador, sincronizarAtendimentoPrestador } from './painelPrestador.js';
import { chamadosApi } from '../../services/api/chamados.js';
import { state } from '../../state/appState.js';
import { mensagemErroAcao } from '../../utils/erros.js';
import { resumirEndereco } from '../../utils/formatters.js';
import { escaparHtml } from '../../utils/html.js';

const btnIniciar = document.getElementById('btn-iniciar');
const btnConcluir = document.getElementById('btn-concluir');
const btnCancelarPrestador = document.getElementById('btn-cancelar-prestador');
const btnVoltarPedidos = document.getElementById('btn-voltar-pedidos');
const prestadorAcaoErroEl = document.getElementById('prestador-acao-erro');
const prestadorEstadoFinalEl = document.getElementById('prestador-estado-final');
const modalAtendimentoTitulo = document.getElementById('modal-atendimento-titulo');
const modalCancelarErro = document.getElementById('modal-cancelar-erro');
const modalCancelarVoltar = document.getElementById('modal-cancelar-voltar');
const modalCancelarConfirmar = document.getElementById('modal-cancelar-confirmar');
const motivoDetalheEl = document.getElementById('motivo-cancelamento-detalhe');
const motivoRadios = [...document.querySelectorAll('input[name="motivo-cancelamento"]')];

// ---- Ações do atendimento (Cheguei ao local / Concluir / Cancelar) ----
export function mostrarErroAcaoPrestador(mensagem) {
  prestadorAcaoErroEl.textContent = mensagem || '';
  prestadorAcaoErroEl.classList.toggle('oculto', !mensagem);
}

// Executa UMA ação do prestador com todas as proteções:
//  - ignora cliques enquanto outra ação está em andamento (duplo clique);
//  - desabilita os três botões e troca o texto do clicado (estado de carregamento);
//  - só devolve a resposta se o servidor confirmou — a tela nunca mostra um
//    status que o banco ainda não tem;
//  - se falhar, mostra a mensagem no próprio modal; em 404/409 (o chamado mudou
//    no servidor, ex.: o cliente cancelou) alinha a tela com o servidor.
async function executarAcaoPrestador(botao, textoCarregando, acao) {
  if (state.acaoPrestadorEmCurso || !state.chamadoEmFoco) return null;
  state.acaoPrestadorEmCurso = true;
  mostrarErroAcaoPrestador('');
  const botoes = [btnIniciar, btnConcluir, btnCancelarPrestador];
  botoes.forEach((b) => (b.disabled = true));
  const textoOriginal = botao.textContent;
  botao.textContent = textoCarregando;
  let resposta = null;
  let erro = null;
  try {
    resposta = await acao(state.chamadoEmFoco.id);
  } catch (err) {
    erro = err;
  } finally {
    botao.textContent = textoOriginal;
    botoes.forEach((b) => (b.disabled = false));
    state.acaoPrestadorEmCurso = false;
  }
  if (erro) {
    mostrarErroAcaoPrestador(mensagemErroAcao(erro));
    if (erro.status === 404 || erro.status === 409) sincronizarAtendimentoPrestador().catch(() => {});
    return null;
  }
  return resposta;
}

// Aplica na tela o chamado confirmado pelo servidor. Em estado final
// (concluído/cancelado) o card permanece, com o rótulo do estado, e o
// histórico/avaliações são atualizados por trás.
function aplicarChamadoPrestador(chamado) {
  state.chamadoEmFoco = chamado;
  state.prestadorVendoFinal = ['concluido', 'cancelado'].includes(chamado.status);
  prestadorComChamadoEl.classList.remove('oculto');
  renderizarChamadoPrestador(chamado);
  if (state.prestadorVendoFinal) atualizarHistoricoPrestador().catch(() => {});
}

btnIniciar.addEventListener('click', async () => {
  const chamado = await executarAcaoPrestador(btnIniciar, 'Registrando chegada...', (id) => chamadosApi.iniciarAtendimento(id));
  if (chamado) aplicarChamadoPrestador(chamado);
});

btnConcluir.addEventListener('click', async () => {
  const chamado = await executarAcaoPrestador(btnConcluir, 'Concluindo...', (id) => chamadosApi.concluirAtendimento(id));
  if (chamado) aplicarChamadoPrestador(chamado);
});

btnVoltarPedidos.addEventListener('click', async () => {
  state.prestadorVendoFinal = false;
  try {
    await atualizarPainelPrestador();
  } catch (err) {
    toast(mensagemErroAcao(err), 'erro');
  }
});

// "Cancelar atendimento" nunca cancela direto: abre a confirmação com o
// motivo. Só "Confirmar cancelamento" chama a API.
btnCancelarPrestador.addEventListener('click', () => {
  if (state.acaoPrestadorEmCurso || !state.chamadoEmFoco) return;
  motivoRadios.forEach((r) => (r.checked = false));
  motivoDetalheEl.value = '';
  motivoDetalheEl.classList.add('oculto');
  modalCancelarErro.classList.add('oculto');
  modalCancelarAtendimento.classList.remove('oculto');
});

// Fecha o modal de cancelamento do atendimento (com animação).
function fecharModalCancelamento() {
  return Anim.sair(modalCancelarAtendimento, 'saindo', 160).then(() => modalCancelarAtendimento.classList.add('oculto'));
}

// Mostra uma mensagem de erro dentro do modal de cancelamento.
function mostrarErroModalCancelamento(mensagem) {
  modalCancelarErro.textContent = mensagem;
  modalCancelarErro.classList.remove('oculto');
}

modalCancelarVoltar.addEventListener('click', () => {
  if (state.acaoPrestadorEmCurso) return; // não fecha no meio do envio
  fecharModalCancelamento();
});

// "Outro" pede uma descrição.
motivoRadios.forEach((radio) => {
  radio.addEventListener('change', () => {
    const outro = motivoRadios.some((r) => r.checked && r.value === 'outro');
    motivoDetalheEl.classList.toggle('oculto', !outro);
    modalCancelarErro.classList.add('oculto');
    if (outro) motivoDetalheEl.focus();
  });
});

modalCancelarConfirmar.addEventListener('click', async () => {
  if (state.acaoPrestadorEmCurso || !state.chamadoEmFoco) return;
  const motivo = motivoRadios.find((r) => r.checked)?.value;
  const detalhe = motivoDetalheEl.value.trim();
  if (!motivo) return mostrarErroModalCancelamento('Selecione o motivo do cancelamento.');
  if (motivo === 'outro' && detalhe.length < 3) return mostrarErroModalCancelamento('Descreva o motivo do cancelamento.');

  state.acaoPrestadorEmCurso = true;
  modalCancelarErro.classList.add('oculto');
  modalCancelarConfirmar.disabled = modalCancelarVoltar.disabled = true;
  const textoOriginal = modalCancelarConfirmar.textContent;
  modalCancelarConfirmar.textContent = 'Cancelando...';
  let chamado = null;
  let erro = null;
  try {
    chamado = await chamadosApi.cancelarPorPrestador(state.chamadoEmFoco.id, motivo === 'outro' ? { motivo, detalhe } : { motivo });
  } catch (err) {
    erro = err;
  } finally {
    modalCancelarConfirmar.textContent = textoOriginal;
    modalCancelarConfirmar.disabled = modalCancelarVoltar.disabled = false;
    state.acaoPrestadorEmCurso = false;
  }

  if (!erro) {
    await fecharModalCancelamento();
    aplicarChamadoPrestador(chamado);
  } else if (erro.status === 404 || erro.status === 409) {
    // O chamado mudou no servidor (ex.: o cliente já cancelou): fecha a
    // confirmação, explica e alinha a tela com o servidor.
    await fecharModalCancelamento();
    mostrarErroAcaoPrestador(mensagemErroAcao(erro));
    sincronizarAtendimentoPrestador().catch(() => {});
  } else {
    // Falha passageira (conexão, 5xx) ou dados inválidos: mantém a
    // confirmação aberta para o prestador tentar de novo.
    mostrarErroModalCancelamento(mensagemErroAcao(erro));
  }
});

let prestadorStatusChave = null;

// Mostra o atendimento em andamento do prestador: título conforme o status, dados
// do cliente, mapa com a rota e os botões das ações permitidas naquele status.
export function renderizarChamadoPrestador(chamado) {
  const titulo = TITULOS_ATENDIMENTO_PRESTADOR[chamado.status] || 'Atendimento';
  const chave = `${chamado.id}:${chamado.status}`;
  modalAtendimentoTitulo.textContent = titulo;
  if (prestadorStatusChave !== null && prestadorStatusChave !== chave) {
    modalAtendimentoTitulo.classList.remove('status-troca');
    void modalAtendimentoTitulo.offsetWidth; // reinicia a animação
    modalAtendimentoTitulo.classList.add('status-troca');
  }
  prestadorStatusChave = chave;

  prestadorChamadoDetalhesEl.innerHTML = `
      <dt>Cliente</dt><dd>${escaparHtml(chamado.clienteNome)}</dd>
      <dt>Endereço</dt><dd>${escaparHtml(resumirEndereco(chamado.endereco))}</dd>
      <dt>Número do cliente</dt><dd>${escaparHtml(chamado.clienteTelefone) || 'sem telefone'}</dd>
      <dt>Status</dt><dd>${escaparHtml(titulo)}</dd>
    `;
  renderizarLinhaTempo(prestadorLinhaTempoEl, chamado);
  Mapa.criarOuAtualizar('mapa-prestador', chamado.latitude, chamado.longitude, escaparHtml(chamado.clienteNome), chamado.categoriaNome || 'Mecânico');
  if (
    typeof state.localizacaoPrestador?.latitude === 'number' &&
    typeof state.localizacaoPrestador?.longitude === 'number'
  ) {
    Mapa.criarOuAtualizarPrestador(
      'mapa-prestador',
      state.localizacaoPrestador.latitude,
      state.localizacaoPrestador.longitude,
      'Sua localização',
      chamado.categoriaNome || 'Mecânico'
    );
    Mapa.criarOuAtualizarRota(
      'mapa-prestador',
      [chamado.latitude, chamado.longitude],
      [state.localizacaoPrestador.latitude, state.localizacaoPrestador.longitude]
    );
  } else {
    Mapa.removerPrestador('mapa-prestador');
  }
  // Só os botões do estado atual: a caminho -> Cheguei/Cancelar; no local ->
  // Concluir/Cancelar; estado final -> só o rótulo (e "Voltar aos pedidos").
  const final = chamado.status === 'concluido' || chamado.status === 'cancelado';
  btnIniciar.classList.toggle('oculto', chamado.status !== 'aceito');
  btnConcluir.classList.toggle('oculto', chamado.status !== 'em_andamento');
  btnCancelarPrestador.classList.toggle('oculto', !['aceito', 'em_andamento'].includes(chamado.status));
  prestadorEstadoFinalEl.classList.toggle('oculto', !final);
  prestadorEstadoFinalEl.classList.toggle('estado-final-cancelado', chamado.status === 'cancelado');
  prestadorEstadoFinalEl.textContent = chamado.status === 'cancelado' ? '✕ Atendimento cancelado' : '✓ Atendimento concluído';
  btnVoltarPedidos.classList.toggle('oculto', !final);
}
