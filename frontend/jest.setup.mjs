// eslint-disable-next-line @typescript-eslint/no-require-imports -- Jest setup file, CommonJS required for compatibility
require('@testing-library/jest-dom');
// Exercise the IndexedDB adapter, including transactions and account indexes.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { IDBFactory } = require('fake-indexeddb');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { serialize, deserialize } = require('node:v8');
global.structuredClone = value => deserialize(serialize(value));
beforeEach(() => { global.indexedDB = new IDBFactory(); });

// jsdom não implementa os comportamentos nativos de media queries e dialog.
window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
HTMLDialogElement.prototype.show = function () { this.open = true; };
HTMLDialogElement.prototype.showModal = function () { this.open = true; };
HTMLDialogElement.prototype.close = function () { this.open = false; };
