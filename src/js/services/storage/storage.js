// Acesso seguro ao localStorage — ÚNICO arquivo do front-end que o utiliza diretamente.
//
// Alguns navegadores (modo privado, dados de site bloqueados) lançam erro ao usar o
// localStorage; sem o try/catch o app inteiro deixaria de carregar. Aqui o erro vira
// "sem armazenamento": leituras devolvem o valor padrão e gravações devolvem false.

export function lerTexto(chave) {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

export function gravarTexto(chave, valor) {
  try {
    localStorage.setItem(chave, valor);
    return true;
  } catch {
    return false;
  }
}

export function remover(chave) {
  try {
    localStorage.removeItem(chave);
    return true;
  } catch {
    return false;
  }
}

// Lê um JSON guardado; devolve "padrao" se não existir, estiver corrompido ou o storage falhar.
export function lerJson(chave, padrao = null) {
  try {
    return JSON.parse(localStorage.getItem(chave) || 'null') ?? padrao;
  } catch {
    return padrao;
  }
}

export function gravarJson(chave, valor) {
  return gravarTexto(chave, JSON.stringify(valor));
}
