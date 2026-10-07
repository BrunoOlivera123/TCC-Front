// Popup "Complete seu cadastro" (CPF/telefone) para contas criadas pelo Google.

import { Anim } from '../../components/animations/animacoes.js';
import { comCarregamento } from '../../components/common/carregamento.js';
import { toast } from '../../components/feedback/toast.js';
import { authApi } from '../../services/api/auth.js';
import { state } from '../../state/appState.js';

// =================================================================
// Popup "Complete seu cadastro" (CPF/telefone)
//
// Contas criadas pelo Google navegam livremente, mas só fazem pedido
// (cliente) ou aceitam chamado (prestador) depois de informar CPF e
// telefone. A regra de verdade está no servidor (403 PERFIL_INCOMPLETO);
// aqui o popup só deixa o caminho suave e retoma a ação depois de salvar.
// =================================================================
const modalPerfil = document.getElementById('modal-perfil');

const formPerfil = document.getElementById('form-perfil');
const perfilErro = document.getElementById('perfil-erro');
const perfilCampoCpf = document.getElementById('perfil-campo-cpf');
const perfilCampoTelefone = document.getElementById('perfil-campo-telefone');
const perfilCancelar = document.getElementById('perfil-cancelar');
let perfilEmAberto = null; // evita abrir o popup duas vezes ao mesmo tempo

// Quais dados ainda faltam no perfil do usuário logado (['cpf', 'telefone']).
// Vem do servidor (campo "pendencias"); lista vazia = perfil completo.
function pendenciasDoPerfil() {
  return state.ultimoUsuario && Array.isArray(state.ultimoUsuario.pendencias) ? state.ultimoUsuario.pendencias : [];
}

// Abre o popup e devolve uma Promise: true = perfil salvo, false = desistiu.
function pedirCompletarPerfil(faltam) {
  if (perfilEmAberto) return perfilEmAberto;
  perfilCampoCpf.classList.toggle('oculto', !faltam.includes('cpf'));
  perfilCampoTelefone.classList.toggle('oculto', !faltam.includes('telefone'));
  formPerfil.reset();
  perfilErro.classList.add('oculto');
  modalPerfil.classList.remove('oculto');
  const primeiro = formPerfil.querySelector('label:not(.oculto) input');
  if (primeiro) primeiro.focus();

  perfilEmAberto = new Promise((resolve) => {
    // Fecha o popup e entrega o resultado (true = salvou, false = desistiu).
    function encerrar(resultado) {
      formPerfil.removeEventListener('submit', aoEnviar);
      perfilCancelar.removeEventListener('click', aoCancelar);
      document.removeEventListener('keydown', aoTecla);
      Anim.sair(modalPerfil, 'saindo', 160).then(() => modalPerfil.classList.add('oculto'));
      perfilEmAberto = null;
      resolve(resultado);
    }
    // Envio do formulário do popup: manda ao servidor só os campos que faltam.
    async function aoEnviar(e) {
      e.preventDefault();
      perfilErro.classList.add('oculto');
      const dados = {};
      if (faltam.includes('cpf')) dados.cpf = formPerfil.elements.cpf.value;
      if (faltam.includes('telefone')) dados.telefone = formPerfil.elements.telefone.value;
      await comCarregamento(formPerfil.querySelector('button[type="submit"]'), 'Salvando...', async () => {
        try {
          const { usuario } = await authApi.completarPerfil(dados);
          state.ultimoUsuario = { ...(state.ultimoUsuario || {}), ...usuario };
          encerrar(true);
        } catch (err) {
          perfilErro.textContent = err.message;
          perfilErro.classList.remove('oculto');
        }
      });
    }
    // Botão "agora não".
    function aoCancelar() { encerrar(false); }
    // Tecla Esc também fecha o popup.
    function aoTecla(ev) { if (ev.key === 'Escape') encerrar(false); }
    formPerfil.addEventListener('submit', aoEnviar);
    perfilCancelar.addEventListener('click', aoCancelar);
    document.addEventListener('keydown', aoTecla);
  });
  return perfilEmAberto;
}

// Antes de fazer pedido / aceitar chamado: true = pode seguir.
export async function garantirPerfilCompleto() {
  const faltam = pendenciasDoPerfil();
  return faltam.length === 0 ? true : pedirCompletarPerfil(faltam);
}

// O servidor recusou por perfil incompleto (dado local desatualizado): abre o popup.
export function tratarPerfilIncompleto(err) {
  if (!err || err.codigo !== 'PERFIL_INCOMPLETO') return false;
  state.ultimoUsuario = { ...(state.ultimoUsuario || {}), pendencias: err.faltam || ['cpf', 'telefone'] };
  pedirCompletarPerfil(state.ultimoUsuario.pendencias).then((salvou) => {
    if (salvou) toast('Cadastro completo. Agora é só repetir a ação.', 'sucesso');
  });
  return true;
}
