// Focused prerequisite audit. Failing checks describe existing F2/F4 behavior.
const { randomUUID } = require('node:crypto');
const database = process.env.F7_TEST_DATABASE;
if (!/^biblioteca_test_[a-z0-9_]+$/.test(database || '')) throw Error('Explicit isolated database required');
process.env.DATABASE_URL = `postgresql://biblioteca:biblioteca@localhost:5433/${database}`;
const { PrismaService } = require('../dist/src/prisma/prisma.service');
const { AreasService } = require('../dist/src/areas/areas.service');
const { StorageService } = require('../dist/src/storage/storage.service');
const prisma = new PrismaService();
async function main() {
  const user = await prisma.user.create({ data: { email: `f7-audit-${randomUUID()}@example.com`, passwordHash: 'test-only' } });
  const areas = new AreasService(prisma, new StorageService());
  const create = (nome, parentId) => prisma.area.create({ data: { userId: user.id, nome, categoria: 'F7 audit', section: 'LINGUAGENS', subSection: 'ESTUDANDO', parentId } });
  const root = await create('Mover ramo'); const child = await create('Descendente', root.id);
  await areas.update(user.id, root.id, { updatedAt: root.updatedAt.toISOString(), section: 'FACULDADE' });
  const movedChild = await prisma.area.findUniqueOrThrow({ where: { id: child.id } });
  const parent = await create('Lixeira de ramo'); const descendant = await create('Filha ativa', parent.id);
  await areas.trash(user.id, parent.id);
  const trashedChild = await prisma.area.findUniqueOrThrow({ where: { id: descendant.id } });
  const checks = [
    { id: 'H-F7-004', requirement: 'RF-004/RN-003', expected: 'FACULDADE', observed: movedChild.section, result: movedChild.section === 'FACULDADE' ? 'PASS' : 'FAIL' },
    { id: 'H-F7-017', requirement: 'RF-017/RN-010', expected: 'descendant deletedAt != null', observed: trashedChild.deletedAt, result: trashedChild.deletedAt ? 'PASS' : 'FAIL' },
  ];
  console.log(JSON.stringify({ database, checks }, null, 2));
  if (checks.some(check => check.result === 'FAIL')) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
