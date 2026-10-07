// =================================================================
// Service worker mínimo: só o necessário para o navegador considerar o
// SOS Car "instalável" (PWA) e funcionar de forma razoável offline para
// quem já visitou antes. Estratégia "network-first": tenta a rede
// primeiro (dados sempre atualizados) e só cai no cache se estiver
// offline — nunca serve uma versão desatualizada por engano enquanto
// há conexão.
//
// Instalação como app exige HTTPS (ou "localhost") — em http:// puro
// (ex.: acessando pelo IP da rede local) o navegador registra o service
// worker, mas não oferece a opção de instalar.
// =================================================================
// A versão sobe quando a estratégia de cache muda: o "activate" abaixo apaga
// os caches de versões antigas (a v1 acumulou tiles de mapa sem limite).
const CACHE = 'sos-car-v7';
const ARQUIVOS_ESSENCIAIS = [
  '/',
  '/styles/variables.css',
  '/styles/base.css',
  '/styles/layout.css',
  '/styles/components/forms.css',
  '/styles/components/cards-listas.css',
  '/styles/components/feedback.css',
  '/styles/layout-telas.css',
  '/styles/components/mapa.css',
  '/styles/pages/admin.css',
  '/styles/pages/institucional.css',
  '/styles/pages/prestador.css',
  '/styles/components/categoria-cards.css',
  '/styles/pages/cliente.css',
  '/styles/pages/admin-layout.css',
  '/styles/components/atendimento.css',
  '/styles/components/google-perfil-notificacoes.css',
  '/styles/pages/auth.css',
  '/styles/background.css',
  '/styles/pages/recuperacao-senha.css',
  '/js/components/animations/animacoes.js',
  '/js/components/cards/cartaoInfo.js',
  '/js/components/chamado/linhaTempo.js',
  '/js/components/chamado/listaHistorico.js',
  '/js/components/common/carregamento.js',
  '/js/components/common/feedbackBotao.js',
  '/js/components/feedback/toast.js',
  '/js/components/forms/alternarSenha.js',
  '/js/components/forms/categoriaCards.js',
  '/js/components/map/mapa.js',
  '/js/components/modals/modalConfirmar.js',
  '/js/components/modals/modalConfirmarChamado.js',
  '/js/components/notifications/centralNotificacoes.js',
  '/js/components/notifications/elementos.js',
  '/js/components/theme/tema.js',
  '/js/config.js',
  '/js/constants/atendimento.js',
  '/js/constants/categorias.js',
  '/js/constants/localizacao.js',
  '/js/constants/notificacoes.js',
  '/js/constants/recuperacaoSenha.js',
  '/js/core/atualizacao.js',
  '/js/core/boot.js',
  '/js/core/elementos.js',
  '/js/core/sessao.js',
  '/js/core/telas.js',
  '/js/main.js',
  '/js/pages/admin/elementos.js',
  '/js/pages/admin/painelAdmin.js',
  '/js/pages/auth/autenticacao.js',
  '/js/pages/auth/elementos.js',
  '/js/pages/auth/loginGoogle.js',
  '/js/pages/auth/recuperacaoSenha.js',
  '/js/pages/cliente/atendimentoCliente.js',
  '/js/pages/cliente/elementos.js',
  '/js/pages/cliente/painelCliente.js',
  '/js/pages/prestador/atendimentoPrestador.js',
  '/js/pages/prestador/elementos.js',
  '/js/pages/prestador/listaDisponiveis.js',
  '/js/pages/prestador/modaisPrestador.js',
  '/js/pages/prestador/painelPrestador.js',
  '/js/pages/profile/completarPerfil.js',
  '/js/pages/profile/configuracoes.js',
  '/js/services/api/admin.js',
  '/js/services/api/auth.js',
  '/js/services/api/categorias.js',
  '/js/services/api/chamados.js',
  '/js/services/api/client.js',
  '/js/services/api/localizacao.js',
  '/js/services/api/notificacoes.js',
  '/js/services/api/prestador.js',
  '/js/services/routing/osrm.js',
  '/js/services/storage/atendimentoStorage.js',
  '/js/services/storage/authStorage.js',
  '/js/services/storage/cartoesStorage.js',
  '/js/services/storage/storage.js',
  '/js/services/storage/temaStorage.js',
  '/js/state/appState.js',
  '/js/utils/erros.js',
  '/js/utils/formatters.js',
  '/js/utils/geo.js',
  '/js/utils/html.js',
  '/js/utils/masks.js',
  '/assets/images/logo.svg',
  '/manifest.json'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARQUIVOS_ESSENCIAIS)));
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  const url = new URL(request.url);

  // Só os arquivos do próprio app (GET, mesma origem) passam pelo cache.
  // Ficam de fora:
  //  - a API (agora em outra origem, no SOSCAR-BACKEND): precisa ser sempre
  //    dados atuais (ou falhar de verdade, para o app tratar);
  //  - o que vem de outros domínios (tiles do OpenStreetMap, Leaflet, fontes,
  //    servidor de rotas): guardá-los enchia o cache do celular sem limite a
  //    cada trecho de mapa visto.
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname === '/health'
  ) {
    return;
  }

  evento.respondWith(
    fetch(request)
      .then((resposta) => {
        // Erros (404/500) não vão para o cache, senão seriam servidos de
        // volta como se fossem a página de verdade quando estiver offline.
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copia));
        }
        return resposta;
      })
      .catch(() => caches.match(request))
  );
});
