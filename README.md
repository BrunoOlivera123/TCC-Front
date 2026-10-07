# SOSCAR — Frontend

Interface do **SOS Car** (TCC "Sistema de SOS para Veículos Automotores"): HTML, CSS e JavaScript puro (sem framework), instalável como PWA.
Mostra as telas (cliente, prestador, administrador), valida a interface, controla a navegação e **consome a API do projeto SOSCAR-BACKEND**. Não acessa o banco de dados e não guarda nenhum segredo.

```
Usuário ▶ SOSCAR-FRONTEND ──HTTP/REST──▶ SOSCAR-BACKEND ▶ MySQL
```

## Requisitos

- Node.js 18 ou superior (só para o servidor de desenvolvimento e o build; **não há dependências para instalar**)
- O SOSCAR-BACKEND em execução

## Instalação e execução local

```bash
npm install            # não baixa nada (sem dependências), mas é seguro rodar
cp .env.example .env   # Windows: copy .env.example .env
npm run dev
```

Abra **http://localhost:5173**. O backend precisa estar no ar no endereço de `API_URL`.

> O backend sobe em HTTPS por padrão, com certificado autoassinado. Antes do primeiro uso, abra `https://localhost:3000/health` no navegador e aceite o aviso; sem isso as chamadas da página falham. Alternativa: suba o backend com `USAR_HTTPS=0` e use `API_URL=http://localhost:3000`.

## Configuração (`.env`)

| Variável | Para quê |
|---|---|
| `API_URL` | Endereço do backend, sem barra no final (padrão `https://localhost:3000`) |
| `PORT`, `HOST` | Porta/host do servidor de desenvolvimento (padrão `5173`) |
| `TLS_CERT_FILE`, `TLS_KEY_FILE` | HTTPS local opcional (necessário para testar GPS pelo celular na rede) |
| `CSP_ENFORCAR` | `1` faz a Content-Security-Policy bloquear (padrão: só avisa no console) |

A URL da API é lida **em um só lugar**: o `.env` gera `js/config.js` (`window.SOSCAR_CONFIG.API_URL`) e `src/js/services/api/` é a única camada que faz chamadas ao backend. Só valores públicos entram aqui — senhas, chaves e dados do banco ficam no backend.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Serve `src/` em `http://localhost:5173` (gera `js/config.js` na hora) |
| `npm run build` | Gera `dist/` pronto para hospedagem estática (`js/config.js` + `_headers` com CSP) |
| `npm run preview` | Serve `dist/` localmente para conferir o build |
| `npm run verificar` | Checa imports, service worker e referências do HTML; proíbe `fetch`/`localStorage` fora de `services/` |

## Build e produção

```bash
API_URL=https://api.seudominio.com npm run build     # ou defina API_URL no .env
```

Publique o conteúdo de `dist/` em qualquer hospedagem estática com HTTPS (Netlify, Cloudflare Pages, Nginx etc.). O arquivo `dist/_headers` já traz a Content-Security-Policy no formato Netlify/Cloudflare; em outros servidores, replique esses cabeçalhos. Depois:

1. No backend, inclua o endereço do site em `CORS_ORIGINS`.
2. Se usar Google Login, cadastre o endereço do site em "Origens JavaScript autorizadas" no Google Cloud Console.

## Estrutura

HTML, CSS e JavaScript puros: o navegador carrega os módulos ES diretamente (`<script type="module">`), sem bundler.

```
src/
  index.html             página única (as telas são alternadas por JavaScript)
  manifest.json, sw.js   PWA (instalável; service worker network-first)
  assets/images/         logo (png/svg)
  styles/                CSS em ordem de cascata (ver <link> no index.html)
    variables.css, base.css, layout*.css, background.css
    components/          forms, cards-listas, feedback, mapa, categoria-cards, atendimento, ...
    pages/               auth, cliente, prestador, admin, institucional, recuperacao-senha
  js/
    main.js              ponto de entrada: importa os módulos e chama iniciar()
    config.js            URL da API (gerado a partir do .env; carregado antes do main.js)
    core/                boot, sessão (entrar/sair/expirar), telas (navegação), atualização (polling)
    pages/               uma pasta por contexto: auth, profile, cliente, prestador, admin
    components/          peças reutilizáveis: feedback (toast), modals, forms, chamado, notifications, map, cards, theme, animations, common
    services/
      api/               ÚNICA camada que fala com o backend: client.js (token, erros, URL base) + um arquivo por domínio
      storage/           ÚNICO lugar que usa localStorage (token, tema, cards dispensados, eventos vistos)
      routing/           serviço público de rotas (OSRM)
    state/appState.js    estado mutável compartilhado entre módulos (usuário atual, chamado em foco, GPS...)
    utils/               funções puras: formatters, html (escape), erros, geo, masks
    constants/           textos e valores fixos
scripts/                 dev.js, build.js, env.js, verificar.js (sem dependências)
```

Onde fica cada coisa: telas em `js/pages/`, componentes em `js/components/`, chamadas à API em `js/services/api/`, autenticação em `js/services/api/auth.js` + `js/services/storage/authStorage.js` + `js/core/sessao.js`, utilitários em `js/utils/`, imagens em `assets/`, estilos em `styles/`.

Convenções:

- Nomes de arquivos em `camelCase.js`; pastas de contexto em português (`cliente`, `prestador`), pastas estruturais em inglês (`components`, `services`, `utils`).
- Cada página (`pages/*`) cuida de uma tela: pega seus elementos do DOM, registra listeners e chama `services/api`. Elementos usados por mais de um módulo da mesma pasta ficam em `elementos.js`.
- Não use `fetch` nem `localStorage` fora de `services/` — `npm run verificar` acusa.
- Estado compartilhado entre módulos vai em `state/appState.js`; o que só um módulo usa fica local a ele.
- Aliases de import (`@/`) não são possíveis sem bundler (import maps inline são bloqueados pela CSP); por isso a árvore é rasa e os imports são relativos.
- Ao criar/remover um `.js`, atualize a lista do `sw.js` (o `npm run verificar` confere).

## Como a autenticação funciona aqui

O frontend envia login/cadastro/Google/recuperação de senha ao backend e guarda só o token de sessão devolvido (`localStorage`), enviado em `Authorization: Bearer`. Toda validação real (senha, código de 6 dígitos, ID token do Google, permissões) acontece no backend.
