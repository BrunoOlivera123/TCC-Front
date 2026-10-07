// Central de Notificações (sino + contador + painel), comum a cliente e prestador.

import { toast } from '../feedback/toast.js';
import { notificacoesEl } from './elementos.js';
import { TOAST_POR_TIPO } from '../../constants/notificacoes.js';
import { notificacoesApi } from '../../services/api/notificacoes.js';
import { tempoRelativo } from '../../utils/formatters.js';

const btnNotificacoes = document.getElementById('btn-notificacoes');
const contadorNotificacoesEl = document.getElementById('contador-notificacoes');
const painelNotificacoesEl = document.getElementById('painel-notificacoes');
const listaNotificacoesEl = document.getElementById('lista-notificacoes');
const notificacoesVazioEl = document.getElementById('notificacoes-vazio');
const btnMarcarTodasLidas = document.getElementById('btn-marcar-todas-lidas');
let notificacoesAtuais = [];
let notificacoesVistas = new Set(); // ids já conhecidos: só o que for novo vira alerta visual
let notificacoesPrimeiraCarga = true; // a 1ª carga não gera alertas (só o contador)
let notificacoesEmCurso = false;

// Redesenha o sino de notificações: contador de não lidas (99+ no máximo), estado
// dos botões e a lista, só se algo mudou (evita piscar a cada atualização).
function desenharNotificacoes(naoLidas) {
  contadorNotificacoesEl.textContent = naoLidas > 99 ? '99+' : String(naoLidas);
  contadorNotificacoesEl.classList.toggle('oculto', naoLidas === 0);
  btnNotificacoes.setAttribute('aria-label', naoLidas ? `Notificações, ${naoLidas} não lidas` : 'Notificações');
  btnMarcarTodasLidas.disabled = naoLidas === 0;
  notificacoesVazioEl.classList.toggle('oculto', notificacoesAtuais.length > 0);
  // Redesenha só se algo mudou (evita piscar a lista a cada tique do polling).
  const assinatura = notificacoesAtuais.map((n) => `${n.id}:${n.lida ? 1 : 0}`).join('|');
  if (listaNotificacoesEl.dataset.assinatura === assinatura) return;
  listaNotificacoesEl.dataset.assinatura = assinatura;
  listaNotificacoesEl.replaceChildren(
    ...notificacoesAtuais.map((n) => {
      const li = document.createElement('li');
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = `item-notificacao${n.lida ? '' : ' nao-lida'}`;
      botao.dataset.notificacaoId = n.id;
      const texto = document.createElement('span');
      texto.className = 'item-notificacao-texto';
      texto.textContent = n.mensagem; // textContent: nunca interpreta HTML
      const hora = document.createElement('small');
      hora.textContent = tempoRelativo(n.dataCriacao);
      botao.append(texto, hora);
      li.appendChild(botao);
      return li;
    })
  );
}

// Busca as notificações no servidor (chamada a cada tique do polling). Depois da
// primeira carga, mostra um toast para cada notificação NOVA.
export async function atualizarNotificacoes() {
  if (notificacoesEmCurso || !notificacoesEl) return;
  notificacoesEmCurso = true;
  try {
    const { naoLidas, notificacoes } = await notificacoesApi.notificacoes();
    if (!notificacoesPrimeiraCarga) {
      notificacoes
        .filter((n) => !n.lida && !notificacoesVistas.has(n.id))
        .forEach((n) => toast(n.mensagem, TOAST_POR_TIPO[n.tipo] || 'info'));
    }
    notificacoes.forEach((n) => notificacoesVistas.add(n.id));
    notificacoesPrimeiraCarga = false;
    notificacoesAtuais = notificacoes;
    desenharNotificacoes(naoLidas);
  } finally {
    notificacoesEmCurso = false;
  }
}

// Zera o estado das notificações (logout / sessão expirada) para a próxima pessoa
// que entrar neste navegador não ver as da anterior.
export function reiniciarNotificacoes() {
  notificacoesAtuais = [];
  notificacoesVistas = new Set();
  notificacoesPrimeiraCarga = true;
  if (!notificacoesEl) return;
  fecharPainelNotificacoes();
  listaNotificacoesEl.replaceChildren();
  delete listaNotificacoesEl.dataset.assinatura;
  contadorNotificacoesEl.classList.add('oculto');
}

// Fecha o painel dropdown de notificações.
function fecharPainelNotificacoes() {
  painelNotificacoesEl.classList.add('oculto');
  btnNotificacoes.setAttribute('aria-expanded', 'false');
}

if (btnNotificacoes) {
  btnNotificacoes.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!painelNotificacoesEl.classList.contains('oculto')) return fecharPainelNotificacoes();
    painelNotificacoesEl.classList.remove('oculto');
    btnNotificacoes.setAttribute('aria-expanded', 'true');
    atualizarNotificacoes().catch(() => {}); // abre já com o que existe e atualiza em seguida
  });
  document.addEventListener('click', (e) => {
    if (!notificacoesEl.contains(e.target)) fecharPainelNotificacoes();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharPainelNotificacoes();
  });

  // Abrir uma notificação = marcá-la como lida (o servidor devolve o total certo).
  listaNotificacoesEl.addEventListener('click', async (e) => {
    const botao = e.target.closest('[data-notificacao-id]');
    if (!botao) return;
    const notificacao = notificacoesAtuais.find((n) => n.id === botao.dataset.notificacaoId);
    fecharPainelNotificacoes();
    if (!notificacao || notificacao.lida) return;
    try {
      await notificacoesApi.marcarNotificacaoLida(notificacao.id);
      await atualizarNotificacoes();
    } catch (err) {
      toast(err.message, 'erro');
    }
  });

  btnMarcarTodasLidas.addEventListener('click', async () => {
    try {
      await notificacoesApi.marcarTodasNotificacoesLidas();
      await atualizarNotificacoes();
    } catch (err) {
      toast(err.message, 'erro');
    }
  });
}
