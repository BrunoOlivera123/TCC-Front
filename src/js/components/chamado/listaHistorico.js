// Lista de histórico de chamados (compartilhada entre cliente e prestador).

import { formatarData, resumirEndereco, rotuloStatus } from '../../utils/formatters.js';
import { escaparHtml } from '../../utils/html.js';

// Complemento da linha do histórico quando o chamado foi cancelado:
// " · Cancelado pelo prestador — Cliente não estava no local".
function textoCancelamento(chamado) {
  if (chamado.status !== 'cancelado' || !chamado.canceladoPor) return '';
  const quem = { prestador: 'pelo prestador', cliente: 'pelo cliente', admin: 'pela administração' }[chamado.canceladoPor];
  if (!quem) return '';
  return ` · Cancelado ${quem}${chamado.motivoCancelamentoTexto ? ` — ${chamado.motivoCancelamentoTexto}` : ''}`;
}

// ---------------- Histórico (compartilhado entre os dois painéis) ----------------
// "obterTitulo" é uma função passada por quem chama: no painel do
// cliente mostra a categoria do chamado, no painel do prestador mostra
// o nome do cliente atendido — o resto do card é igual nos dois casos.
export function renderizarHistorico(elemento, lista, obterTitulo) {
  const listaOrdenada = [...lista].sort((a, b) => new Date(b.dataAbertura || 0) - new Date(a.dataAbertura || 0));

  elemento.innerHTML = listaOrdenada.length
    ? listaOrdenada
        .map(
          (c) => `
        <li class="item-historico">
          <div>
            <strong>${escaparHtml(obterTitulo(c))}</strong>
            <div class="texto-auxiliar">${escaparHtml(resumirEndereco(c.endereco))} · ${formatarData(c.dataAbertura)}${escaparHtml(textoCancelamento(c))}</div>
          </div>
          <span class="selo ${c.status === 'cancelado' ? 'selo-cancelado' : 'selo-concluido'}">${rotuloStatus(c.status)}</span>
        </li>`
        )
        .join('')
    : `<li class="estado-vazio">
          <svg class="estado-vazio-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16v6l-3 3H7l-3-3V4z"/><path d="M4 10v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9"/></svg>
          Nada por aqui ainda.
        </li>`;
}
