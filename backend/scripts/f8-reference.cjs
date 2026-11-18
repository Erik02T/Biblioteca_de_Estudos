// Identifiable snapshot of executable sources and explicitly selected project docs.
// Excludes .env, dependencies, dumps, logs and personal notes by an allowlist.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { zipSync } = require('fflate');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, '.f8-artifacts');
fs.mkdirSync(output, { recursive: true });
const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 16 * 1024 * 1024 });
const sha256 = data => createHash('sha256').update(data).digest('hex');
const candidates = git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).toString('utf8').split('\0').filter(Boolean);
const executable = name => /^(backend\/(src|prisma|scripts|test)\/|frontend\/(src|public)\/)/.test(name)
  || /^(backend|frontend)\/[^/]+\.(json|mjs|cjs|ts)$/.test(name)
  || ['backend/.prettierrc', 'frontend/.gitignore', 'frontend/AGENTS.md', 'docker-compose.yml', 'env.example', '.gitignore', 'output/playwright/F8-integridade.js'].includes(name);
const document = name => /^docs\/notion\/execucao\/F[0-8](?:-[^/]+)?\.md$/i.test(name)
  || /^docs\/notion\/Engenharia_Reversa_Notion_Biblioteca\/(08_Requisitos_e_Historias|12_Plano_Incremental|14_Rastreabilidade_e_Testes)\.md$/.test(name)
  || ['README.md', 'backend/README.md', 'frontend/README.md', 'docs/development/TEST_PLAN.md'].includes(name);
const selected = [...new Set(candidates.filter(name => (executable(name) || document(name)) && fs.statSync(path.join(root, name)).isFile()))].sort();
const payload = Object.fromEntries(selected.map(name => [name, new Uint8Array(fs.readFileSync(path.join(root, name)))]));
const files = selected.map(name => ({ path: name, sha256: sha256(payload[name]), kind: executable(name) ? 'code' : 'documentation' }));
const sourceFingerprint = sha256(JSON.stringify(files.filter(file => file.kind === 'code').map(({ path: name, sha256: hash }) => [name, hash])));
const sourceArchive = zipSync(payload, { level: 6 });
fs.writeFileSync(path.join(output, 'source.zip'), sourceArchive);
fs.writeFileSync(path.join(output, 'tracked.patch'), git(['diff', '--binary', 'HEAD', '--', ...selected]));
const summary = {
  createdAt: new Date().toISOString(), timezone: 'America/Fortaleza',
  head: git(['rev-parse', 'HEAD']).toString().trim(), branch: git(['branch', '--show-current']).toString().trim(),
  sourceFingerprint, archiveSha256: sha256(sourceArchive), fileCount: files.length,
  archive: '.f8-artifacts/source.zip', manifest: '.f8-artifacts/reference.json', trackedPatch: '.f8-artifacts/tracked.patch',
};
const evidence = {};
for (const name of ['backend-tests.json', 'frontend-tests.json', 'http-e2e.json', 'upgrade.json', 'browser-result.json', 'f7-audit.json']) {
  const file = path.join(output, name); if (fs.existsSync(file)) evidence[name] = sha256(fs.readFileSync(file));
}
fs.writeFileSync(path.join(output, 'reference.json'), JSON.stringify({ ...summary, evidence, files, gitStatus: git(['status', '--short', '--untracked-files=all']).toString() }, null, 2));
fs.writeFileSync(path.join(root, 'docs/notion/execucao/F8-referencia.json'), JSON.stringify({ ...summary, evidence }, null, 2) + '\n');
console.log(JSON.stringify({ ...summary, evidence }, null, 2));
