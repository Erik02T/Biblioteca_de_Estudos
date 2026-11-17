// Dedicated F10 server; reuses only the named F8 test database and bucket.
const { env } = require('./f8-environment.cjs');
const fs = require('node:fs');
const path = require('node:path');
const directory = path.resolve(__dirname, '../../.f8-artifacts');
fs.mkdirSync(directory, { recursive: true });
const secretPath = path.join(directory, 'f10-session-secret');
if (!fs.existsSync(secretPath)) fs.writeFileSync(secretPath, env.JWT_SECRET, { flag: 'wx' });
// Retain only this fixture session across deliberate test-server restarts.
Object.assign(process.env, env, { JWT_SECRET: fs.readFileSync(secretPath, 'utf8'), PORT: '3047', FRONTEND_URL: 'http://localhost:3048' });
require('../dist/src/main.js');
