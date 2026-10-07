// Cálculos geográficos.

// Distância em linha reta entre dois pontos [lat, lng], em km (fórmula de Haversine,
// igual à de src/utils/distancia.js no SOSCAR-BACKEND). Usada pelo mapa como plano B,
// quando o serviço de rotas (OSRM) não responde.
export function calcularDistanciaKm(origem, destino) {
  const toRad = (valor) => (valor * Math.PI) / 180;
  const lat1 = toRad(origem[0]);
  const lat2 = toRad(destino[0]);
  const dLat = toRad(destino[0] - origem[0]);
  const dLng = toRad(destino[1] - origem[1]);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}
