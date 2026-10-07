// Servidor estático de desenvolvimento (sem dependências).
//   npm run dev      -> serve src/ (js/config.js gerado na hora a partir do .env)
//   npm run preview  -> serve dist/ (resultado do "npm run build")
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { RAIZ, carregarEnv, obterApiUrl, conteudoConfigJs, montarCsp, nomeCabecalhoCsp } = require('./env');

carregarEnv();

const modoPreview = process.argv[2] === 'dist';
const pasta = path.join(RAIZ, modoPreview ? 'dist' : 'src');
if (!fs.existsSync(pasta)) {
  console.error(`Pasta "${path.basename(pasta)}" não encontrada.${modoPreview ? ' Rode "npm run build" antes.' : ''}`);
  process.exit(1);
}

let apiUrl;
try {
  if (modoPreview) {
    // No preview vale a URL que foi gravada no build (dist/js/config.js), não a do .env atual.
    const m = fs.readFileSync(path.join(pasta, 'js', 'config.js'), 'utf8').match(/"API_URL":"([^"]+)"/);
    if (!m) throw new Error('dist/js/config.js inválido. Rode "npm run build" de novo.');
    apiUrl = m[1];
  } else {
    apiUrl = obterApiUrl();
  }
} catch (erro) {
  console.error(erro.message);
  process.exit(1);
}

const PORTA = Number(process.env.PORT) || 5173;
const HOST = process.env.HOST || '0.0.0.0';
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

function tratar(req, res) {
  res.setHeader('Referrer-Policy', 'strict-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(nomeCabecalhoCsp(), montarCsp(apiUrl));
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }

  let caminho;
  try {
    caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    res.writeHead(400);
    return res.end('Requisição inválida');
  }

  if (!modoPreview && caminho === '/js/config.js') {
    res.writeHead(200, { 'Content-Type': TIPOS['.js'] });
    return res.end(conteudoConfigJs(apiUrl));
  }

  if (caminho.endsWith('/')) caminho += 'index.html';
  let arquivo = path.join(pasta, path.normalize(caminho));
  if (arquivo !== pasta && !arquivo.startsWith(pasta + path.sep)) {
    res.writeHead(403);
    return res.end('Acesso negado');
  }
  if (!fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()) {
    // Caminho sem extensão: devolve a página inicial. Arquivo inexistente: 404.
    if (path.extname(caminho) === '') arquivo = path.join(pasta, 'index.html');
    else {
      res.writeHead(404);
      return res.end('Não encontrado');
    }
  }

  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arquivo).toLowerCase()] || 'application/octet-stream' });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(arquivo).pipe(res);
}

const { TLS_CERT_FILE, TLS_KEY_FILE } = process.env;
if (Boolean(TLS_CERT_FILE) !== Boolean(TLS_KEY_FILE)) {
  console.error('Configure TLS_CERT_FILE e TLS_KEY_FILE juntos para ativar HTTPS.');
  process.exit(1);
}
const usaHttps = Boolean(TLS_CERT_FILE && TLS_KEY_FILE);
const servidor = usaHttps
  ? https.createServer({ cert: fs.readFileSync(TLS_CERT_FILE), key: fs.readFileSync(TLS_KEY_FILE) }, tratar)
  : http.createServer(tratar);

servidor.on('error', (erro) => {
  console.error(erro.code === 'EADDRINUSE' ? `A porta ${PORTA} já está em uso. Defina outra em PORT.` : erro.message);
  process.exit(1);
});

servidor.listen(PORTA, HOST, () => {
  console.log(`SOS Car Frontend (${modoPreview ? 'dist' : 'src'}) em ${usaHttps ? 'https' : 'http'}://localhost:${PORTA}`);
  console.log(`API: ${apiUrl}`);
});
