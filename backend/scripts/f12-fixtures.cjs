const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomBytes } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { S3Client, CreateBucketCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const uuid = value => { const h = createHash('sha256').update('f12-v1:' + value).digest('hex'); return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`; };
const paragraph = (text, key) => ({ type: 'paragraph', attrs: { id: uuid(key) }, content: [{ type: 'text', text }] });
const document = (text, key, blocks = 1) => ({ type: 'doc', content: Array.from({ length: blocks }, (_, j) => paragraph(`${text} — bloco ${j}: は e が; const estudo = "ação";`, `${key}:${j}`)) });
const mixed = (name, ids) => ({ type: 'doc', content: [
  { type: 'heading', attrs: { id: uuid(name + ':h6'), level: 6 }, content: [{ type: 'text', text: 'Japonês e programação' }] },
  paragraph('Partículas は e が — ação', name + ':p'),
  { type: 'taskList', attrs: { id: uuid(name + ':tl') }, content: [{ type: 'taskItem', attrs: { id: uuid(name + ':ti'), checked: true }, content: [paragraph('Revisar exemplos', name + ':task')] }] },
  { type: 'codeBlock', attrs: { id: uuid(name + ':code'), language: 'python' }, content: [{ type: 'text', text: 'def estudo():\n    return "日本語"\n' }] },
  { type: 'toggleBlock', attrs: { id: uuid(name + ':toggle'), summary: 'Exemplos', open: false }, content: [paragraph('Conteúdo recolhido', name + ':hidden')] },
  { type: 'callout', attrs: { id: uuid(name + ':callout'), variant: 'info' }, content: [paragraph('Nota de estudo', name + ':note')] },
  { type: 'paragraph', attrs: { id: uuid(name + ':refs') }, content: [{ type: 'pageReference', attrs: { targetPageId: ids[1] } }, { type: 'text', text: ' e ' }, { type: 'pageReference', attrs: { targetPageId: ids[2] } }] },
] });
async function seed({ env, bucket, privateDir, publicDir }) {
  const manifestFile = path.join(privateDir, 'fixtures.json');
  const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
  const s3 = new S3Client({ endpoint: env.STORAGE_ENDPOINT, region: env.STORAGE_REGION, forcePathStyle: true, credentials: { accessKeyId: env.STORAGE_ACCESS_KEY_ID, secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY } });
  try {
    if (fs.existsSync(manifestFile)) {
      const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
      const count = await prisma.area.count({ where: { userId: manifest.accounts.volume.id } });
      if (count !== 1000) throw Error('Existing F12 volume differs; preserve fixtures and inspect instead of resetting');
      console.log(JSON.stringify({ reused: true, volumePages: count })); return;
    }
    if (await prisma.user.findFirst({ where: { email: { startsWith: 'f12-' } } })) throw Error('Incomplete F12 seed exists; preserve it and inspect');
    try { await s3.send(new CreateBucketCommand({ Bucket: bucket })); } catch (error) { if (error.name !== 'BucketAlreadyOwnedByYou') throw error; }
    const password = randomBytes(24).toString('base64url');
    const passwordHash = await bcrypt.hash(password, 10);
    const accounts = {};
    for (const name of ['volume', 'chromium', 'firefox', 'other', 'human']) {
      const id = uuid('user:' + name), email = `f12-${name}@example.com`;
      await prisma.user.create({ data: { id, email, passwordHash } });
      accounts[name] = { id, email, password };
    }
    const sections = ['LINGUAGENS', 'FACULDADE', 'PROJETOS', 'OUTROS'];
    const rows = Array.from({ length: 1000 }, (_, i) => {
      // Each five-page chain remains in its section. The first is a root.
      const group = Math.floor(i / 5), section = sections[group % 4];
      return { id: uuid('volume:' + i), userId: accounts.volume.id, nome: `F12 Estudo ${String(i).padStart(4,'0')}`, categoria: i % 2 ? 'Programação' : 'Japonês', section, subSection: i % 2 ? 'ESTUDADO' : 'ESTUDANDO', sortOrder: i, nivelEntendimento: i % 6, isFavorite: i % 10 === 0, conteudo: document(`Sentinela F12 ${i} 日本語`, 'volume:' + i, i < 900 ? 1 : i < 990 ? 100 : 1000) };
    });
    for (let i = 0; i < rows.length; i += 50) await prisma.area.createMany({ data: rows.slice(i, i + 50) });
    for (let i = 0; i < 1000; i++) if (i % 5) await prisma.area.update({ where: { id: rows[i].id }, data: { parentId: rows[i - 1].id } });
    const objects = [];
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS8sAAAAASUVORK5CYII=', 'base64');
    for (let i = 0; i < 100; i++) {
      const image = i % 2 === 0, id = uuid('attachment:' + i), area = rows[i];
      const key = `${accounts.volume.id}/${area.id}/${id}.${image ? 'png' : 'txt'}`;
      const bytes = image ? png : Buffer.from(`Material F12 ${i} 日本語\n    código indentado\n`);
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: image ? 'image/png' : 'text/plain' }));
      await prisma.attachment.create({ data: { id, areaId: area.id, tipo: image ? 'IMAGEM' : 'ARQUIVO', nome: `material-${i}.${image ? 'png' : 'txt'}`, url: `http://localhost:9000/${bucket}/${key}` } });
      const content = [...area.conteudo.content, { type: image ? 'image' : 'attachment', attrs: { id: uuid('media-block:' + i), attachmentId: id } }, paragraph('', 'ref-p:' + i)];
      content[content.length - 1].content = [{ type: 'pageReference', attrs: { targetPageId: rows[(i + 1) % 1000].id } }];
      await prisma.area.update({ where: { id: area.id }, data: { conteudo: { type: 'doc', content }, ...(image ? { coverAttachmentId: id } : {}) } });
      objects.push({ key, sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length });
    }
    const fixtures = {};
    for (const name of ['chromium', 'firefox', 'human']) {
      const ids = Array.from({ length: 32 }, (_, i) => uuid(name + ':page:' + i));
      for (let i = 0; i < ids.length; i++) {
        let conteudo = document(`Busca F12 ${name} 日本語 ${i}`, `${name}:${i}`);
        if (i === 0) conteudo = { type: 'doc', content: [
          { type: 'heading', attrs: { id: uuid(name + ':h6'), level: 6 }, content: [{ type: 'text', text: 'Japonês e programação' }] },
          paragraph('Partículas は e が — ação', name + ':p'),
          { type: 'taskList', attrs: { id: uuid(name + ':tl') }, content: [{ type: 'taskItem', attrs: { id: uuid(name + ':ti'), checked: true }, content: [paragraph('Revisar exemplos', name + ':task')] }] },
          { type: 'codeBlock', attrs: { id: uuid(name + ':code'), language: 'python' }, content: [{ type: 'text', text: 'def estudo():\n    return "日本語"\n' }] },
          { type: 'toggleBlock', attrs: { id: uuid(name + ':toggle'), summary: 'Exemplos', open: false }, content: [paragraph('Conteúdo recolhido', name + ':hidden')] },
          { type: 'callout', attrs: { id: uuid(name + ':callout'), variant: 'info' }, content: [paragraph('Nota de estudo', name + ':note')] },
          { type: 'paragraph', attrs: { id: uuid(name + ':refs') }, content: [{ type: 'pageReference', attrs: { targetPageId: ids[1] } }, { type: 'text', text: ' e ' }, { type: 'pageReference', attrs: { targetPageId: ids[2] } }] },
        ] };
        if (i === 25) conteudo = { texto: 'Texto legado 日本語 com acentuação' };
        if (i === 26) conteudo = { type: 'doc', content: [{ type: 'pageReference', attrs: { pageId: ids[1] } }] };
        if (i === 27) conteudo = { type: 'doc', content: [{ type: 'unknownBlock', attrs: { preserved: 'F12' } }] };
        if (i === 28) conteudo = { futureFormat: { secretText: 'Preservar formato desconhecido 日本語' } };
        if (i === 29) conteudo = { type: 'doc', schemaVersion: 999, content: [paragraph('Futuro não editável', name + ':future')] };
        if (i === 30) conteudo = { type: 'doc', schemaVersion: 1, content: [paragraph('Schema atual versionado 日本語', name + ':versioned')] };
        await prisma.area.create({ data: { id: ids[i], userId: accounts[name].id, nome: `F12 ${name} ${String(i).padStart(2,'0')}`, categoria: 'F12', nivelEntendimento: i % 6, section: 'LINGUAGENS', subSection: i % 2 ? 'ESTUDADO' : 'ESTUDANDO', parentId: i === 1 ? ids[0] : i === 2 ? ids[1] : null, conteudo } });
      }
      fixtures[name] = { ids, source: ids[0], legacy: ids[25], legacyReference: ids[26], unknownNode: ids[27], unknownRoot: ids[28], future: ids[29], versioned: ids[30] };
    }
    await prisma.area.create({ data: { id: uuid('other-page'), userId: accounts.other.id, nome: 'Outra conta', categoria: 'Privado', section: 'OUTROS', subSection: 'ESTUDANDO', conteudo: document('Privado F12', 'other') } });
    const manifest = { createdAt: new Date().toISOString(), accounts, fixtures, volume: { ids: rows.map(row => row.id), objects } };
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), { flag: 'wx' });
    const evidence = { createdAt: manifest.createdAt, volumePages: 1000, shortDocuments: 900, hundredBlockDocuments: 90, thousandBlockDocuments: 10, maximumDepth: 5, physicalObjects: objects.length, browserFixtures: Object.keys(fixtures), accounts: Object.keys(accounts), deterministicIds: true, personalDataUsed: false };
    fs.writeFileSync(path.join(publicDir, 'F12-fixtures-resultados.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence));
  } finally { await prisma.$disconnect(); s3.destroy(); }
}
async function freshBrowser({ env, privateDir }, engine) {
  if (!['chromium', 'firefox'].includes(engine)) throw Error('Use chromium or firefox');
  const manifestFile = path.join(privateDir, 'fixtures.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const run = randomBytes(8).toString('hex'), name = engine + ':' + run;
  const client = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
  try {
    fs.writeFileSync(path.join(privateDir, `fixtures-before-${engine}-${run}.json`), JSON.stringify(manifest, null, 2), { flag: 'wx' });
    const password = manifest.accounts[engine].password;
    const account = await client.user.create({ data: { id: uuid(name + ':owner'), email: `f12-${engine}-${run}@example.com`, passwordHash: await bcrypt.hash(password, 10) } });
    const ids = Array.from({ length: 32 }, (_, i) => uuid(name + ':page:' + i));
    for (let i = 0; i < ids.length; i++) {
      let conteudo = i === 0 ? mixed(name, ids) : document(`Busca F12 ${engine} 日本語 ${i}`, name + ':' + i);
      if (i === 25) conteudo = { texto: 'Texto legado 日本語 com acentuação' };
      if (i === 26) conteudo = { type: 'doc', content: [{ type: 'pageReference', attrs: { pageId: ids[1] } }] };
      if (i === 27) conteudo = { type: 'doc', content: [{ type: 'unknownBlock', attrs: { preserved: 'F12' } }] };
      if (i === 28) conteudo = { futureFormat: { secretText: 'Preservar formato desconhecido 日本語' } };
      if (i === 29) conteudo = { type: 'doc', schemaVersion: 999, content: [paragraph('Futuro não editável', name + ':future')] };
      if (i === 30) conteudo = { type: 'doc', schemaVersion: 1, content: [paragraph('Schema atual versionado 日本語', name + ':versioned')] };
      await client.area.create({ data: { id: ids[i], userId: account.id, nome: `F12 ${engine} ${String(i).padStart(2,'0')}`, categoria: 'F12', nivelEntendimento: i % 6, section: 'LINGUAGENS', subSection: i % 2 ? 'ESTUDADO' : 'ESTUDANDO', parentId: i === 1 ? ids[0] : i === 2 ? ids[1] : null, conteudo } });
    }
    manifest.accounts[engine] = { id: account.id, email: account.email, password };
    manifest.fixtures[engine] = { ids, source: ids[0], legacy: ids[25], legacyReference: ids[26], unknownNode: ids[27], unknownRoot: ids[28], future: ids[29], versioned: ids[30] };
    manifest.browserRuns = [...(manifest.browserRuns || []), { run, engine, createdAt: new Date().toISOString() }];
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
    console.log(JSON.stringify({ engine, run, freshPages: 32, previousFixturesPreserved: true, humanAndVolumeUnchanged: true }));
  } finally { await client.$disconnect(); }
}
module.exports = { seed, freshBrowser };
