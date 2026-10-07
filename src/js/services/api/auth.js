// Autenticação e conta do usuário.
import { requisitar, enviar } from './client.js';

export const authApi = {
  registrar: (dados) => enviar('POST', '/auth/registrar', dados),
  login: (dados) => enviar('POST', '/auth/login', dados),
  logout: () => requisitar('/auth/logout', { method: 'POST' }),
  quemSouEu: () => requisitar('/auth/me'),
  atualizarUsuario: (dados) => enviar('PATCH', '/auth/atualizar', dados),
  // dados = { cpf?, telefone? } — só o que ainda falta no perfil.
  completarPerfil: (dados) => enviar('POST', '/auth/completar-perfil', dados),
  loginAdmin: (dados) => enviar('POST', '/auth/login-admin', dados),

  // Recuperação de senha: 1) pedir código, 2) validar o código de 6 dígitos, 3) gravar a nova senha.
  esqueciSenha: (dados) => enviar('POST', '/auth/esqueci-senha', dados),
  // Devolve { resetToken } (temporário, só para trocar a senha).
  validarCodigoRedefinicao: (email, codigo) => enviar('POST', '/auth/validar-codigo', { email, codigo }),
  // dados = { token, novaSenha }
  redefinirSenha: (dados) => enviar('POST', '/auth/redefinir-senha', dados),

  googleConfig: () => requisitar('/auth/google/config'),
  // Nonce de uso único: entregue ao Google, volta DENTRO do ID token (anti-replay).
  googleNonce: () => requisitar('/auth/google/nonce'),
  // dados = { credential, tipo, categoriaId?, confirmarVinculo? }
  loginGoogle: (dados) => enviar('POST', '/auth/google', dados)
};
