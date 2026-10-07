// Recuperação de senha por código de 6 dígitos (e-mail → código → nova senha → confirmação).
// =================================================================
// Esqueci minha senha — recuperação por código de 6 dígitos
//
//   1) tela-esqueci-senha    : e-mail -> authApi.esqueciSenha (servidor envia o código)
//   2) tela-verificar-codigo : 6 campos -> authApi.validarCodigoRedefinicao
//                              (servidor devolve um token TEMPORÁRIO)
//   3) tela-redefinir-senha  : nova senha -> authApi.redefinirSenha (usa o token)
//   4) tela-senha-alterada   : confirmação
//
// O e-mail e o token ficam SÓ em variáveis desta função: nunca na URL, em
// localStorage ou em sessionStorage. Sem token, a tela 3 não abre. A
// autorização de verdade é do servidor (o token é conferido lá).
// =================================================================

import { comCarregamento } from '../../components/common/carregamento.js';
import { toast } from '../../components/feedback/toast.js';
import { ERRO_VERIFICACAO_EXPIRADA, MAX_REENVIOS, TEMPO_REENVIO_S } from '../../constants/recuperacaoSenha.js';
import { irParaTela } from '../../core/telas.js';
import { authApi } from '../../services/api/auth.js';
import { state } from '../../state/appState.js';

const btnEsqueciSenha = document.getElementById('btn-esqueci-senha');
const formEsqueciSenha = document.getElementById('form-esqueci-senha');
const esqueciSenhaErro = document.getElementById('esqueci-senha-erro');
const formVerificarCodigo = document.getElementById('form-verificar-codigo');
const codigoCamposEl = document.getElementById('codigo-campos');
const codigoCampos = codigoCamposEl ? Array.from(codigoCamposEl.querySelectorAll('input')) : [];
const codigoStatusEl = document.getElementById('codigo-status');
const codigoErroEl = document.getElementById('codigo-erro');
const codigoEmailDestinoEl = document.getElementById('codigo-email-destino');
const codigoContadorEl = document.getElementById('codigo-contador');
const btnValidarCodigo = document.getElementById('btn-validar-codigo');
const btnReenviarCodigo = document.getElementById('btn-reenviar-codigo');
const btnCodigoVoltar = document.getElementById('btn-codigo-voltar');
const formRedefinirSenha = document.getElementById('form-redefinir-senha');
const redefinirSenhaErro = document.getElementById('redefinir-senha-erro');
const novaSenhaInput = document.getElementById('nova-senha');
const confirmarSenhaInput = document.getElementById('confirmar-senha');
const requisitosSenhaEl = document.getElementById('requisitos-senha');
const btnSenhaAlteradaLogin = document.getElementById('btn-senha-alterada-login');
let emailRedefinicao = null; // e-mail digitado na etapa 1 (só em memória)
let reenviosFeitos = 0;
let intervaloReenvio = null;
let codigoBloqueado = false; // código expirou/esgotou tentativas: só um novo código resolve
let codigoValidando = false;

function mostrarMensagem(el, mensagem) {
  if (!el) return;
  el.textContent = mensagem || '';
  el.classList.toggle('oculto', !mensagem);
}

function pararContadorReenvio() {
  if (intervaloReenvio) clearInterval(intervaloReenvio);
  intervaloReenvio = null;
}

// Contador de 60 s: enquanto corre mostra o aviso; ao zerar troca pelo botão.
function iniciarContadorReenvio() {
  pararContadorReenvio();
  let restante = TEMPO_REENVIO_S;
  const desenhar = () => {
    const acabou = restante <= 0;
    btnReenviarCodigo.classList.toggle('oculto', !acabou);
    codigoContadorEl.classList.toggle('oculto', acabou);
    if (!acabou) {
      codigoContadorEl.textContent = `Você poderá solicitar um novo código em ${restante} segundo${restante === 1 ? '' : 's'}.`;
    }
  };
  desenhar();
  intervaloReenvio = setInterval(() => {
    restante -= 1;
    desenhar();
    if (restante <= 0) pararContadorReenvio();
  }, 1000);
}

function valorDoCodigo() {
  return codigoCampos.map((c) => c.value).join('');
}

// Atualiza o que depende do código digitado: botão, destaque de "completo"
// e a mensagem de status. Chamada a cada digitação.
function atualizarEstadoCodigo() {
  const completo = valorDoCodigo().length === 6;
  codigoCamposEl.classList.toggle('completo', completo && !codigoBloqueado);
  btnValidarCodigo.disabled = !completo || codigoBloqueado || codigoValidando;
  if (!codigoCamposEl.classList.contains('verificado')) {
    codigoStatusEl.textContent = completo && !codigoBloqueado ? 'Código completo' : '';
    codigoStatusEl.classList.remove('ok');
    codigoStatusEl.classList.toggle('pronto', completo && !codigoBloqueado);
  }
}

function limparCampos({ focar = true } = {}) {
  codigoCampos.forEach((c) => {
    c.value = '';
    c.disabled = false;
  });
  codigoCamposEl.classList.remove('erro', 'verificado', 'completo');
  codigoStatusEl.classList.remove('ok', 'pronto');
  codigoStatusEl.textContent = '';
  atualizarEstadoCodigo();
  if (focar && codigoCampos[0]) codigoCampos[0].focus();
}

// Distribui dígitos (colados ou preenchidos pelo autopreenchimento do celular)
// a partir do campo "inicio".
function preencherCodigo(inicio, texto) {
  const digitos = String(texto).replace(/\D/g, '').slice(0, 6 - inicio);
  digitos.split('').forEach((d, k) => {
    codigoCampos[inicio + k].value = d;
  });
  const proximo = Math.min(inicio + digitos.length, 5);
  if (digitos.length) codigoCampos[proximo].focus();
  mostrarMensagem(codigoErroEl, '');
  codigoCamposEl.classList.remove('erro');
  atualizarEstadoCodigo();
}

codigoCampos.forEach((campo, i) => {
  campo.addEventListener('input', () => {
    mostrarMensagem(codigoErroEl, '');
    codigoCamposEl.classList.remove('erro');
    const digitos = campo.value.replace(/\D/g, '');
    if (digitos.length > 1) {
      campo.value = '';
      preencherCodigo(i, digitos);
      return;
    }
    campo.value = digitos; // letras e símbolos são descartados
    if (digitos && i < 5) codigoCampos[i + 1].focus();
    atualizarEstadoCodigo();
  });

  campo.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !campo.value && i > 0) {
      e.preventDefault();
      codigoCampos[i - 1].value = '';
      codigoCampos[i - 1].focus();
      atualizarEstadoCodigo();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault();
      codigoCampos[i - 1].focus();
    } else if (e.key === 'ArrowRight' && i < 5) {
      e.preventDefault();
      codigoCampos[i + 1].focus();
    }
  });

  campo.addEventListener('focus', () => campo.select());

  campo.addEventListener('paste', (e) => {
    e.preventDefault();
    const colado = (e.clipboardData || window.clipboardData).getData('text');
    const digitos = String(colado).replace(/\D/g, '');
    if (!digitos) return;
    // Código inteiro colado vale a partir do 1º campo; pedaço menor, a partir do atual.
    preencherCodigo(digitos.length >= 6 ? 0 : i, digitos);
  });
});

function resetarFluxoRedefinicao() {
  pararContadorReenvio();
  emailRedefinicao = null;
  state.tokenRedefinicaoAtual = null;
  reenviosFeitos = 0;
  codigoBloqueado = false;
  codigoValidando = false;
  if (formEsqueciSenha) formEsqueciSenha.reset();
  if (formRedefinirSenha) formRedefinirSenha.reset();
  mostrarMensagem(esqueciSenhaErro, '');
  mostrarMensagem(codigoErroEl, '');
  mostrarMensagem(redefinirSenhaErro, '');
  if (codigoCampos.length) limparCampos({ focar: false });
  atualizarRequisitosSenha();
}

if (btnEsqueciSenha) {
  btnEsqueciSenha.addEventListener('click', () => {
    resetarFluxoRedefinicao();
    irParaTela('esqueciSenha');
  });
}

// Botão "Voltar para o login" da etapa 1: descarta qualquer estado do fluxo.
const telaEsqueciSenha = document.getElementById('tela-esqueci-senha');

if (telaEsqueciSenha) {
  telaEsqueciSenha.querySelector('.btn-voltar').addEventListener('click', resetarFluxoRedefinicao);
}

// ---------- Etapa 1: pedir o código ----------
async function abrirVerificacaoDeCodigo() {
  codigoBloqueado = false;
  limparCampos({ focar: false });
  mostrarMensagem(codigoErroEl, '');
  codigoEmailDestinoEl.textContent = emailRedefinicao ? `Email: ${emailRedefinicao}` : '';
  iniciarContadorReenvio();
  await irParaTela('verificarCodigo');
  codigoCampos[0].focus();
}

if (formEsqueciSenha) {
  formEsqueciSenha.addEventListener('submit', async (e) => {
    e.preventDefault();
    mostrarMensagem(esqueciSenhaErro, '');
    const email = String(new FormData(formEsqueciSenha).get('email') ?? '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      mostrarMensagem(esqueciSenhaErro, 'Informe um email válido.');
      return;
    }
    await comCarregamento(formEsqueciSenha.querySelector('button[type="submit"]'), 'Enviando...', async () => {
      try {
        // O servidor responde SEMPRE com a mesma mensagem genérica (não revela
        // se o email existe) e o código só existe no email.
        await authApi.esqueciSenha({ email });
        emailRedefinicao = email;
        reenviosFeitos = 0;
        await abrirVerificacaoDeCodigo();
      } catch (err) {
        mostrarMensagem(esqueciSenhaErro, err.status === 429 ? err.message : 'Não foi possível concluir a operação. Tente novamente.');
      }
    });
  });
}

// ---------- Etapa 2: validar o código ----------
function mostrarErroCodigo(mensagem, { bloquear = false } = {}) {
  codigoCamposEl.classList.remove('completo', 'verificado');
  codigoCamposEl.classList.add('erro');
  codigoStatusEl.textContent = '';
  codigoStatusEl.classList.remove('ok', 'pronto');
  mostrarMensagem(codigoErroEl, mensagem);
  if (bloquear) codigoBloqueado = true;
  // Reinicia a animação de "tremida" do campo.
  codigoCamposEl.classList.remove('tremer');
  void codigoCamposEl.offsetWidth;
  codigoCamposEl.classList.add('tremer');
}

if (formVerificarCodigo) {
  formVerificarCodigo.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codigo = valorDoCodigo();
    if (codigo.length !== 6 || codigoBloqueado || codigoValidando || !emailRedefinicao) return;
    mostrarMensagem(codigoErroEl, '');
    codigoValidando = true;
    let aprovado = false;
    await comCarregamento(btnValidarCodigo, 'Validando...', async () => {
      try {
        const resposta = await authApi.validarCodigoRedefinicao(emailRedefinicao, codigo);
        state.tokenRedefinicaoAtual = resposta.resetToken;
        aprovado = true;
      } catch (err) {
        const mensagem = err.message || 'Não foi possível concluir a operação. Tente novamente.';
        const definitivo = err.status === 429 || /expirou|tentativas/i.test(mensagem);
        const erroDeServidor = err.status === 0 || err.status >= 500 || !err.status;
        mostrarErroCodigo(erroDeServidor ? 'Não foi possível concluir a operação. Tente novamente.' : mensagem, {
          bloquear: definitivo && !erroDeServidor
        });
        if (!erroDeServidor) {
          // Código errado: limpa os campos para digitar de novo.
          codigoCampos.forEach((c) => (c.value = ''));
          if (!definitivo) codigoCampos[0].focus();
        }
      }
    });
    codigoValidando = false;
    if (!aprovado) {
      atualizarEstadoCodigo();
      return;
    }
    // Código certo: mostra a confirmação e segue para a nova senha.
    codigoCamposEl.classList.remove('erro', 'completo');
    codigoCamposEl.classList.add('verificado');
    codigoCampos.forEach((c) => (c.disabled = true));
    codigoStatusEl.textContent = '✓ Código verificado';
    codigoStatusEl.classList.remove('pronto');
    codigoStatusEl.classList.add('ok');
    btnValidarCodigo.disabled = true;
    pararContadorReenvio();
    setTimeout(abrirNovaSenha, 900);
  });
}

if (btnReenviarCodigo) {
  btnReenviarCodigo.addEventListener('click', async () => {
    if (!emailRedefinicao || btnReenviarCodigo.disabled) return;
    if (reenviosFeitos >= MAX_REENVIOS) {
      mostrarMensagem(codigoErroEl, 'Limite de reenvios atingido. Tente novamente mais tarde.');
      return;
    }
    await comCarregamento(btnReenviarCodigo, 'Enviando...', async () => {
      try {
        await authApi.esqueciSenha({ email: emailRedefinicao });
        reenviosFeitos += 1;
        codigoBloqueado = false;
        limparCampos();
        mostrarMensagem(codigoErroEl, '');
        toast('Se houver uma conta associada a este email, enviaremos um novo código.', 'sucesso');
        iniciarContadorReenvio();
      } catch (err) {
        mostrarMensagem(codigoErroEl, err.status === 429 ? err.message : 'Não foi possível concluir a operação. Tente novamente.');
      }
    });
  });
}

if (btnCodigoVoltar) {
  btnCodigoVoltar.addEventListener('click', () => {
    resetarFluxoRedefinicao();
    irParaTela('esqueciSenha');
  });
}

// ---------- Etapa 3: nova senha ----------
// Só abre com o token temporário emitido pelo servidor. Sem ele (ex.: alguém
// tenta chegar aqui direto), volta para o início do fluxo.
async function abrirNovaSenha() {
  if (!state.tokenRedefinicaoAtual) {
    resetarFluxoRedefinicao();
    await irParaTela('esqueciSenha');
    return;
  }
  if (formRedefinirSenha) formRedefinirSenha.reset();
  mostrarMensagem(redefinirSenhaErro, '');
  atualizarRequisitosSenha();
  await irParaTela('redefinirSenha');
  if (novaSenhaInput) novaSenhaInput.focus();
}

// Marca cada requisito da senha como atendido (✓) ou pendente. A regra é a
// MESMA do cadastro e do servidor (validarSenha): de 4 a 72 caracteres.
function atualizarRequisitosSenha() {
  if (!requisitosSenhaEl || !novaSenhaInput) return;
  const nova = novaSenhaInput.value;
  const conf = confirmarSenhaInput.value;
  const estados = {
    tamanho: nova.length >= 4 && nova.length <= 72,
    igual: nova.length > 0 && nova === conf
  };
  requisitosSenhaEl.querySelectorAll('li').forEach((li) => {
    li.classList.toggle('ok', !!estados[li.dataset.req]);
  });
}

if (novaSenhaInput) {
  novaSenhaInput.addEventListener('input', atualizarRequisitosSenha);
  confirmarSenhaInput.addEventListener('input', atualizarRequisitosSenha);
}

if (formRedefinirSenha) {
  formRedefinirSenha.addEventListener('submit', async (e) => {
    e.preventDefault();
    mostrarMensagem(redefinirSenhaErro, '');
    // Sem "trim": a senha é gravada exatamente como foi digitada.
    const novaSenha = novaSenhaInput.value;
    const confirmar = confirmarSenhaInput.value;

    if (!state.tokenRedefinicaoAtual) {
      mostrarMensagem(redefinirSenhaErro, ERRO_VERIFICACAO_EXPIRADA);
      setTimeout(() => {
        resetarFluxoRedefinicao();
        irParaTela('esqueciSenha');
      }, 1800);
      return;
    }
    if (!novaSenha) {
      mostrarMensagem(redefinirSenhaErro, 'A senha não pode estar vazia.');
      return;
    }
    if (novaSenha.length < 4 || novaSenha.length > 72) {
      mostrarMensagem(redefinirSenhaErro, 'A nova senha deve ter entre 4 e 72 caracteres.');
      return;
    }
    if (novaSenha !== confirmar) {
      mostrarMensagem(redefinirSenhaErro, 'As senhas não coincidem.');
      return;
    }

    await comCarregamento(formRedefinirSenha.querySelector('button[type="submit"]'), 'Alterando...', async () => {
      try {
        await authApi.redefinirSenha({ token: state.tokenRedefinicaoAtual, novaSenha });
        state.tokenRedefinicaoAtual = null;
        emailRedefinicao = null;
        formRedefinirSenha.reset();
        atualizarRequisitosSenha();
        await irParaTela('senhaAlterada');
      } catch (err) {
        if (err.message === ERRO_VERIFICACAO_EXPIRADA) {
          // Token vencido ou já usado: só um novo código resolve.
          mostrarMensagem(redefinirSenhaErro, err.message);
          state.tokenRedefinicaoAtual = null;
          setTimeout(() => {
            resetarFluxoRedefinicao();
            irParaTela('esqueciSenha');
          }, 2200);
          return;
        }
        mostrarMensagem(
          redefinirSenhaErro,
          err.status === 400 ? err.message : 'Não foi possível concluir a operação. Tente novamente.'
        );
      }
    });
  });
}

if (btnSenhaAlteradaLogin) {
  btnSenhaAlteradaLogin.addEventListener('click', () => {
    resetarFluxoRedefinicao();
    irParaTela('auth');
  });
}
