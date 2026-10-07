// Tema escolhido pelo usuário ('claro' | 'escuro').
import { lerTexto, gravarTexto } from './storage.js';

const CHAVE = 'sos-car-tema';

export const lerTemaSalvo = () => lerTexto(CHAVE);
export const guardarTema = (tema) => gravarTexto(CHAVE, tema);
