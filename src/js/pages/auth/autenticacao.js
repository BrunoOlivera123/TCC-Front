// Tela de autenticação: login e cadastro (cliente/prestador).

import { Anim } from '../../components/animations/animacoes.js';
import { comCarregamento } from '../../components/common/carregamento.js';
import { confirmar } from '../../components/modals/modalConfirmar.js';
import { entrarComoUsuario } from '../../core/sessao.js';
import { formCadastro } from './elementos.js';
import { authApi } from '../../services/api/auth.js';
import { authStorage } from '../../services/storage/authStorage.js';
import { state } from '../../state/appState.js';

// =================================================================
// Tela de autenticação (login / cadastro, cliente / prestador)
// =================================================================
const segPerfil = document.getElementById('seg-perfil'); // abas "Sou cliente" / "Sou prestador" (agora só no formulário de cadastro)

const tituloAuth = document.getElementById('titulo-auth'); // "Login" ou "Criar conta"
const btnIrCadastro = document.getElementById('btn-ir-cadastro'); // "Criar conta" (na tela de login)
const btnIrLogin = document.getElementById('btn-ir-login'); // "Já tenho conta" (na tela de cadastro)
const campoCategoria = document.getElementById('campo-categoria'); // só aparece para prestador
const formLogin = document.getElementById('form-login');
const authErro = document.getElementById('auth-erro');
const cartaoAuth = formLogin.closest('.cartao-auth');

// Índice de cada campo, usado no atraso em cascata da entrada (CSS: --i).
[formLogin, formCadastro].forEach((f) => [...f.children].forEach((c, i) => c.style.setProperty('--i', i)));

// Clique nas abas "Sou cliente" / "Sou prestador": marca visualmente a
// aba escolhida e mostra/esconde o campo de categoria, que só faz
// sentido para prestador.
segPerfil.addEventListener('click', (e) => {
  const botao = e.target.closest('[data-perfil]');
  if (!botao) return;
  state.perfilSelecionado = botao.dataset.perfil;
  [...segPerfil.children].forEach((b) => b.classList.toggle('ativo', b === botao));
  const ehPrestador = state.perfilSelecionado === 'prestador';
  campoCategoria.querySelector('select').required = ehPrestador;
  // O campo de categoria muda a altura do card de cadastro: anima.
  Anim.altura(cartaoAuth, () => campoCategoria.classList.toggle('oculto', !ehPrestador), {
    sai: ehPrestador || formCadastro.classList.contains('oculto') ? null : campoCategoria,
    entra: ehPrestador && !formCadastro.classList.contains('oculto') ? campoCategoria : null
  });
});

// Alterna entre a tela de login e a de criar conta (os dois botões de texto:
// "Criar conta" no login e "Já tenho conta" no cadastro).
export function mostrarModoAuth(modo) {
  if (modo === state.modoAuth) return;
  state.modoAuth = modo;
  // O card cresce/encolhe (Anim.altura): o formulário antigo some, a altura
  // anima e os campos novos entram em cascata. Card segue centralizado.
  cartaoAuth.classList.add('trocando');
  setTimeout(() => cartaoAuth.classList.remove('trocando'), 560);
  Anim.altura(cartaoAuth, () => {
    formLogin.classList.toggle('oculto', modo !== 'login');
    formCadastro.classList.toggle('oculto', modo !== 'cadastro');
    tituloAuth.textContent = modo === 'login' ? 'Login' : 'Criar conta';
    esconderErro();
  }, {
    sai: modo === 'cadastro' ? formLogin : formCadastro,
    entra: modo === 'cadastro' ? formCadastro : formLogin
  });
}

btnIrCadastro.addEventListener('click', () => mostrarModoAuth('cadastro'));

btnIrLogin.addEventListener('click', () => mostrarModoAuth('login'));

// Botões de chamada da landing (data-cta = "cliente" | "prestador" | "entrar"): abrem o
// formulário certo no cartão de acesso, rolam até ele e colocam o foco no primeiro campo.
document.querySelectorAll('[data-cta]').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const cta = el.dataset.cta;
    if (cta === 'entrar') mostrarModoAuth('login');
    else {
      mostrarModoAuth('cadastro');
      const aba = segPerfil.querySelector(`[data-perfil="${cta}"]`);
      if (aba && state.perfilSelecionado !== cta) aba.click();
    }
    const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    cartaoAuth.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'center' });
    const campo = (cta === 'entrar' ? formLogin : formCadastro).querySelector('input');
    setTimeout(() => campo && campo.focus({ preventScroll: true }), 400);
  });
});

// Mostra a mensagem de erro no cartão de login/cadastro, animando a altura do cartão.
export function mostrarErro(mensagem) {
  Anim.altura(cartaoAuth, () => {
    authErro.textContent = mensagem;
    authErro.classList.remove('oculto');
  }, { entra: authErro });
}

// Esconde a mensagem de erro do cartão de login/cadastro.
export function esconderErro() {
  authErro.classList.add('oculto');
}

// Envio do formulário de login. "FormData" + "Object.fromEntries" lê
// todos os campos do formulário de uma vez (pelo atributo "name" de
// cada <input>), sem precisar pegar um por um.
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault(); // impede o navegador de recarregar a página (comportamento padrão de <form>)
  esconderErro();
  const dados = Object.fromEntries(new FormData(formLogin));
  await comCarregamento(formLogin.querySelector('button[type="submit"]'), 'Entrando...', async () => {
    try {
      // Sem escolher perfil: o servidor descobre se a conta é de cliente ou de prestador.
      let resposta;
      try {
        resposta = await authApi.login(dados);
      } catch (err) {
        if (err.codigo !== 'ESCOLHER_PERFIL') throw err;
        // Mesmo e-mail e senha em uma conta de cliente E uma de prestador: pergunta qual usar.
        const comoPrestador = await confirmar(
          'Este email tem uma conta de cliente e uma de prestador. Deseja entrar como PRESTADOR? (Se cancelar, você entra como cliente.)'
        );
        resposta = await authApi.login({ ...dados, tipo: comoPrestador ? 'prestador' : 'cliente' });
      }
      const { token, usuario, tipo } = resposta;
      authStorage.definirToken(token);
      formLogin.reset();
      entrarComoUsuario(tipo, usuario);
    } catch (err) {
      mostrarErro(err.message);
    }
  });
});

// Envio do formulário de cadastro — mesma lógica do login, chamando
// authApi.registrar em vez de authApi.login.
formCadastro.addEventListener('submit', async (e) => {
  e.preventDefault();
  esconderErro();
  const dados = Object.fromEntries(new FormData(formCadastro));
  await comCarregamento(formCadastro.querySelector('button[type="submit"]'), 'Criando conta...', async () => {
    try {
      const resposta = await authApi.registrar({ tipo: state.perfilSelecionado, ...dados });
      formCadastro.reset();

      if (state.perfilSelecionado === 'prestador' && resposta && resposta.mensagem) {
        mostrarErro(resposta.mensagem);
        return;
      }

      const { token, usuario } = resposta;
      authStorage.definirToken(token);
      entrarComoUsuario(state.perfilSelecionado, usuario);
    } catch (err) {
      mostrarErro(err.message);
    }
  });
});
