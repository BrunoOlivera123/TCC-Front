// Referências a elementos do DOM compartilhadas pelos módulos desta pasta.

// =================================================================
// Central de Notificações
//
// O servidor guarda as notificações (com estado lido/não lido) e devolve o
// total de não lidas; o contador do sino vem sempre dele, por isso continua
// certo ao recarregar a página ou sair e entrar. A atualização usa o mesmo
// polling dos painéis (ver iniciarAtualizacaoAutomatica) — sem timers extras.
// =================================================================
export const notificacoesEl = document.getElementById('notificacoes');
