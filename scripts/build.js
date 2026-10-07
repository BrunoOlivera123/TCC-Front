// Gera dist/ pronto para hospedagem estática (sem dependências).
//   - copia src/ para dist/
//   - grava dist/js/config.js com o API_URL do .env (ou da variável de ambiente)
//   - grava dist/_headers (Netlify / Cloudflare Pages) com a CSP e demais cabeçalhos
const fs = require('fs');
const path = require('path');
const { RAIZ, carregarEnv, obterApiUrl, conteudoConfigJs, montarCsp, nomeCabecalhoCsp } = require('./env');

carregarEnv();

let apiUrl;
try {
  apiUrl = obterApiUrl();
} catch (erro) {
  console.error(erro.message);
  process.exit(1);
}

const origem = path.join(RAIZ, 'src');
const destino = path.join(RAIZ, 'dist');
fs.rmSync(destino, { recursive: true, force: true });
fs.cpSync(origem, destino, { recursive: true });

fs.writeFileSync(path.join(destino, 'js', 'config.js'), conteudoConfigJs(apiUrl));
fs.writeFileSync(
  path.join(destino, '_headers'),
  `/*\n  Referrer-Policy: strict-origin\n  X-Content-Type-Options: nosniff\n  ${nomeCabecalhoCsp()}: ${montarCsp(apiUrl)}\n`
);

const contar = (pasta) =>
  fs.readdirSync(pasta, { withFileTypes: true }).reduce(
    (n, e) => n + (e.isDirectory() ? contar(path.join(pasta, e.name)) : 1),
    0
  );
console.log(`Build concluído: dist/ (${contar(destino)} arquivos). API_URL = ${apiUrl}`);
if (/localhost|127\.0\.0\.1/.test(apiUrl)) {
  console.warn('Atenção: API_URL aponta para localhost. Em produção, defina a URL pública do backend.');
}
