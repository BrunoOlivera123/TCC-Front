// Mensagens de erro amigáveis para ações do usuário.

// Mensagem para uma ação que falhou. Erros "esperados" (4xx: estado inválido,
// motivo faltando...) já trazem uma frase clara do servidor; falha de conexão
// também. Qualquer outra coisa (5xx, erro inesperado) vira o aviso padrão.
export function mensagemErroAcao(erro) {
  if (erro && (erro.status === 0 || (erro.status >= 400 && erro.status < 500))) return erro.message;
  return 'Não foi possível atualizar o atendimento. Tente novamente.';
}
