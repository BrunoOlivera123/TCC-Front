// Painel administrativo: login do admin, estatísticas, categorias, prestadores e chamados.

import { comCarregamento } from '../../components/common/carregamento.js';
import { toast } from '../../components/feedback/toast.js';
import { carregarCategorias } from '../../components/forms/categoriaCards.js';
import { confirmar } from '../../components/modals/modalConfirmar.js';
import { iniciarAtualizacaoAutomatica, pararAtualizacaoAutomatica } from '../../core/atualizacao.js';
import { mostrarTela } from '../../core/telas.js';
import { adminLoginEl, adminPainelEl } from './elementos.js';
import { adminApi } from '../../services/api/admin.js';
import { authApi } from '../../services/api/auth.js';
import { authStorage } from '../../services/storage/authStorage.js';
import { state } from '../../state/appState.js';
import { formatarData, rotuloStatus } from '../../utils/formatters.js';
import { escaparHtml } from '../../utils/html.js';

// =================================================================
// Painel administrativo
// Sem cadastro público — só a conta fixa definida no servidor (ver
// ADMIN_EMAIL/ADMIN_SENHA em src/server.js do SOSCAR-BACKEND). O acesso é feito pelo
// link discreto "Acesso administrativo" no rodapé (ver seção de links
// do rodapé, mais acima).
// =================================================================
const formAdminLogin = document.getElementById('form-admin-login');

const adminLoginErro = document.getElementById('admin-login-erro');
const statClientes = document.getElementById('stat-clientes');
const statPrestadores = document.getElementById('stat-prestadores');
const statChamados = document.getElementById('stat-chamados');
const statChamadosAbertos = document.getElementById('stat-chamados-abertos');
const adminListaCategorias = document.getElementById('admin-lista-categorias');
const adminFiltroStatus = document.getElementById('admin-filtro-status');
const adminTabelaChamados = document.querySelector('#admin-tabela-chamados tbody');
const adminTabelaUsuarios = document.querySelector('#admin-tabela-usuarios tbody');

if (formAdminLogin) {
  formAdminLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    adminLoginErro.classList.add('oculto');
    const dados = Object.fromEntries(new FormData(formAdminLogin));
    await comCarregamento(formAdminLogin.querySelector('button[type="submit"]'), 'Entrando...', async () => {
      try {
        const { token, usuario } = await authApi.loginAdmin(dados);
        authStorage.definirToken(token);
        formAdminLogin.reset();
        state.usuarioTipoAtual = 'admin';
        state.ultimoUsuario = usuario;
        iniciarPainelAdmin();
      } catch (err) {
        adminLoginErro.textContent = err.message;
        adminLoginErro.classList.remove('oculto');
      }
    });
  });
}

// Chamada uma vez, logo após o login como admin.
export function iniciarPainelAdmin() {
  adminLoginEl.classList.add('oculta');
  adminPainelEl.classList.remove('oculta');
  mostrarTela('admin');
  pararAtualizacaoAutomatica();
  iniciarAtualizacaoAutomatica(atualizarPainelAdmin, 8000);
}

// Atualiza o painel do administrador: estatísticas, categorias e usuários.
async function atualizarPainelAdmin() {
  const [estatisticas, categorias, usuarios] = await Promise.all([
    adminApi.adminEstatisticas(),
    adminApi.adminCategorias(),
    adminApi.adminUsuarios()
  ]);

  statClientes.textContent = estatisticas.totalClientes;
  statPrestadores.textContent = estatisticas.totalPrestadores;
  statChamados.textContent = estatisticas.totalChamados;
  statChamadosAbertos.textContent = ['aberto', 'aceito', 'em_andamento'].reduce(
    (soma, status) => soma + (estatisticas.chamadosPorStatus[status] || 0),
    0
  );

  // Não redesenha a lista enquanto o admin está digitando um novo nome —
  // a cada 8 s isso apagaria o que ele acabou de escrever.
  if (!adminListaCategorias.querySelector('.categoria-input')) renderizarCategoriasAdmin(categorias);
  renderizarUsuariosAdmin(usuarios);
  await renderizarChamadosAdmin();
}

// Lista as categorias no painel admin, cada uma com o botão "Renomear".
function renderizarCategoriasAdmin(categorias) {
  adminListaCategorias.innerHTML = categorias
    .map(
      (c) => `
      <li class="item-categoria" data-categoria="${c.id}">
        <span class="categoria-nome">${escaparHtml(c.nome)}</span>
        <button type="button" class="botao-secundario botao-pequeno" data-editar-categoria="${c.id}">Renomear</button>
      </li>`
    )
    .join('');
}

// Um único listener de delegação cobre os três estados do "renomear
// categoria" (clicar em Renomear -> vira input; Salvar; Cancelar) —
// um miniformulário inline no lugar de usar prompt() nativo, para
// manter a mesma linha visual do resto do produto.
if (adminListaCategorias) {
  adminListaCategorias.addEventListener('click', async (e) => {
    const btnEditar = e.target.closest('[data-editar-categoria]');
    if (btnEditar) {
      const item = btnEditar.closest('.item-categoria');
      const nomeAtual = item.querySelector('.categoria-nome').textContent;
      item.innerHTML = `
          <input type="text" class="categoria-input" value="${escaparHtml(nomeAtual)}" />
          <div class="acoes">
            <button type="button" class="botao-primario botao-pequeno" data-salvar-categoria="${btnEditar.dataset.editarCategoria}">Salvar</button>
            <button type="button" class="botao-secundario botao-pequeno" data-cancelar-categoria>Cancelar</button>
          </div>`;
      item.querySelector('.categoria-input').focus();
      return;
    }

    if (e.target.closest('[data-cancelar-categoria]')) {
      renderizarCategoriasAdmin(await adminApi.adminCategorias());
      return;
    }

    const btnSalvar = e.target.closest('[data-salvar-categoria]');
    if (btnSalvar) {
      const item = btnSalvar.closest('.item-categoria');
      const novoNome = item.querySelector('.categoria-input').value.trim();
      if (novoNome) {
        try {
          await adminApi.adminRenomearCategoria(btnSalvar.dataset.salvarCategoria, novoNome);
          await carregarCategorias(); // atualiza também os <select> de cadastro/chamado
          toast('Categoria renomeada.', 'sucesso');
        } catch (err) {
          toast(err.message, 'erro');
        }
      }
      renderizarCategoriasAdmin(await adminApi.adminCategorias());
    }
  });
}

// Tabela de usuários do painel admin (clientes e prestadores), com status e o
// botão "Aprovar" para prestadores pendentes. Todo texto passa por escaparHtml.
function renderizarUsuariosAdmin({ clientes, prestadores }) {
  const linhas = [
    ...clientes.map((c) => ({ ...c, tipo: 'Cliente' })),
    ...prestadores.map((p) => ({ ...p, tipo: 'Prestador' }))
  ];
  adminTabelaUsuarios.innerHTML = linhas.length
    ? linhas
        .map((u) => {
          const statusTexto = u.tipo === 'Prestador'
            ? (u.aprovado === true ? 'Aprovado' : 'Pendente')
            : 'Ativo';
          // Conta criada pelo Google ainda sem CPF/telefone: o admin enxerga na tabela.
          const perfilIncompleto = Array.isArray(u.pendencias) && u.pendencias.length > 0;
          const botaoAprovar = u.tipo === 'Prestador' && u.aprovado !== true
            ? `<button type="button" class="botao-primario botao-pequeno" data-aprovar-prestador="${u.id}">Aprovar</button>`
            : '';

          return `
        <tr>
          <td>${escaparHtml(u.nome)}</td>
          <td>${escaparHtml(u.email)}</td>
          <td>${u.tipo}</td>
          <td>${escaparHtml(u.categoriaNome) || '—'}</td>
          <td>${statusTexto}${perfilIncompleto ? ' <span class="texto-auxiliar">(sem CPF/telefone)</span>' : ''}</td>
          <td>${botaoAprovar}</td>
        </tr>`;
        })
        .join('')
    : '<tr><td colspan="6" class="texto-auxiliar">Nenhum usuário cadastrado.</td></tr>';
}

if (adminTabelaUsuarios) {
  adminTabelaUsuarios.addEventListener('click', async (e) => {
    const botao = e.target.closest('[data-aprovar-prestador]');
    if (!botao) return;
    const id = botao.dataset.aprovarPrestador;
    try {
      try {
        await adminApi.adminAprovarPrestador(id);
      } catch (err) {
        // Prestador criado pelo Google, sem CPF/telefone: o servidor pede
        // confirmação explícita do admin antes de aprovar.
        if (err.codigo !== 'PERFIL_INCOMPLETO') throw err;
        const aprovar = await confirmar(
          'Este prestador entrou pelo Google e ainda não informou CPF e/ou telefone. Aprovar mesmo assim?'
        );
        if (!aprovar) return;
        await adminApi.adminAprovarPrestador(id, { confirmarSemPerfil: true });
      }
      await atualizarPainelAdmin();
      toast('Prestador aprovado com sucesso.', 'sucesso');
    } catch (err) {
      toast(err.message, 'erro');
    }
  });
}

// Tabela de chamados do painel admin, com filtro por status e botão de cancelar
// para os que ainda estão em andamento.
async function renderizarChamadosAdmin() {
  const lista = await adminApi.adminChamados(adminFiltroStatus.value);
  adminTabelaChamados.innerHTML = lista.length
    ? lista
        .map((c) => {
          const podeCancelar = ['aberto', 'aceito', 'em_andamento'].includes(c.status);
          return `
        <tr>
          <td>${escaparHtml(c.clienteNome)}</td>
          <td>${escaparHtml(c.prestadorNome) || '—'}</td>
          <td>${escaparHtml(c.categoriaNome)}</td>
          <td><span class="selo ${c.status === 'cancelado' ? 'selo-cancelado' : c.status === 'concluido' ? 'selo-concluido' : ''}">${rotuloStatus(c.status)}</span></td>
          <td>${formatarData(c.dataAbertura)}</td>
          <td>${podeCancelar ? `<button type="button" class="botao-perigo botao-pequeno" data-admin-cancelar="${c.id}">Cancelar</button>` : ''}</td>
        </tr>`;
        })
        .join('')
    : '<tr><td colspan="6" class="texto-auxiliar">Nenhum chamado encontrado.</td></tr>';
}

if (adminFiltroStatus) {
  adminFiltroStatus.addEventListener('change', renderizarChamadosAdmin);
}

if (adminTabelaChamados) {
  adminTabelaChamados.addEventListener('click', async (e) => {
    const botao = e.target.closest('[data-admin-cancelar]');
    if (!botao) return;
    if (!(await confirmar('Cancelar este chamado por moderação?'))) return;
    try {
      await adminApi.adminCancelarChamado(botao.dataset.adminCancelar);
      toast('Chamado cancelado.', 'sucesso');
      await atualizarPainelAdmin();
    } catch (err) {
      toast(err.message, 'erro');
    }
  });
}
