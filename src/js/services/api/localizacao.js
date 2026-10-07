// Geocodificação (endereço <-> coordenadas), feita pelo backend.
import { requisitar } from './client.js';

export const localizacaoApi = {
  geocodificar: (endereco) => requisitar(`/localizacao/geocodificar?endereco=${encodeURIComponent(endereco)}`),
  reverseGeocodificar: (latitude, longitude) =>
    requisitar(`/localizacao/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`)
};
