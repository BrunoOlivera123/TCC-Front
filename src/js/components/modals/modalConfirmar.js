// Modal de confirmação (substitui confirm()), devolve Promise<boolean>.

import { Anim } from '../animations/animacoes.js';

const modalConfirmar = document.getElementById('modal-confirmar');
const modalConfirmarTexto = document.getElementById('modal-confirmar-texto');
const modalConfirmarOk = document.getElementById('modal-confirmar-ok');
const modalConfirmarCancelar = document.getElementById('modal-confirmar-cancelar');

// Mostra o modal de confirmação e devolve uma Promise que resolve
// "true" (confirmou) ou "false" (cancelou), no lugar do confirm()
// nativo do navegador.
export function confirmar(mensagem) {
  modalConfirmarTexto.textContent = mensagem;
  modalConfirmar.classList.remove('oculto');
  return new Promise((resolve) => {
    // Fecha o modal de confirmação e entrega a resposta; remove os listeners para não
    // acumular cliques de uma confirmação para outra.
    function limpar(resultado) {
      Anim.sair(modalConfirmar, 'saindo', 160).then(() => modalConfirmar.classList.add('oculto'));
      modalConfirmarOk.removeEventListener('click', aoConfirmar);
      modalConfirmarCancelar.removeEventListener('click', aoCancelar);
      resolve(resultado);
    }
    // Clicou em confirmar.
    function aoConfirmar() {
      limpar(true);
    }
    // Clicou em cancelar.
    function aoCancelar() {
      limpar(false);
    }
    modalConfirmarOk.addEventListener('click', aoConfirmar);
    modalConfirmarCancelar.addEventListener('click', aoCancelar);
  });
}
