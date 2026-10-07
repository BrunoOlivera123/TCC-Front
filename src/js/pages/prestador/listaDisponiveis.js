// Lista de chamados disponíveis para o prestador (com ordenação).

import { toast } from '../../components/feedback/toast.js';
import { chkDisponivel, listaDisponiveisEl, prestadorSemChamadoEl } from './elementos.js';
import { chamadosApi } from '../../services/api/chamados.js';
import { state } from '../../state/appState.js';
import { formatarKm, resumirEndereco, tempoMedioChegada, textoDescricao } from '../../utils/formatters.js';
import { escaparHtml } from '../../utils/html.js';

const ordenarChamadosEl = document.getElementById('ordenar-chamados');

if (ordenarChamadosEl) {
  ordenarChamadosEl.addEventListener('change', async () => {
    state.ordenacaoChamados = ordenarChamadosEl.value;
    try {
      // Só a lista é pedida de novo; a página não recarrega.
      if (!state.chamadoEmFoco) renderizarDisponiveis(await chamadosApi.chamadosDisponiveis(state.ordenacaoChamados));
    } catch (err) {
      toast(err.message, 'erro');
    }
  });
}

const semChamadosMsg = document.getElementById('sem-chamados-msg');
const semChamadosTexto = document.getElementById('sem-chamados-texto');

// Desenha a lista de chamados disponíveis para aceitar. Cada item
// carrega o id do chamado no atributo "data-aceitar" do botão, lido
// pelo listener de delegação configurado acima.
export function renderizarDisponiveis(lista) {
  // A ordem vem do servidor (?ordenar=); não reordenar aqui.
  const listaOrdenada = [...lista];
  state.chamadosDisponiveisAtuais = listaOrdenada;
  const temChamados = listaOrdenada.length > 0;
  semChamadosMsg.classList.toggle('oculto', temChamados);
  prestadorSemChamadoEl.classList.toggle('oculta', temChamados);
  listaDisponiveisEl.classList.toggle('oculta', !temChamados);
  // Com o interruptor desligado o servidor não devolve chamados; sem esta
  // explicação, "Nenhum chamado disponível" pareceria falta de demanda.
  semChamadosTexto.textContent = !chkDisponivel.checked
    ? 'Você está indisponível. Ative a opção "Disponível" para receber chamados.'
    : !state.localizacaoPrestador
      ? 'Permita a localização do aparelho para ver os chamados dentro do seu raio de atendimento.'
      : 'Nenhum chamado dentro do seu raio no momento.';

  listaDisponiveisEl.innerHTML = listaOrdenada
    .map((c) => {
      const enderecoFormatado = resumirEndereco(c.endereco);
      const descricaoFormatada = textoDescricao(c);
      const localizacaoCliente =
        typeof c.latitude === 'number' && typeof c.longitude === 'number'
          ? `${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`
          : 'Localização não disponível';
      // Só mostra distância real (calculada com coordenadas pelo servidor); nunca inventa valor.
      const distanciaTexto = c.distanciaKm != null ? `📍 ${formatarKm(c.distanciaKm)} de distância` : 'Distância não disponível';
      const tempoTexto = c.distanciaKm != null ? tempoMedioChegada(c.distanciaKm) : 'Tempo não disponível';

      return `
      <li class="item-chamado">
        <div class="item-chamado-info">
          <strong>${escaparHtml(enderecoFormatado) || 'Endereço não informado'}</strong>
          <div class="item-chamado-categoria">${escaparHtml(c.categoriaNome) || 'Categoria'}</div>
          <div class="item-chamado-descricao">${escaparHtml(descricaoFormatada) || 'Sem descrição'}</div>
          <div class="item-chamado-meta">
            <span>${escaparHtml(distanciaTexto)}</span>
            <span>•</span>
            <span>${escaparHtml(tempoTexto)}</span>
            <span>•</span>
            <span>Cliente: ${escaparHtml(localizacaoCliente)}</span>
          </div>
        </div>
        <button class="botao-primario" data-visualizar-pedido="${c.id}">Visualizar pedido</button>
      </li>`;
    })
    .join('');
}
