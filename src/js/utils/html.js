// Segurança de HTML: escape de texto vindo da API antes de usar em innerHTML.

// Escapa caracteres especiais de HTML antes de inserir texto vindo da
// API (nome, endereço, descrição etc.) dentro de innerHTML. Sem isso,
// alguém poderia cadastrar um nome como "<img src=x onerror=...>" e
// esse código rodaria no navegador de qualquer outro usuário que visse
// esse nome na tela (XSS armazenado).
export function escaparHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}
