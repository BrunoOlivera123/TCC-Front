// Categorias: carrega as opções da API nos <select> e as exibe como cards (o <select> continua sendo a fonte da verdade).

import { CATEGORIA_INFO, CATEGORIA_PADRAO } from '../../constants/categorias.js';
import { categoriasApi } from '../../services/api/categorias.js';
import { escaparHtml } from '../../utils/html.js';

// Busca as categorias de serviço na API e preenche os dois <select>
// que dependem delas: o de cadastro de prestador e o de abertura de
// chamado (que só existe depois do login como cliente, mas já
// deixamos pronto).
export async function carregarCategorias() {
  const categorias = await categoriasApi.categorias();
  const opcoesHtml = categorias.map((c) => `<option value="${c.id}">${escaparHtml(c.nome)}</option>`).join('');
  const seletores = [
    document.querySelector('#form-cadastro select[name="categoriaId"]'),
    document.getElementById('chamado-categoria')
  ];
  seletores.forEach((select) => {
    if (select) {
      select.innerHTML = opcoesHtml;
      renderizarCardsCategoria(select);
    }
  });
}

// Constrói (ou atualiza) o grid de cards logo abaixo de um <select>
// de categoria, mantendo o próprio <select> como fonte da verdade —
// os cards só refletem e escrevem nele, então nenhum outro trecho
// das páginas precisa saber que os cards existem.
export function renderizarCardsCategoria(select) {
  if (!select) return;
  let container = select.nextElementSibling;
  if (!container || !container.classList.contains('categoria-cards')) {
    container = document.createElement('div');
    container.className = 'categoria-cards';
    select.insertAdjacentElement('afterend', container);
  }

  const valorAtual = select.value;
  container.innerHTML = [...select.options].map((opcao) => {
    const info = CATEGORIA_INFO[opcao.textContent] || CATEGORIA_PADRAO;
    const ativa = String(opcao.value) === String(valorAtual);
    return `
        <button type="button" class="categoria-card${ativa ? ' ativa' : ''}" data-categoria-id="${opcao.value}" style="--categoria-cor: ${info.cor}" aria-pressed="${ativa}">
          <span class="categoria-card-check" aria-hidden="true">✓</span>
          <span class="categoria-card-icone" aria-hidden="true">${info.icone}</span>
          <span class="categoria-card-nome">${escaparHtml(opcao.textContent)}</span>
          <span class="categoria-card-desc">${info.descricao}</span>
        </button>
      `;
  }).join('');

  container.querySelectorAll('.categoria-card').forEach((card) => {
    card.addEventListener('click', () => {
      select.value = card.dataset.categoriaId;
      container.querySelectorAll('.categoria-card').forEach((c) => {
        const estaAtiva = c === card;
        c.classList.toggle('ativa', estaAtiva);
        c.setAttribute('aria-pressed', String(estaAtiva));
      });
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
}
