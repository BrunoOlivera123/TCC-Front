// Linha do tempo do atendimento (eventos do chamado).

import { formatarHoraEvento } from '../../utils/formatters.js';
import { escaparHtml } from '../../utils/html.js';

// Desenha "18:32 — Prestador aceitou o chamado" para cada evento do chamado.
// Só redesenha quando a lista muda (o painel do cliente é atualizado a cada
// 3 s) e anima apenas os eventos que acabaram de chegar.
export function renderizarLinhaTempo(elemento, chamado) {
  const eventos = chamado.eventos || [];
  const assinatura = `${chamado.id}|${eventos.map((e) => e.id).join(',')}`;
  if (elemento.dataset.assinatura === assinatura) return;
  const mesmoChamado = elemento.dataset.assinatura && elemento.dataset.assinatura.startsWith(`${chamado.id}|`);
  const jaExibidos = mesmoChamado ? Number(elemento.dataset.quantidade || 0) : eventos.length;
  elemento.dataset.assinatura = assinatura;
  elemento.dataset.quantidade = String(eventos.length);
  elemento.innerHTML = eventos
    .map(
      (e, i) => `
      <li class="evento-${escaparHtml(e.tipo)}${i >= jaExibidos ? ' evento-novo' : ''}">
        <time datetime="${escaparHtml(e.data)}">${escaparHtml(formatarHoraEvento(e.data, chamado.dataAbertura))}</time> — ${escaparHtml(e.descricao)}${
        e.detalhe ? `<span class="evento-detalhe">Motivo: ${escaparHtml(e.detalhe)}</span>` : ''
      }
      </li>`
    )
    .join('');
}
