const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const files = [
  '.gitignore', 'README.md', 'frontend/eslint.config.mjs',
  'backend/prisma/schema.prisma', 'backend/prisma/migrations/20261116180000_f11_collections_templates/migration.sql',
  'backend/src/areas/areas.controller.ts', 'backend/src/areas/areas.controller.spec.ts',
  'backend/src/areas/areas.service.ts', 'backend/src/areas/areas.service.spec.ts', 'backend/src/areas/collection-query.ts',
  'backend/src/areas/dto/list-areas-query.dto.ts', 'backend/src/areas/dto/update-area.dto.ts',
  'backend/src/areas/dto/view-configuration.dto.ts', 'backend/src/areas/dto/template.dto.ts',
  'backend/src/areas/view-configurations.controller.ts', 'backend/src/areas/view-configurations.service.ts',
  'backend/src/areas/templates.controller.ts', 'backend/src/areas/templates.service.ts', 'backend/src/areas/templates.service.spec.ts',
  'backend/src/areas/f11-organization.integration.spec.ts', 'backend/src/storage/storage.service.ts',
  'backend/scripts/f11-serve.cjs', 'backend/scripts/f11-upgrade.cjs', 'backend/scripts/f11-source-smoke.cjs',
  'backend/scripts/f11-checks.cjs', 'backend/scripts/f11-reference.cjs',
  'frontend/src/app/page.tsx', 'frontend/src/app/globals.css',
  'frontend/src/app/library-route.ts', 'frontend/src/app/LibraryNavigation.tsx', 'frontend/src/app/page-hierarchy.ts',
  'frontend/src/app/collection-query.ts', 'frontend/src/app/collection.ts', 'frontend/src/app/collection.test.ts',
  'frontend/src/app/StudyProperties.tsx', 'frontend/src/app/TableView.tsx', 'frontend/src/app/BoardView.tsx',
  'frontend/src/app/ViewConfiguration.tsx', 'frontend/src/app/SavedViews.tsx',
  'frontend/src/app/SaveTemplateDialog.tsx', 'frontend/src/app/TemplateGallery.tsx', 'frontend/src/app/TemplateDocument.tsx',
  'frontend/src/app/f11-organization.test.tsx', 'frontend/src/app/navigation.test.tsx',
  'docs/notion/execucao/F11.md', 'docs/notion/execucao/F11-testes.md', 'docs/notion/execucao/F11-correcoes.md',
  'docs/notion/execucao/F8.md', 'docs/notion/Analise_Pos_F7_Proximos_Passos_Biblioteca.md',
  'output/playwright/F11-setup.js', 'output/playwright/F11-collections.js', 'output/playwright/F11-models.js',
  'output/playwright/F11-surfaces.js', 'output/playwright/F11-final-ordering.js',
  'output/playwright/F11-checks-resultados.json', 'output/playwright/F11-collections-resultados.json',
  'output/playwright/F11-models-resultados.json', 'output/playwright/F11-surfaces-resultados.json',
  'output/playwright/F11-final-ordering-resultados.json', 'output/playwright/F11-local-upgrade-resultados.json',
];
const manifest = {
  createdAt: new Date().toISOString(),
  head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(),
  note: 'Existing local working tree; no commit or publication. Credentials, documents, dumps, private inventories, dependencies and builds excluded.',
  files: Object.fromEntries(files.map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])),
};
fs.writeFileSync(path.join(root, 'output/playwright/F11-codigo.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ head: manifest.head, branch: manifest.branch, files: files.length }));
