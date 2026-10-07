// Tela de configurações do usuário (dados, categoria/raio do prestador, troca de senha).

import { comCarregamento } from '../../components/common/carregamento.js';
import { toast } from '../../components/feedback/toast.js';
import { renderizarCardsCategoria } from '../../components/forms/categoriaCards.js';
import { confirmar } from '../../components/modals/modalConfirmar.js';
import { btnConfig } from '../../core/elementos.js';
import { entrarComoUsuario } from '../../core/sessao.js';
import { irParaTela, mostrarTela } from '../../core/telas.js';
import { authApi } from '../../services/api/auth.js';
import { categoriasApi } from '../../services/api/categorias.js';
import { state } from '../../state/appState.js';
import { escaparHtml } from '../../utils/html.js';

const formConfig = document.getElementById('form-configuracoes');
const btnConfigCancel = document.getElementById('btn-config-cancel');
const campoCategoriaConfig = document.getElementById('campo-categoria-config');
const campoRaioConfig = document.getElementById('campo-raio-config');

// Troca de senha: pede a senha atual e só aparece se a conta TEM senha
// (contas criadas pelo Google não têm — ver "temSenha" em paraPublico, no servidor).
const campoSenhaAtualConfig = document.getElementById('campo-senha-atual-config');

const campoSenhaNovaConfig = document.getElementById('campo-senha-nova-config');
const avisoSemSenhaConfig = document.getElementById('aviso-sem-senha-config');
let categoriaConfigAtual = null;

// Botão de Configurações: abre a tela de config preenchida com os dados do usuário
if (btnConfig) {
  btnConfig.addEventListener('click', async () => {
    try {
      const { usuario } = await authApi.quemSouEu();
      // preenche o formulário
      formConfig.elements.nome.value = usuario.nome || '';
      formConfig.elements.telefone.value = usuario.telefone || '';
      campoCategoriaConfig.classList.toggle('oculto', state.usuarioTipoAtual !== 'prestador');
      campoRaioConfig.classList.toggle('oculto', state.usuarioTipoAtual !== 'prestador');
      if (state.usuarioTipoAtual === 'prestador') formConfig.elements.raioKm.value = usuario.raioKm != null ? usuario.raioKm : 15;
      if (state.usuarioTipoAtual === 'prestador') {
        const categorias = await categoriasApi.categorias();
        formConfig.elements.categoriaId.innerHTML = categorias
          .map((categoria) => `<option value="${categoria.id}">${escaparHtml(categoria.nome)}</option>`)
          .join('');
        formConfig.elements.categoriaId.value = String(usuario.categoriaId);
        categoriaConfigAtual = String(usuario.categoriaId);
        renderizarCardsCategoria(formConfig.elements.categoriaId);
      }
      formConfig.elements.senha.value = '';
      formConfig.elements.senhaAtual.value = '';
      // Conta só-Google: não há senha para trocar. Esconde os campos e explica
      // o caminho (Esqueceu sua senha?), que prova o controle do e-mail.
      const temSenha = usuario.temSenha !== false;
      campoSenhaAtualConfig.classList.toggle('oculto', !temSenha);
      campoSenhaNovaConfig.classList.toggle('oculto', !temSenha);
      avisoSemSenhaConfig.classList.toggle('oculto', temSenha);
      mostrarTela('config');
    } catch (err) {
      toast('Não foi possível carregar seus dados: ' + err.message, 'erro');
    }
  });
}

// Envio do formulário de configurações: atualiza usuário via API
if (formConfig) {
  formConfig.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(formConfig));
    // Sem nova senha, não envia nenhum dos dois campos de senha.
    if (!dados.senha) {
      delete dados.senha;
      delete dados.senhaAtual;
    }
    if (state.usuarioTipoAtual !== 'prestador') delete dados.categoriaId;
    // Raio só existe para prestador; o servidor revalida (1–100 km, número).
    if (state.usuarioTipoAtual !== 'prestador' || dados.raioKm === '') delete dados.raioKm;
    else dados.raioKm = Number(dados.raioKm);
    const trocouCategoria =
      state.usuarioTipoAtual === 'prestador' && dados.categoriaId !== categoriaConfigAtual;
    if (trocouCategoria && !(await confirmar('Trocar sua categoria de atendimento? Os próximos chamados serão dessa nova categoria.'))) {
      return;
    }
    await comCarregamento(formConfig.querySelector('button[type="submit"]'), 'Salvando...', async () => {
      try {
        await authApi.atualizarUsuario(dados);
        // lê os dados atualizados e reentra no painel apropriado
        const me = await authApi.quemSouEu();
        entrarComoUsuario(me.tipo, me.usuario);
        toast('Dados atualizados com sucesso.', 'sucesso');
      } catch (err) {
        toast(err.message, 'erro');
      }
    });
  });
}

if (btnConfigCancel) {
  btnConfigCancel.addEventListener('click', () => {
    if (state.usuarioTipoAtual && state.ultimoUsuario) entrarComoUsuario(state.usuarioTipoAtual, state.ultimoUsuario);
    else irParaTela('auth');
  });
}
