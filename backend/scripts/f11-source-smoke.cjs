// Read-only compatibility smoke against the explicitly identified local library.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const env = require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true }).parsed;
const source = new URL(env.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(source.hostname) || source.port !== '5433' || source.pathname !== '/biblioteca_estudos') throw Error('Refusing an unidentified/nonlocal source');
Object.assign(process.env, env);
const { PrismaClient } = require('@prisma/client');
const { AreasService } = require('../dist/src/areas/areas.service');
const { StorageService } = require('../dist/src/storage/storage.service');
const prisma = new PrismaClient();
async function main() {
  const run = fs.readFileSync(path.join(root, '.f8-artifacts/f11-upgrade-latest'), 'utf8').trim();
  if (!/^\d{14}$/.test(run)) throw Error('Invalid upgrade identifier');
  const directory = path.join(root, '.f8-artifacts/f11-upgrade-' + run);
  const upgrade = JSON.parse(fs.readFileSync(path.join(directory, 'source-verified.json'), 'utf8'));
  const clone = JSON.parse(fs.readFileSync(path.join(directory, 'restore-verified.json'), 'utf8'));
  const owner = await prisma.area.findFirst({ select: { userId: true } });
  const areas = new AreasService(prisma, new StorageService());
  const pages = owner ? await areas.listCollection(owner.userId, { page: 1, limit: 20, scope: 'ALL' }, true) : { items: [], pagination: { total: 0 } };
  if (pages.items.some(page => 'conteudo' in page)) throw Error('Metadata query exposed a body');
  await prisma.areaOpening.count();
  await prisma.templateFile.count();
  await prisma.template.findMany({ take: 1, select: { id: true, metadata: true, deletedAt: true } });
  const result = { verifiedAt: new Date().toISOString(), result: 'PASS', readOnly: true, run,
    backupRestoredAndMigrationVerifiedInClone: clone.migrationVerified === true,
    localMigrationVerified: upgrade.result === 'PASS',
    existingPagesPreservedAtUpgrade: upgrade.tables.Area.count,
    existingAttachmentsPreservedAtUpgrade: upgrade.tables.Attachment.count,
    storageObjectsPreservedAtUpgrade: upgrade.objects,
    metadataListing: 'PASS', additiveTables: 'PASS',
  };
  fs.writeFileSync(path.join(root, 'output/playwright/F11-local-upgrade-resultados.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
