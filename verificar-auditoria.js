// verificar-auditoria.js
// Roda verificações da auditoria e imprime ABERTO / RESOLVIDO
const fs = require('fs');
const path = require('path');

function ler(caminho) {
  try { return fs.readFileSync(caminho, 'utf8'); } catch { return null; }
}
function existe(caminho) {
  return fs.existsSync(caminho);
}
function contem(caminho, regex) {
  const c = ler(caminho);
  if (c === null) return false;
  return regex.test(c);
}
function listarRotasApi() {
  const base = 'app/api';
  if (!existe(base)) return [];
  const rotas = [];
  function andar(dir) {
    for (const item of fs.readdirSync(dir)) {
      const p = path.join(dir, item);
      const st = fs.statSync(p);
      if (st.isDirectory()) andar(p);
      else if (item === 'route.ts' || item === 'route.js') rotas.push(p);
    }
  }
  andar(base);
  return rotas;
}

const resultados = [];
function check(id, descricao, resolvido, detalhe = '') {
  resultados.push({ id, descricao, resolvido, detalhe });
}

// ---- C01: middleware / registro ----
{
  const mw = ler('middleware.ts') || '';
  const usaJwt = /jwtVerify|verifyToken|auth-edge|jose|jsonwebtoken/.test(mw);
  const registroExiste = existe('app/api/register/route.ts') || existe('app/api/register/route.js');
  const registroProtegido = registroExiste
    ? /requireAuth|checkPermission|requirePermission/.test(ler('app/api/register/route.ts') || '')
    : true;
  const ok = usaJwt && (!registroExiste || registroProtegido);
  check('C01', 'Middleware valida JWT e /api/register protegido/removido', ok,
    `jwt=${usaJwt} registroExiste=${registroExiste} protegido=${registroProtegido}`);
}

// ---- C02: /api/migrar ----
{
  const existeRota = existe('app/api/migrar/route.ts') || existe('app/api/migrar/route.js');
  check('C02', '/api/migrar removida', !existeRota, existeRota ? 'ainda existe' : 'removida');
}

// ---- C09: password_hash no GET da OS ----
{
  const c = ler('app/api/ordens/[id]/route.ts') || '';
  const vaza = /User:\s*true/.test(c) || /password_hash/.test(c);
  check('C09', 'GET da OS não vaza password_hash', !vaza, vaza ? 'ainda vaza' : 'ok');
}

// ---- C03: ConfiguracaoEmpresa por empresa ----
{
  const schema = ler('prisma/schema.prisma') || '';
  const temEmpresa = /model\s+ConfiguracaoEmpresa[\s\S]{0,500}empresa_id/.test(schema);
  check('C03', 'ConfiguracaoEmpresa tem empresa_id', temEmpresa,
    temEmpresa ? 'ok' : 'ainda global');
}

// ---- C04: upload ----
{
  const u1 = ler('app/api/upload/route.ts') || '';
  const u2 = ler('app/api/checklist/upload-foto/route.ts') || '';
  const salvaEmPublic = /public\//.test(u1) || /public\//.test(u2);
  const validaTipo = /magic|file-type|fileTypeFromBuffer|uuid|crypto\.randomUUID/.test(u1 + u2);
  const ok = !salvaEmPublic && validaTipo;
  check('C04', 'Uploads validam tipo e não salvam em public/', ok,
    `public=${salvaEmPublic} valida=${validaTipo}`);
}

// ---- C05: RBAC nas rotas críticas ----
{
  const rotas = listarRotasApi();
  const criticas = rotas.filter(r =>
    /financeiro|estoque|importar-nfe|orcamentos|checklist|dashboard|usuarios|configuracoes/.test(r)
  );
  const semPermissao = criticas.filter(r => {
    const c = ler(r) || '';
    const temAuth = /requireAuth/.test(c);
    const temPerm = /checkPermission|requirePermission/.test(c);
    return temAuth && !temPerm;
  });
  check('C05', 'Rotas críticas têm checagem de permissão', semPermissao.length === 0,
    semPermissao.length ? `${semPermissao.length} rotas sem permissão` : 'ok');
  if (semPermissao.length) {
    console.log('\n  Rotas sem permissão (até 15):');
    semPermissao.slice(0, 15).forEach(r => console.log('   -', r));
  }
}

// ---- C06: sessão com ativo ----
{
  const schema = ler('prisma/schema.prisma') || '';
  const temAtivo = /model\s+User[\s\S]{0,800}\bativo\b/.test(schema);
  const revalida = /ativo|sessionVersion|session_version/.test(ler('lib/api-auth.ts') || '');
  check('C06', 'User.ativo + revalidação de sessão', temAtivo && revalida,
    `ativo=${temAtivo} revalida=${revalida}`);
}

// ---- C07: localStorage no request-manager ----
{
  const rm = ler('lib/request-manager.ts') || '';
  const usaLocal = /localStorage/.test(rm);
  check('C07', 'request-manager sem localStorage', !usaLocal,
    usaLocal ? 'ainda usa localStorage' : 'ok');
}

// ---- C08: constraints compostas ----
{
  const schema = ler('prisma/schema.prisma') || '';
  const temComposta = /@@unique\(\[empresa_id/.test(schema);
  check('C08', 'Schema com constraints compostas (empresa_id)', temComposta,
    temComposta ? 'ok (verificar se migration foi aplicada no banco real)' : 'ainda global');
}

// ---- C10: checklist ----
{
  const temNovo = existe('app/checklist/novo/page.tsx') || existe('app/checklist/novo/page.jsx');
  const rotaExec = ler('app/api/checklist/execucao/[id]/route.ts') || '';
  const temPatch = /export\s+async\s+function\s+PATCH/.test(rotaExec);
  check('C10', 'Checklist: página /novo + PATCH na execução', temNovo && temPatch,
    `novo=${temNovo} patch=${temPatch}`);
}

// ---- C11: auditoria ----
{
  const temRota = existe('app/api/auditoria/route.ts');
  check('C11', 'Rota /api/auditoria existe', temRota, temRota ? 'ok' : 'ausente');
}

// ---- C12: PUT da OS cirúrgico ----
{
  const c = ler('app/api/ordens/[id]/route.ts') || '';
  const cirurgico = /if\s*\(\s*body\.assinatura_cliente\s*!==\s*undefined/.test(c);
  check('C12', 'PUT da OS só grava campos enviados (assinaturas)', cirurgico,
    cirurgico ? 'ok' : 'ainda sobrescreve');
}

// ---- C13: autosave ----
{
  const c = ler('app/os/[id]/editar/page.tsx') || '';
  const chamaApi = /fetch\(['"`]\/api\/ordens/.test(c) && /setTimeout|debounce/.test(c);
  const soRascunho = /localStorage\.setItem/.test(c) && !chamaApi;
  check('C13', 'Autosave não chama PUT completo', !chamaApi || soRascunho,
    `chamaApi=${chamaApi} soRascunho=${soRascunho}`);
}

// ---- A26: assinatura ----
{
  const c = ler('app/api/ordens/[id]/route.ts') || '';
  const hashServidor = /crypto\.createHash|sha256|createHash/.test(c);
  check('A26', 'Hash da assinatura calculado no servidor', hashServidor,
    hashServidor ? 'ok' : 'ainda do cliente');
}

// ---- A27: financeiro ----
{
  const c = ler('app/api/financeiro/[id]/route.ts') || '';
  const cirurgico = /if\s*\(\s*body\.os_id\s*!==\s*undefined/.test(c);
  check('A27', 'PUT financeiro só altera campos enviados', cirurgico,
    cirurgico ? 'ok' : 'ainda zera vínculos');
}

// ---- A37: guarda na edição ----
{
  const c = ler('app/os/[id]/editar/page.tsx') || '';
  const temGuarda = /if\s*\(\s*!\s*(ordem|os)\s*\)/.test(c);
  check('A37', 'Edição bloqueia autosave se OS não carregou', temGuarda,
    temGuarda ? 'ok' : 'sem guarda');
}

// ---- Relatório ----
console.log('\n========================================');
console.log('  VERIFICAÇÃO DA AUDITORIA');
console.log('========================================\n');

const abertos = resultados.filter(r => !r.resolvido);
const resolvidos = resultados.filter(r => r.resolvido);

for (const r of resultados) {
  const marca = r.resolvido ? 'OK  ' : 'FALTA';
  console.log(`[${marca}] ${r.id} — ${r.descricao}`);
  if (r.detalhe) console.log(`         (${r.detalhe})`);
}

console.log('\n========================================');
console.log(`  RESOLVIDOS: ${resolvidos.length} / ${resultados.length}`);
console.log(`  AINDA ABERTOS: ${abertos.length}`);
console.log('========================================');
if (abertos.length) {
  console.log('\n  Achados ainda abertos:');
  abertos.forEach(r => console.log('   -', r.id));
}
console.log('\nCopie TUDO isso e cole no chat.\n');
