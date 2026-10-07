// Botão "mostrar/ocultar senha" dos campos de senha.

document.querySelectorAll('[data-toggle-senha]').forEach((botao) => {
  const container = botao.closest('.campo-senha');
  const input = container ? container.querySelector('input') : null;
  if (!input) return;

  const alternar = () => {
    const oculto = input.type === 'password';
    input.type = oculto ? 'text' : 'password';
    botao.setAttribute('data-visivel', String(oculto));
    botao.setAttribute('aria-label', oculto ? 'Ocultar senha' : 'Mostrar senha');
    botao.title = oculto ? 'Ocultar senha' : 'Mostrar senha';
    botao.style.color = oculto ? 'var(--primary)' : 'var(--text-secondary)';
    input.focus();
  };

  botao.setAttribute('data-visivel', 'false');

  botao.addEventListener('click', alternar);
});
