// Estado mutável compartilhado entre os módulos da interface.
//
// Antes, tudo isto eram variáveis `let` dentro de uma única função gigante (o antigo app.js).
// Como agora cada tela mora em seu próprio módulo, o que é lido/escrito por mais de
// um módulo fica aqui, num objeto só — um único lugar para saber "o que o app lembra".
// (Variáveis usadas por um módulo só continuam locais ao próprio módulo.)

export const state = {
  // setInterval usado para atualizar a tela periodicamente (novos
  // chamados disponíveis, mudança de status etc.), sem precisar de
  // WebSockets — o navegador simplesmente pergunta de novo à API a
  // cada alguns segundos ("polling"). Guardamos aqui o id do interval
  // atual para poder cancelá-lo ao trocar de tela ou deslogar.
  intervaloAtualizacao: null,
  // Guarda o chamado que está sendo mostrado no momento (do cliente ou
  // do prestador, dependendo de quem está logado), para os botões de
  // ação (cancelar, aceitar, concluir...) saberem qual id usar.
  chamadoEmFoco: null,
  usuarioTipoAtual: null,
  ultimoUsuario: null,
  perfilSelecionado: 'cliente', // aba ativa do CADASTRO (cliente/prestador); o login não usa mais
  modoAuth: 'login', // 'login' ou 'cadastro': qual formulário está visível
  tokenRedefinicaoAtual: null, // token temporário (etapa 3) ou, para links antigos, o token do link
  watchIdCliente: null,
  // ---- Ordenação dos chamados disponíveis (prestador) ----
  // Feita pelo servidor, com a distância e as datas reais do banco.
  ordenacaoChamados: 'proximos',
  // Estado em destaque no topo do card do cliente. O texto muda na hora e, quando
  // o status muda de verdade (não na primeira exibição), ganha uma pequena transição.
  statusBannerChave: null,
  localizacaoPrestador: null,
  watchIdPrestador: null,
  chamadosDisponiveisAtuais: [],
  // true enquanto uma ação (Cheguei / Concluir / Cancelar) está a caminho do
  // servidor: trava novos cliques e faz a atualização automática ignorar
  // respostas que podem ter ficado velhas.
  acaoPrestadorEmCurso: false,
  // true depois de concluir/cancelar: o card fica na tela com o estado final
  // ("Atendimento concluído/cancelado") até o prestador voltar aos pedidos.
  prestadorVendoFinal: false,
};
