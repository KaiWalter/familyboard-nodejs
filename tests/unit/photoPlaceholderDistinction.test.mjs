import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { initPhotoPanelImmediate } from '../../src/public/js/photoRotator.js';

function stub(status, photos) {
  global.fetch = async (url) => {
    if (url.endsWith('/api/status')) return { ok: true, json: async () => ({ auth: { status } }) };
    if (url.endsWith('/api/photos')) return { ok: true, json: async () => photos };
    if (url.endsWith('/api/config')) return { ok: true, json: async () => ({ photoRotationSeconds: 90 }) };
    throw new Error('unexpected url '+url);
  };
}

async function runUnauth() {
  const dom = new JSDOM('<div id="photo-panel"></div>');
  global.document = dom.window.document;
  global.window = dom.window;
  stub('NO_TOKEN', []);
  await initPhotoPanelImmediate();
  return dom.window.document.querySelector('#photo-panel').textContent;
}

async function runEmptyFolder() {
  const dom = new JSDOM('<div id="photo-panel"></div>');
  global.document = dom.window.document;
  global.window = dom.window;
  stub('OK', []);
  await initPhotoPanelImmediate();
  return dom.window.document.querySelector('#photo-panel').textContent;
}

(async () => {
  const unauthText = await runUnauth();
  const emptyText = await runEmptyFolder();
  assert(unauthText.includes('Sign in required'), 'unauth placeholder expected');
  assert(emptyText.includes('No photos'), 'empty folder placeholder expected');
})();
