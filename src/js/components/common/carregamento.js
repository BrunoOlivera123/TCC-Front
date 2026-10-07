// Estado de carregamento de botões durante operações assíncronas.

// Desabilita um botão e troca seu texto durante uma operação
// assíncrona (ex.: enviar um formulário), restaurando tudo ao final.
// Evita duplo clique e dá feedback visual de que algo está
// acontecendo, em vez de a tela simplesmente "não reagir" por um instante.
export async function comCarregamento(botao, textoCarregando, fn) {
  const textoOriginal = botao.textContent;
  botao.disabled = true;
  botao.textContent = textoCarregando;
  try {
    await fn();
  } finally {
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}
