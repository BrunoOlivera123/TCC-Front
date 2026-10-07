// Ícones e descrições das categorias de serviço.

// ---- Seleção de categoria em cards (visual) ----------------------
// Cada categoria fixa tem um ícone e uma cor de destaque próprios,
// usados nos cards. O nome vem do servidor (ver src/db.js no SOSCAR-BACKEND); aqui
// só cuidamos da aparência. Categorias não mapeadas caem no ícone
// genérico (ferramenta) sem quebrar nada.
export const CATEGORIA_INFO = {
  'Mecânico': {
    cor: '#64748B',
    descricao: 'Serviços mecânicos em geral.',
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L2 19l3 3 7.3-7.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8z"/></svg>'
  },
  'Borracheiro': {
    cor: '#64748B',
    descricao: 'Reparos em pneus.',
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M21 12h-3M6 12H3M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7 5.6 5.6"/></svg>'
  },
  'Auto Elétrica': {
    cor: '#64748B',
    descricao: 'Serviços elétricos em geral.',
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>'
  },
  'Guincho': {
    cor: '#64748B',
    descricao: 'Reboque e transporte do veículo.',
    icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17h1a2 2 0 0 0 4 0h7a2 2 0 0 0 4 0h1"/><path d="M3 17V8l4-1 3 4h4l3-3 4 2v7"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>'
  }
};

export const CATEGORIA_PADRAO = {
  cor: '#64748B',
  descricao: 'Serviço de assistência automotiva.',
  icone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L2 19l3 3 7.3-7.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8z"/></svg>'
};
