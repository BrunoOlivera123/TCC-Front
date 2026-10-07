// Cliente HTTP central do SOSCAR-BACKEND.
//
// Nenhuma outra parte do front-end usa "fetch" para o backend — todo mundo passa por
// aqui. Fica num único lugar: o endereço base da API, como o token de sessão é anexado
// às requisições e como os erros viram uma mensagem de texto simples.
import { obterToken, definirToken } from '../storage/authStorage.js';

// Endereço do backend: vem de js/config.js (gerado a partir de API_URL no .env pelo
// "npm run dev" / "npm run build"). É o ÚNICO lugar que conhece a URL da API.
const CONFIG = window.SOSCAR_CONFIG || {};
const BASE = String(CONFIG.API_URL || '').replace(/\/+$/, '') + '/api';

// Disparado no window quando o servidor recusa o token (sessão vencida ou servidor reiniciado).
export const EVENTO_SESSAO_EXPIRADA = 'sessao-expirada';

// Monta e envia a requisição, sempre anexando o token (se existir) e traduzindo respostas
// de erro em um "throw" simples, para quem chamou poder usar try/catch normalmente.
export async function requisitar(caminho, opcoes = {}) {
  const token = obterToken();
  const cabecalhos = { 'Content-Type': 'application/json', ...(opcoes.headers || {}) };
  if (token) cabecalhos.Authorization = `Bearer ${token}`;

  let resposta;
  try {
    resposta = await fetch(BASE + caminho, { cache: 'no-store', ...opcoes, headers: cabecalhos });
  } catch {
    // fetch só rejeita quando não chegou ao servidor (sem internet, servidor fora do ar).
    const semConexao = new Error('Sem conexão com o servidor. Verifique sua internet e tente novamente.');
    semConexao.status = 0; // 0 = nem chegou ao servidor
    throw semConexao;
  }

  // 204 ("sem conteúdo", ex.: logout) não tem corpo; nas demais, se o JSON falhar seguimos com null.
  const corpo = resposta.status === 204 ? null : await resposta.json().catch(() => null);

  if (!resposta.ok) {
    // Token enviado e recusado (401): a sessão acabou. Avisa a interface, que leva ao login.
    if (resposta.status === 401 && token) {
      definirToken(null);
      window.dispatchEvent(new CustomEvent(EVENTO_SESSAO_EXPIRADA));
    }
    // O backend sempre manda { erro: "mensagem" } quando algo dá errado.
    const erro = new Error((corpo && corpo.erro) || 'Ocorreu um erro inesperado.');
    erro.status = resposta.status;
    // Códigos opcionais do servidor (ex.: PERFIL_INCOMPLETO + lista "faltam").
    if (corpo && corpo.codigo) erro.codigo = corpo.codigo;
    if (corpo && Array.isArray(corpo.faltam)) erro.faltam = corpo.faltam;
    if (corpo && corpo.pendente) erro.pendente = true;
    throw erro;
  }
  return corpo;
}

// Atalho para enviar JSON.
export const enviar = (metodo, caminho, dados) =>
  requisitar(caminho, { method: metodo, ...(dados !== undefined ? { body: JSON.stringify(dados) } : {}) });
