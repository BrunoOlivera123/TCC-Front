// Toast: aviso rápido no canto da tela (substitui alert()).

// ---------------- Notificações (toast) e confirmação ----------------
// Substituem alert()/confirm() nativos do navegador por componentes
// próprios (ver #toast-container e #modal-confirmar no index.html e
// os estilos em style.css), para manter a aparência consistente com
// o resto do produto.
const toastContainer = document.getElementById('toast-container');

// Mostra um aviso rápido (toast) no canto da tela por 5 s, no máximo 3 ao mesmo
// tempo. tipo = 'erro' | 'sucesso'.
export function toast(mensagem, tipo = 'erro') {
  const notificacoes = toastContainer.querySelectorAll('.toast');
  if (notificacoes.length >= 3) notificacoes[0].remove();
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  el.textContent = mensagem; // textContent nunca interpreta HTML, sem risco de XSS
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}
