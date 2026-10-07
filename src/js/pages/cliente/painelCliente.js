// Painel do cliente: pedir socorro, localização, cancelar chamado e avaliar atendimento.

import { comCarregamento } from '../../components/common/carregamento.js';
import { toast } from '../../components/feedback/toast.js';
import { confirmar } from '../../components/modals/modalConfirmar.js';
import { LOCALIZACAO_RESERVA } from '../../constants/localizacao.js';
import { iniciarAtualizacaoAutomatica, pararAtualizacaoAutomatica } from '../../core/atualizacao.js';
import { mostrarTela } from '../../core/telas.js';
import { atualizarPainelCliente } from './atendimentoCliente.js';
import { btnCancelarChamado, btnFecharCancelamento, modalAvaliacao } from './elementos.js';
import { garantirPerfilCompleto, tratarPerfilIncompleto } from '../profile/completarPerfil.js';
import { chamadosApi } from '../../services/api/chamados.js';
import { localizacaoApi } from '../../services/api/localizacao.js';
import { state } from '../../state/appState.js';
import { mensagemErroAcao } from '../../utils/erros.js';

// =================================================================
// Painel do cliente
// =================================================================
const clienteNomeEl = document.getElementById('cliente-nome');

const formChamado = document.getElementById('form-chamado');
const btnUsarLocalizacao = document.getElementById('btn-usar-localizacao');
const btnLocalizarEndereco = document.getElementById('btn-localizar-endereco');
const localizacaoStatus = document.getElementById('localizacao-status');
const formAvaliacao = document.getElementById('form-avaliacao');
const estrelasEl = document.getElementById('estrelas');
let localizacaoCliente = null; // coordenadas obtidas pelo botão "Usar minha localização"
let notaSelecionada = 0; // nota (1-5) escolhida no componente de estrelas

// Chamada uma vez, logo após o login/cadastro como cliente.
export function iniciarPainelCliente(usuario) {
  clienteNomeEl.textContent = usuario.nome;
  mostrarTela('cliente');
  montarEstrelas();
  pararAtualizacaoAutomatica();
  iniciarRastreamentoCliente();
  // Busca agora e depois a cada 3 segundos o chamado atual e o histórico —
  // é assim que a tela do cliente "percebe" quando um prestador aceita
  // o chamado, sem precisar de WebSockets.
  iniciarAtualizacaoAutomatica(atualizarPainelCliente, 3000);
}

// Mantém a posição do cliente atualizada para que o prestador veja seu
// deslocamento no próprio mapa enquanto o chamado estiver ativo.
function iniciarRastreamentoCliente() {
  if (!navigator.geolocation || !window.isSecureContext) return;
  if (state.watchIdCliente !== null) navigator.geolocation.clearWatch(state.watchIdCliente);
  state.watchIdCliente = navigator.geolocation.watchPosition(
    async (pos) => {
      const chamado = state.chamadoEmFoco;
      if (!chamado || !['aberto', 'aceito', 'em_andamento'].includes(chamado.status)) return;
      try {
        await chamadosApi.atualizarLocalizacaoChamado(chamado.id, {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
      } catch {
        // A próxima posição tenta sincronizar novamente.
      }
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
  );
}

// Botão "Usar minha localização": pede ao navegador as coordenadas
// GPS atuais (API nativa navigator.geolocation, que exibe o popup de
// permissão do navegador).
btnUsarLocalizacao.addEventListener('click', () => {
  if (!navigator.geolocation) {
    localizacaoStatus.textContent = 'Geolocalização não é suportada neste navegador.';
    return;
  }
  if (!window.isSecureContext) {
    localizacaoStatus.textContent =
      'O Chrome bloqueia a localização nesta rede sem HTTPS. Abra em localhost ou configure HTTPS no servidor.';
    return;
  }
  localizacaoStatus.textContent = 'Obtendo localização...';
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      localizacaoCliente = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };

      try {
        const endereco = await localizacaoApi.reverseGeocodificar(localizacaoCliente.latitude, localizacaoCliente.longitude);
        const textoEndereco = endereco?.enderecoFormatado ||
          `Coordenadas: ${localizacaoCliente.latitude.toFixed(5)}, ${localizacaoCliente.longitude.toFixed(5)}`;
        formChamado.elements.endereco.value = textoEndereco;
        formChamado.elements.endereco.dispatchEvent(new Event('input', { bubbles: true }));
        localizacaoStatus.textContent = endereco?.enderecoFormatado
          ? 'Localização obtida e endereço preenchido automaticamente.'
          : `Localização obtida (${localizacaoCliente.latitude.toFixed(4)}, ${localizacaoCliente.longitude.toFixed(4)}).`;
      } catch {
        const textoFallback = `Coordenadas: ${localizacaoCliente.latitude.toFixed(5)}, ${localizacaoCliente.longitude.toFixed(5)}`;
        formChamado.elements.endereco.value = textoFallback;
        formChamado.elements.endereco.dispatchEvent(new Event('input', { bubbles: true }));
        localizacaoStatus.textContent = `Localização obtida (${localizacaoCliente.latitude.toFixed(4)}, ${localizacaoCliente.longitude.toFixed(4)}).`;
      }
    },
    () => {
      localizacaoStatus.textContent = 'Não foi possível obter sua localização. O endereço informado será usado.';
    }
  );
});

btnLocalizarEndereco.addEventListener('click', async () => {
  const endereco = new FormData(formChamado).get('endereco');
  if (typeof endereco !== 'string' || endereco.trim().length < 5) {
    localizacaoStatus.textContent = 'Informe o endereço antes de localizá-lo.';
    return;
  }

  localizacaoStatus.textContent = 'Localizando endereço...';
  try {
    const localizacao = await localizacaoApi.geocodificar(endereco);
    localizacaoCliente = localizacao;
    localizacaoStatus.textContent =
      `Endereço localizado (${localizacao.latitude.toFixed(5)}, ${localizacao.longitude.toFixed(5)}).`;
  } catch (err) {
    localizacaoStatus.textContent = err.message;
  }
});

// Envio do formulário "Precisa de socorro agora?": abre um novo
// chamado. Usa a localização obtida por GPS se houver; senão, cai no
// fallback fixo (LOCALIZACAO_RESERVA), já que o backend exige
// latitude/longitude numéricas.
formChamado.addEventListener('submit', async (e) => {
  e.preventDefault();
  const dados = Object.fromEntries(new FormData(formChamado));
  // Conta nova (ex.: Google) ainda sem CPF/telefone: popup obrigatório antes do 1º pedido.
  if (!(await garantirPerfilCompleto())) return;
  await comCarregamento(formChamado.querySelector('button[type="submit"]'), 'Enviando...', async () => {
    try {
      let localizacao = localizacaoCliente;
      if (!localizacao && dados.endereco) {
        try {
          localizacao = await localizacaoApi.geocodificar(dados.endereco);
          localizacaoStatus.textContent =
            `Endereço localizado (${localizacao.latitude.toFixed(5)}, ${localizacao.longitude.toFixed(5)}).`;
        } catch {
          localizacao = LOCALIZACAO_RESERVA;
          localizacaoStatus.textContent = 'Endereço não localizado; usando posição de demonstração.';
        }
      }
      localizacao = localizacao || LOCALIZACAO_RESERVA;
      await chamadosApi.abrirChamado({
        categoriaId: Number(dados.categoriaId),
        endereco: dados.endereco,
        descricao: dados.descricao,
        latitude: localizacao.latitude,
        longitude: localizacao.longitude
      });
      formChamado.reset();
      localizacaoCliente = null;
      localizacaoStatus.textContent = '';
      await atualizarPainelCliente(); // já troca a tela para "acompanhamento do chamado"
    } catch (err) {
      if (tratarPerfilIncompleto(err)) return;
      toast(err.message, 'erro');
    }
  });
});

btnCancelarChamado.addEventListener('click', async () => {
  if (!state.chamadoEmFoco || !(await confirmar('Cancelar este chamado?'))) return;
  try {
    await chamadosApi.cancelarChamado(state.chamadoEmFoco.id);
    await atualizarPainelCliente();
  } catch (err) {
    toast(err.message, 'erro');
  }
});

// Cria as 5 estrelas clicáveis da avaliação. Cada uma guarda seu
// próprio valor (1 a 5) em data-valor; ao clicar, marcamos como
// "ativa" todas as estrelas até a clicada (efeito visual comum de
// avaliação por estrelas).
function montarEstrelas() {
  estrelasEl.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const span = document.createElement('span');
    span.className = 'estrela';
    span.textContent = '★';
    span.dataset.valor = i;
    span.addEventListener('click', () => {
      notaSelecionada = i;
      [...estrelasEl.children].forEach((el) => el.classList.toggle('ativa', Number(el.dataset.valor) <= i));
    });
    estrelasEl.appendChild(span);
  }
}

if (modalAvaliacao) {
  modalAvaliacao.addEventListener('click', (e) => {
    if (e.target === modalAvaliacao) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalAvaliacao.classList.contains('oculto')) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
}

formAvaliacao.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!notaSelecionada) {
    toast('Escolha uma nota de 1 a 5 estrelas.', 'erro');
    return;
  }
  const dados = Object.fromEntries(new FormData(formAvaliacao));
  await comCarregamento(formAvaliacao.querySelector('button[type="submit"]'), 'Enviando...', async () => {
    try {
      await chamadosApi.avaliarChamado(state.chamadoEmFoco.id, { nota: notaSelecionada, comentario: dados.comentario });
      notaSelecionada = 0;
      formAvaliacao.reset();
      if (modalAvaliacao) modalAvaliacao.classList.add('oculto');
      await atualizarPainelCliente();
    } catch (err) {
      toast(err.message, 'erro');
    }
  });
});

// Botão "Fazer novo pedido": o cliente viu que o atendimento foi cancelado
// (pelo prestador ou pela administração) — libera o formulário de novo pedido.
// O chamado continua no histórico.
btnFecharCancelamento.addEventListener('click', async () => {
  if (!state.chamadoEmFoco) return;
  await comCarregamento(btnFecharCancelamento, 'Aguarde...', async () => {
    try {
      await chamadosApi.cancelamentoVisto(state.chamadoEmFoco.id);
      await atualizarPainelCliente();
    } catch (err) {
      toast(mensagemErroAcao(err), 'erro');
    }
  });
});
