// Serviço público de rotas (OSRM). É um serviço de terceiros — não passa pelo backend do SOSCAR.
// Os endereços liberados na Content-Security-Policy estão em scripts/env.js (connect-src).

// Busca a rota de carro entre dois pontos [lng, lat]; rejeita se o serviço estiver indisponível.
export function buscarRota(origemLngLat, destinoLngLat) {
  return fetch(
    `https://router.project-osrm.org/route/v1/driving/${origemLngLat.join(',')};${destinoLngLat.join(',')}?overview=full&geometries=geojson`
  ).then((res) => (res.ok ? res.json() : Promise.reject(new Error('Rota indisponível'))));
}
