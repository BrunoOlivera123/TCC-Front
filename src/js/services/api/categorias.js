// Categorias de serviço.
import { requisitar } from './client.js';

export const categoriasApi = {
  categorias: () => requisitar('/categorias')
};
