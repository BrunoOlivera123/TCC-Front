// Textos fixos do acompanhamento do atendimento (cliente e prestador).

// ---------------- Acompanhamento do atendimento (textos e linha do tempo) ----------------
// Como cada status do banco aparece para o cliente. "aceito" já significa que
// o prestador está a caminho, e "em_andamento" que ele chegou e atende.
export const ESTADOS_ATENDIMENTO = {
  aberto: { titulo: '🔎 Chamado solicitado', sub: 'Aguardando um prestador aceitar.' },
  aceito: { titulo: '🚗 Prestador a caminho', sub: 'O prestador aceitou seu chamado.' },
  em_andamento: { titulo: '📍 Prestador chegou ao local', sub: '🔧 Atendimento em andamento' },
  concluido: { titulo: '✅ Atendimento concluído', sub: '' },
  cancelado: { titulo: '⚠️ Atendimento cancelado', sub: '' }
};

// Desenha o card do chamado que o prestador já aceitou, com os dados
// de contato do cliente (só aparecem aqui, depois do aceite — ver
// comentário sobre privacidade em server.js) e os botões de ação
// certos para a etapa atual.
// Título do modal e texto do "Status" para o prestador, por status.
export const TITULOS_ATENDIMENTO_PRESTADOR = {
  aceito: 'A caminho',
  em_andamento: 'Atendimento em andamento',
  concluido: 'Atendimento concluído',
  cancelado: 'Atendimento cancelado'
};
