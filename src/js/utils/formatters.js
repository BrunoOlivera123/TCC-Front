// Formatadores de texto (datas, distância, tempo, endereço, status). Funções puras, sem DOM.

// Traduz o status técnico (igual ao salvo no banco) para um texto
// amigável de mostrar na tela.
export function rotuloStatus(status) {
  return (
    {
      aberto: 'Aberto',
      aceito: 'Aceito · a caminho',
      // O prestador chega ao local e toca em "Cheguei ao local" — é esse
      // clique que leva o chamado a "em_andamento".
      em_andamento: 'Prestador chegou ao local',
      concluido: 'Concluído',
      cancelado: 'Cancelado'
    }[status] || status
  );
}

// Data ISO -> texto no formato brasileiro curto (ex.: 18/09/26 15:01).
export function formatarData(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// Distância em linha reta entre dois pontos {latitude, longitude}, em km
// (fórmula de Haversine; mesma lógica de src/utils/distancia.js no SOSCAR-BACKEND).
function calcularDistanciaKm(origem, destino) {
  const toRad = (valor) => (valor * Math.PI) / 180;
  const lat1 = toRad(origem.latitude);
  const lat2 = toRad(destino.latitude);
  const dLat = toRad(destino.latitude - origem.latitude);
  const dLng = toRad(destino.longitude - origem.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Formata minutos para leitura humana: 45 -> "45 min", 135 -> "2h 15min".
export function formatarTempoEstimado(minutos) {
  const totalMinutos = Math.max(1, Math.round(minutos));
  if (totalMinutos < 60) return `${totalMinutos} min`;
  const horas = Math.floor(totalMinutos / 60);
  const minsRestantes = totalMinutos % 60;
  return minsRestantes ? `${horas}h ${minsRestantes}min` : `${horas}h`;
}

// Estimativa simples de tempo de chegada a partir da distância, supondo 32 km/h
// de média na cidade (mínimo de 3 min). É só uma estimativa, não uma rota real.
export function tempoMedioChegada(distanciaKm) {
  if (typeof distanciaKm !== 'number' || !Number.isFinite(distanciaKm)) return 'Tempo não disponível';
  const minutos = Math.max(3, (distanciaKm / 32) * 60);
  return formatarTempoEstimado(minutos);
}

// Reduz um endereço longo (do Nominatim) a poucas partes, para caber nos cards.
export function resumirEndereco(endereco) {
  const texto = String(endereco ?? '').trim();
  if (!texto) return 'Endereço não informado';

  const partes = texto
    .split(',')
    .map((parte) => parte.trim())
    .filter(Boolean);

  if (!partes.length) return 'Endereço não informado';

  const rua = partes.find((parte) => /(rua|avenida|alameda|travessa|praça|rodovia|logradouro|bairro)/i.test(parte)) || partes[0];
  const cidade = partes.find((parte) => !/(rua|avenida|alameda|travessa|praça|rodovia|logradouro|bairro|pais|brasil|estado|cep|numero|n\.?\s*\d+)/i.test(parte)) || partes[partes.length - 1];

  if (!cidade || cidade === rua) return rua;
  return `${rua}, ${cidade}`;
}

// Descrição do chamado, ou "Sem descrição" quando o cliente não escreveu nada.
export function textoDescricao(chamado) {
  const descricao = String(chamado?.descricao ?? '').trim();
  return descricao || 'Sem descrição';
}

// Hora do evento; quando cai em outro dia que o de referência, inclui a data.
export function formatarHoraEvento(iso, referencia) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  const mesmoDia = referencia && new Date(referencia).toDateString() === data.toDateString();
  return mesmoDia
    ? data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// "3,4 km" (vírgula decimal).
export function formatarKm(km) {
  const n = Number(km);
  if (!Number.isFinite(n)) return '';
  return `${(Math.round(n * 10) / 10).toString().replace('.', ',')} km`;
}

// Tempo decorrido em texto curto: "agora", "há 5 min", "há 2 h", "há 3 d".
export function tempoRelativo(iso) {
  const seg = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (!Number.isFinite(seg)) return '';
  if (seg < 60) return 'agora';
  if (seg < 3600) return `há ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `há ${Math.floor(seg / 3600)} h`;
  return `há ${Math.floor(seg / 86400)} d`;
}
