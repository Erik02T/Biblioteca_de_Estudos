const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const files = [
  '.gitignore', 'frontend/package.json', 'frontend/package-lock.json', 'frontend/next.config.ts', 'frontend/eslint.config.mjs',
  'frontend/src/app/block-commands.ts', 'frontend/src/app/block-commands.test.ts',
  'frontend/src/app/BlockControls.tsx', 'frontend/src/app/BlockControls.module.css',
  'frontend/src/app/extensions.ts', 'frontend/src/app/editor-document.ts', 'frontend/src/app/editor-document.test.ts',
  'frontend/src/app/document-normalize.ts', 'frontend/src/app/document-resources.ts', 'frontend/src/app/document-nodes.ts',
  'frontend/src/app/document-code.ts', 'frontend/src/app/document-identity.ts', 'frontend/src/app/document-drag.ts',
  'frontend/src/app/document-insertion.ts', 'frontend/src/app/DocumentResourcePicker.tsx',
  'frontend/src/app/f10-document.test.ts', 'frontend/src/app/resource-picker.test.tsx',
  'frontend/src/app/api-client.ts', 'frontend/src/app/api-client.test.ts', 'frontend/src/app/page.tsx',
  'frontend/src/app/EditorLayout.tsx', 'frontend/src/app/globals.css',
  'backend/src/areas/areas.controller.ts', 'backend/src/areas/areas.controller.spec.ts', 'backend/src/areas/areas.service.ts',
  'backend/src/areas/dto/reference-query.dto.ts', 'backend/src/areas/f10-references.integration.spec.ts',
  'backend/scripts/f10-serve.cjs', 'backend/scripts/f10-reference.cjs',
  'output/playwright/F10-setup.js', 'output/playwright/F10-browser.js', 'output/playwright/F10-operations.js',
  'output/playwright/F10-portability.js', 'output/playwright/F10-final-smoke.js',
];
const manifest = {
  createdAt: new Date().toISOString(),
  head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(),
  note: 'Local working tree; no commit or deployment. Secrets, datasets and generated builds excluded.',
  files: Object.fromEntries(files.map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])),
};
fs.writeFileSync(path.join(root, 'output/playwright/F10-codigo.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ head: manifest.head, branch: manifest.branch, files: files.length }));
