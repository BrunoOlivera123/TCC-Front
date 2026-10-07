// Animação de clique dos botões principais.

// Dá um "pulinho" visual no botão ao ser clicado (reinicia a animação CSS a cada clique).
function animarCliqueBotao(botao) {
  if (!(botao instanceof HTMLElement)) return;
  botao.classList.remove('botao-clique');
  void botao.offsetWidth;
  botao.classList.add('botao-clique');
  clearTimeout(botao._tempoAnimacaoClique);
  botao._tempoAnimacaoClique = setTimeout(() => botao.classList.remove('botao-clique'), 180);
}

document.querySelectorAll('.botao-primario, .botao-secundario, .botao-perigo').forEach((botao) => {
  botao.addEventListener('click', () => animarCliqueBotao(botao));
});
