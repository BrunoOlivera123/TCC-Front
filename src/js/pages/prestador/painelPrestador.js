// Painel do prestador: disponibilidade, localização/GPS e atualização do painel.

import { CartaoInfo } from '../../components/cards/cartaoInfo.js';
import { toast } from '../../components/feedback/toast.js';
import { confirmarChamado } from '../../components/modals/modalConfirmarChamado.js';
import { iniciarAtualizacaoAutomatica, pararAtualizacaoAutomatica } from '../../core/atualizacao.js';
import { btnConfig } from '../../core/elementos.js';
import { mostrarTela } from '../../core/telas.js';
import { mostrarErroAcaoPrestador, renderizarChamadoPrestador } from './atendimentoPrestador.js';
import { chkDisponivel, listaDisponiveisEl, prestadorComChamadoEl, prestadorSemChamadoEl } from './elementos.js';
import { renderizarDisponiveis } from './listaDisponiveis.js';
import { atualizarHistoricoPrestador } from './modaisPrestador.js';
import { garantirPerfilCompleto, tratarPerfilIncompleto } from '../profile/completarPerfil.js';
import { chamadosApi } from '../../services/api/chamados.js';
import { prestadorApi } from '../../services/api/prestador.js';
import { state } from '../../state/appState.js';
import { formatarKm } from '../../utils/formatters.js';

// =================================================================
// Painel do prestador
// =================================================================
const prestadorNomeEl = document.getElementById('prestador-nome');

const prestadorCategoriaEl = document.getElementById('prestador-categoria');
const disponivelTexto = document.getElementById('disponivel-texto');
const prestadorLocalizacaoStatus = document.getElementById('prestador-localizacao-status');
const btnAtualizarChamados = document.getElementById('btn-atualizar-chamados');

// Atualiza texto e cor do badge "Disponível"/"Indisponível" juntos,
// nos três pontos do código que precisam disso (entrada no painel e
// troca do interruptor, inclusive quando a troca é desfeita por erro).
function atualizarBadgeDisponivel(disponivel) {
  disponivelTexto.textContent = disponivel ? 'Disponível' : 'Indisponível';
  disponivelTexto.classList.toggle('status-badge-ativo', disponivel);
}

// Chamada uma vez, logo após o login/cadastro como prestador.
async function sincronizarPainelPrestador() {
  if (state.acaoPrestadorEmCurso) return;
  if (state.prestadorVendoFinal) return;

  if (state.chamadoEmFoco) {
    await sincronizarAtendimentoPrestador();
    return;
  }

  await atualizarPainelPrestador();
}

// Prepara o painel do prestador ao entrar: nome, categoria, interruptor de
// disponibilidade, card do raio e as atualizações periódicas.
export function iniciarPainelPrestador(usuario) {
  prestadorNomeEl.textContent = usuario.nome;
  prestadorCategoriaEl.textContent = `Categoria: ${usuario.categoriaNome}`;
  chkDisponivel.checked = !!usuario.disponivel;
  atualizarBadgeDisponivel(!!usuario.disponivel);

  // Card informativo (componente reutilizável) com o raio atual; dispensável.
  CartaoInfo.montar(document.getElementById('prestador-cartao-info'), {
    id: 'raio-prestador',
    icone: 'pin',
    titulo: 'Chamados dentro do seu raio',
    descricao: `Você vê chamados a até ${formatarKm(usuario.raioKm || 15)} de você, do mais próximo ao mais distante.`,
    complemento: 'A distância é medida em linha reta, pela localização do aparelho.',
    acao: { rotulo: 'Ajustar raio', aoClicar: () => btnConfig && btnConfig.click() },
    dispensavel: true
  });

  mostrarTela('prestador');
  pararAtualizacaoAutomatica();
  obterLocalizacaoPrestador();
  atualizarPainelPrestador().catch((err) => toast(err.message, 'erro'));
  // Mantém a lista de pedidos e o atendimento ativo sincronizados em segundo plano,
  // sem exigir clique em "Atualizar" sempre que um cliente abrir um novo pedido.
  iniciarAtualizacaoAutomatica(sincronizarPainelPrestador, 4000);
}

// Pede a localização GPS do prestador assim que o painel abre, e já
// manda para a API — é essa localização que alimenta o cálculo de
// distância usado para filtrar/ordenar os chamados disponíveis.
function obterLocalizacaoPrestador() {
  if (!navigator.geolocation) return;
  if (!window.isSecureContext) {
    prestadorLocalizacaoStatus.textContent =
      'O Chrome bloqueia a localização nesta rede sem HTTPS. Abra em localhost ou configure HTTPS no servidor.';
    return;
  }
  if (state.watchIdPrestador !== null) navigator.geolocation.clearWatch(state.watchIdPrestador);
  state.watchIdPrestador = navigator.geolocation.watchPosition(
    async (pos) => {
      state.localizacaoPrestador = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      prestadorLocalizacaoStatus.textContent = 'Localização atualizada.';
      try {
        await prestadorApi.atualizarDisponibilidade({ ...state.localizacaoPrestador });
      } catch {
        // Falha silenciosa: a próxima posição tenta sincronizar novamente.
      }
    },
    () => {
      prestadorLocalizacaoStatus.textContent =
        'Não foi possível obter sua localização; o cliente não verá seu deslocamento.';
    },
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
  );
}

// Interruptor "Disponível" / "Indisponível": avisa a API a cada
// mudança (junto com a última localização conhecida, se houver).
chkDisponivel.addEventListener('change', async () => {
  atualizarBadgeDisponivel(chkDisponivel.checked);
  try {
    await prestadorApi.atualizarDisponibilidade({ disponivel: chkDisponivel.checked, ...(state.localizacaoPrestador || {}) });
  } catch (err) {
    // Não salvou no servidor: desfaz o interruptor para a tela não
    // mostrar "Disponível" enquanto o servidor ainda diz "Indisponível".
    chkDisponivel.checked = !chkDisponivel.checked;
    atualizarBadgeDisponivel(chkDisponivel.checked);
    toast(err.message, 'erro');
    return;
  }
  // A lista permanece como está até o prestador pedir uma atualização.
});

// Importante: NÃO usar comCarregamento() aqui — ela troca
// botao.textContent, o que apagaria o ícone SVG (o botão não tem texto,
// só o ícone) e o destruiria permanentemente após o primeiro clique.
// Em vez disso, só desabilita o botão e gira o ícone via CSS.
btnAtualizarChamados.addEventListener('click', async () => {
  if (btnAtualizarChamados.disabled) return;
  btnAtualizarChamados.disabled = true;
  btnAtualizarChamados.classList.add('carregando');
  try {
    await atualizarPainelPrestador();
    toast('Pedidos atualizados.', 'sucesso');
  } catch (err) {
    toast(err.message, 'erro');
  } finally {
    btnAtualizarChamados.disabled = false;
    btnAtualizarChamados.classList.remove('carregando');
  }
});

// Delegação de evento: em vez de um listener por botão do pedido (que
// teria que ser recriado toda vez que a lista é redesenhada), ouvimos
// o clique no <ul> inteiro e conferimos se o alvo tem o atributo
// "data-visualizar-pedido" (ver renderizarDisponiveis, mais abaixo).
listaDisponiveisEl.addEventListener('click', async (e) => {
  const botao = e.target.closest('[data-visualizar-pedido]');
  if (!botao) return;
  botao.disabled = true; // evita duplo clique enquanto o pedido está em voo
  try {
    const selecionado = state.chamadosDisponiveisAtuais.find((item) => item.id === botao.dataset.visualizarPedido);
    if (!selecionado) return;
    // Conta nova (ex.: Google) sem CPF/telefone: popup obrigatório antes de aceitar o 1º chamado.
    if (!(await garantirPerfilCompleto())) return;
    if (!(await confirmarChamado(selecionado))) return;
    await chamadosApi.aceitarChamado(selecionado.id);
  } catch (err) {
    if (tratarPerfilIncompleto(err)) return;
    // Erro mais comum aqui: outro prestador aceitou primeiro (409) —
    // a mensagem já vem pronta da API.
    toast(err.message, 'erro');
  } finally {
    botao.disabled = false;
  }
  await atualizarPainelPrestador().catch(() => {}); // atualiza a lista de qualquer forma (com ou sem sucesso)
});

// Atualização automática do prestador (a cada 4 s, só com atendimento ativo).
export async function sincronizarAtendimentoPrestador() {
  if (state.acaoPrestadorEmCurso || state.prestadorVendoFinal || !state.chamadoEmFoco) return;
  const atual = await chamadosApi.chamadoAtual();
  // Uma ação pode ter começado enquanto a consulta viajava: a resposta pode estar velha.
  if (state.acaoPrestadorEmCurso || state.prestadorVendoFinal) return;
  if (!atual) {
    // O chamado deixou de estar ativo sem uma ação do prestador (o cliente ou
    // a administração cancelou). Volta para a lista de pedidos.
    toast('Este atendimento foi encerrado e não está mais ativo.', 'erro');
    await atualizarPainelPrestador();
    return;
  }
  if (atual.id !== state.chamadoEmFoco.id || atual.status !== state.chamadoEmFoco.status) {
    state.chamadoEmFoco = atual;
    renderizarChamadoPrestador(atual);
  }
}

// Busca o chamado ativo do prestador (se houver) e redesenha a tela:
// OU a lista de chamados disponíveis, OU o card de atendimento em
// andamento — mais o histórico, que aparece sempre.
export async function atualizarPainelPrestador() {
  const atual = await chamadosApi.chamadoAtual();
  state.chamadoEmFoco = atual;

  prestadorSemChamadoEl.classList.toggle('oculta', !!atual);
  // O card do atendimento é um modal que nasce com a classe "oculto" (não
  // "oculta"): alternar só "oculta" o deixava escondido para sempre, e os
  // botões do atendimento nunca apareciam.
  prestadorComChamadoEl.classList.toggle('oculto', !atual);

  if (atual) {
    state.prestadorVendoFinal = false;
    // A lista de pedidos não deve continuar aparecendo (com o chamado que
    // acabou de ser aceito) por trás do card do atendimento.
    state.chamadosDisponiveisAtuais = [];
    listaDisponiveisEl.classList.add('oculta');
    renderizarChamadoPrestador(atual);
  } else {
    mostrarErroAcaoPrestador('');
    renderizarDisponiveis(await chamadosApi.chamadosDisponiveis(state.ordenacaoChamados));
  }

  await atualizarHistoricoPrestador();
}
