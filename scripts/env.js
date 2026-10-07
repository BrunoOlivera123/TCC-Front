// Leitor mínimo de .env (sem dependências) + validação da URL da API.
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

function carregarEnv() {
  const arquivo = path.join(RAIZ, '.env');
  if (!fs.existsSync(arquivo)) return;
  for (const linha of fs.readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let valor = m[2];
    if (/^".*"$/.test(valor) || /^'.*'$/.test(valor)) valor = valor.slice(1, -1);
    else valor = valor.replace(/\s+#.*$/, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = valor;
  }
}

// Devolve a URL da API sem barra final; interrompe com mensagem clara se for inválida.
function obterApiUrl() {
  const bruto = (process.env.API_URL || 'https://localhost:3000').trim();
  let url;
  try {
    url = new URL(bruto);
  } catch {
    throw new Error(`API_URL inválida: "${bruto}". Exemplo: https://localhost:3000`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('API_URL deve começar com http:// ou https://');
  }
  return bruto.replace(/\/+$/, '');
}

function conteudoConfigJs(apiUrl) {
  return (
    '// Gerado automaticamente a partir do API_URL do .env. Não edite.\n' +
    `window.SOSCAR_CONFIG = ${JSON.stringify({ API_URL: apiUrl })};\n`
  );
}

// Content-Security-Policy da página (a API entra em connect-src).
function montarCsp(apiUrl) {
  const apiOrigem = new URL(apiUrl).origin;
  return [
    "default-src 'self'",
    "script-src 'self' https://cdnjs.cloudflare.com https://accounts.google.com/gsi/client",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://accounts.google.com/gsi/style",
    'font-src https://fonts.gstatic.com',
    "img-src 'self' data: https://cdnjs.cloudflare.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
    `connect-src 'self' ${apiOrigem} https://router.project-osrm.org https://accounts.google.com/gsi/`,
    'frame-src https://accounts.google.com/gsi/',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ');
}

function nomeCabecalhoCsp() {
  return process.env.CSP_ENFORCAR === '1' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only';
}

module.exports = { RAIZ, carregarEnv, obterApiUrl, conteudoConfigJs, montarCsp, nomeCabecalhoCsp };
