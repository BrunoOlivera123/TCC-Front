// Token de sessão (o servidor devolve no login/cadastro e o front envia em Authorization: Bearer).
// Sem armazenamento disponível, a sessão só vale até fechar a aba.
import { lerTexto, gravarTexto, remover } from './storage.js';

const CHAVE_TOKEN = 'sos-car-token';

export function obterToken() {
  return lerTexto(CHAVE_TOKEN);
}

// token vazio/null apaga (usado no logout).
export function definirToken(token) {
  if (token) gravarTexto(CHAVE_TOKEN, token);
  else remover(CHAVE_TOKEN);
}

// Agrupado para uso como authStorage.obterToken() / authStorage.definirToken().
export const authStorage = { obterToken, definirToken };
