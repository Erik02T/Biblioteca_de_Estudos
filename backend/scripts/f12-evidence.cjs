const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { unzipSync, strFromU8 } = require('fflate');
const { publicDir } = require('./f12-environment.cjs');
const { privateDir } = require('./f12-environment.cjs');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = filename => JSON.parse(fs.readFileSync(path.join(publicDir, filename), 'utf8'));
const write = (filename, value) => fs.writeFileSync(path.join(publicDir, filename), JSON.stringify(value, null, 2) + '\n');
if (process.argv[2] === 'exports') {
  const archives = [];
  for (const engine of ['chromium', 'firefox']) {
    const name = `F12-${engine}-F10-documento-misto.zip`;
    const bytes = fs.readFileSync(path.join(publicDir, name));
    const entries = unzipSync(bytes);
    const manifest = JSON.parse(strFromU8(entries['manifest.json']));
    if (manifest.format !== 'biblioteca-de-estudos' || manifest.schemaVersion !== 1 || !entries['README.md']) throw Error('Invalid export format');
    for (const file of manifest.files) {
      if (!entries[file.path] || file.path.startsWith('/') || file.path.split('/').includes('..') || entries[file.path].length !== file.size || sha(entries[file.path]) !== file.sha256) throw Error('Export hash/path mismatch');
    }
    const json = Object.entries(entries).filter(([name]) => name.endsWith('.json')).map(([, bytes]) => strFromU8(bytes)).join('\n');
    if (/X-Amz-Signature|X-Amz-Credential|Bearer eyJ|"refreshToken"/i.test(json)) throw Error('Temporary credentials retained in export');
    archives.push({ engine, name, sha256: sha(bytes), bytes: bytes.length, pages: manifest.pages.length, verifiedEntries: manifest.files.length, limitations: manifest.limitations, offlineVerification: true });
  }
  write('F12-exports-resultados.json', { verifiedAt: new Date().toISOString(), passed: true, archives });
  console.log(JSON.stringify({ passed: true, archives: archives.map(item => ({ engine: item.engine, pages: item.pages, verifiedEntries: item.verifiedEntries })) }));
} else if (process.argv[2] === 'report') {
  const requirements = [];
  const add = (name, filename) => {
    try { const data = read(filename); requirements.push({ name, evidence: filename, passed: data.passed === true, verifiedAt: data.verifiedAt || data.createdAt, checks: data.checks?.length, summary: data.summary }); }
    catch { requirements.push({ name, evidence: filename, passed: false, missing: true }); }
  };
  for (const check of ['backend-tests', 'backend-http-mocked', 'backend-lint', 'frontend-tests', 'frontend-lint', 'frontend-build']) add(check, `F12-checks-${check}.json`);
  for (const engine of ['chromium', 'firefox']) {
    for (const scenario of ['journey', 'compatibility', 'surfaces', 'accessibility', 'clipboard', 'native-paste-before', 'native-paste-after', 'integrity', 'trash', 'recovery-before', 'recovery-after', 'performance', 'replay-f9-navigation', 'replay-f9-presentation', 'replay-f9-icon', 'replay-f10-setup', 'replay-f10-browser', 'replay-f10-operations', 'replay-f10-portability', 'replay-f11-setup', 'replay-f11-collections', 'replay-f11-models']) add(`${engine}/${scenario}`, `F12-${engine}-${scenario}-resultados.json`);
    add(`${engine}/forced-exit`, `F12-${engine}-forced-exit-resultados.json`);
  }
  add('recovery', 'F12-recovery-resultados.json'); add('offline-exports', 'F12-exports-resultados.json');
  const human = read('F12-aceite-humano.json');
  const automatedPassed = requirements.every(item => item.passed);
  const humanPassed = Object.values(human.tests).every(test => test.status === 'verified');
  const limitationsAccepted = human.acceptedLimitations?.length > 0 && human.limitationsAcceptance?.status === 'accepted';
  const passed = automatedPassed && humanPassed && limitationsAccepted;
  const result = { verifiedAt: new Date().toISOString(), passed, status: passed ? 'HOMOLOGADO_NO_RECORTE_F12' : 'VALIDACAO_PARCIAL', automatedPassed, humanPassed, limitationsAccepted, requirements, humanEvidence: 'F12-aceite-humano.json', codeReference: 'F12-codigo.json', publicationPerformed: false };
  // Consolidate completed/resumed batches from their final scenario evidence.
  // Preserve earlier interrupted summaries privately instead of claiming an uninterrupted run.
  for (const engine of ['chromium', 'firefox']) for (const group of ['core', 'f9', 'f10', 'f11']) {
    const members = requirements.filter(item => item.name.startsWith(engine + '/') && (group === 'core' ? !item.name.includes('replay-') && !item.name.endsWith('/performance') : item.name.includes('/replay-' + group + '-')));
    const filename = `F12-${engine}-suite-${group}-resultados.json`;
    let previous; try { previous = read(filename); } catch { /* first consolidated summary */ }
    if (previous?.passed === false) fs.copyFileSync(path.join(publicDir, filename), path.join(privateDir, filename.replace('.json', '-interrupted-' + Date.now() + '.json')));
    write(filename, { verifiedAt: result.verifiedAt, engine, group, passed: members.every(item => item.passed), resumed: previous?.passed === false, note: 'Consolidated from the individual scenario records; timestamps identify the actual executions.', steps: members });
  }
  for (const obsolete of ['F12-chromium-operations-resultados.json', 'F12-chromium-operacoes-falha.png', 'F12-chromium-suite-core-finish-resultados.json']) {
    const from = path.join(publicDir, obsolete);
    if (fs.existsSync(from)) fs.renameSync(from, path.join(privateDir, 'exploratory-' + Date.now() + '-' + obsolete));
  }
  write('F12-resultados.json', result);
  console.log(JSON.stringify({ status: result.status, automatedPassed, humanPassed, limitationsAccepted, pending: requirements.filter(item => !item.passed).map(item => item.name) }));
  if (!passed) process.exitCode = 1;
} else throw Error('Use exports | report');
