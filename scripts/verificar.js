// Verificações estáticas do front-end (sem dependências): npm run verificar
//  1) todo import relativo dos módulos JS aponta para um arquivo existente;
//  2) todo arquivo listado no service worker existe;
//  3) scripts, folhas de estilo e imagens referenciados no index.html existem;
//  4) nenhum arquivo fora de services/storage/storage.js usa localStorage/sessionStorage;
//  5) nenhum arquivo fora de services/api/client.js (e do OSRM) chama fetch.
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, '..', 'src');
let erros = 0;
const falha = (msg) => { erros++; console.error('  ✗ ' + msg); };

const listar = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listar(p) : [p];
  });
const rel = (p) => path.relative(SRC, p).split(path.sep).join('/');
const jsFiles = listar(path.join(SRC, 'js')).filter((f) => f.endsWith('.js'));

for (const f of jsFiles) {
  const txt = fs.readFileSync(f, 'utf8');
  for (const m of txt.matchAll(/(?:from\s+|import\s+)['"](\.{1,2}\/[^'"]+)['"]/g)) {
    if (!fs.existsSync(path.resolve(path.dirname(f), m[1]))) falha(`${rel(f)}: import quebrado "${m[1]}"`);
  }
  if (/\b(localStorage|sessionStorage)\b/.test(txt.replace(/\/\/.*$/gm, '')) && !f.endsWith('services/storage/storage.js'))
    falha(`${rel(f)}: use services/storage/storage.js em vez de localStorage/sessionStorage direto`);
  if (/\bfetch\(/.test(txt.replace(/\/\/.*$/gm, '')) && !/services\/(api\/client|routing\/osrm)\.js$/.test(f))
    falha(`${rel(f)}: chamadas HTTP devem passar por services/api/client.js`);
}

const sw = fs.readFileSync(path.join(SRC, 'sw.js'), 'utf8');
for (const m of sw.matchAll(/^\s*'(\/[^']*)',?$/gm)) {
  if (m[1] === '/') continue;
  if (!fs.existsSync(path.join(SRC, m[1]))) falha(`sw.js: arquivo inexistente "${m[1]}"`);
}
for (const f of jsFiles.filter((x) => !x.endsWith('config.js'))) {
  if (!sw.includes(`'/${rel(f)}'`)) falha(`sw.js: falta "${rel(f)}" na lista de arquivos essenciais`);
}

const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
for (const m of html.matchAll(/(?:src|href)="((?!https?:|#|data:)[^"]+)"/g)) {
  if (!fs.existsSync(path.join(SRC, m[1]))) falha(`index.html: referência quebrada "${m[1]}"`);
}

if (erros) { console.error(`\n${erros} problema(s).`); process.exit(1); }
console.log(`Verificação OK: ${jsFiles.length} módulos JS, service worker e index.html consistentes.`);
