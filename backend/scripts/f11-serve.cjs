// Exclusive fixture API. Never reads the user's .env or stops their servers.
const { env } = require('./f8-environment.cjs');
const fs = require('node:fs');
const path = require('node:path');
const directory = path.resolve(__dirname, '../../.f8-artifacts');
fs.mkdirSync(directory, { recursive: true });
const secretPath = path.join(directory, 'f11-session-secret');
if (!fs.existsSync(secretPath)) fs.writeFileSync(secretPath, env.JWT_SECRET, { flag: 'wx' });
Object.assign(process.env, env, { JWT_SECRET: fs.readFileSync(secretPath, 'utf8'), PORT: '3057', FRONTEND_URL: 'http://localhost:3058' });
require('../dist/src/main.js');
