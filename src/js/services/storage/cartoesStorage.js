// Quais cards informativos o usuário já dispensou (id -> true).
import { lerJson, gravarJson } from './storage.js';

const CHAVE = 'sos-car-cartoes-dispensados';

export function lerDispensados() {
  const salvo = lerJson(CHAVE, {});
  return typeof salvo === 'object' ? salvo : {};
}

// Devolve false se não foi possível gravar (sem armazenamento).
export function gravarDispensados(todos) {
  return gravarJson(CHAVE, todos);
}
