import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { _setPhotos, initPhotoPanelImmediate } from '../../src/public/js/photoRotator.js';

// Simulate apiClient.js fetches by stubbing global fetch through a simple monkey patch pattern.

function stubApi(statusPayload = { auth: { status: 'OK' } }, photosPayload = []) {
  global.fetch = async (url) => {
    if (url.endsWith('/api/status')) {
      return { ok: true, json: async () => statusPayload };
    }
    if (url.endsWith('/api/photos')) {
      return { ok: true, json: async () => photosPayload };
    }
    if (url.endsWith('/api/config')) {
      return { ok: true, json: async () => ({ photoRotationSeconds: 90 }) };
    }
    throw new Error('unexpected url ' + url);
  };
}

async function testImmediateDisplayWithPhotos() {
  const dom = new JSDOM('<div id="photo-panel"></div>');
  global.document = dom.window.document;
  global.window = dom.window;
  stubApi({ auth: { status: 'OK' } }, [ { id: '1', url: 'http://x/a', orientation: 'landscape' } ]);
  await initPhotoPanelImmediate();
  const img = dom.window.document.querySelector('#photo-panel img');
  assert(img, 'image should render immediately');
}

async function testImmediatePlaceholderUnauth() {
  const dom = new JSDOM('<div id="photo-panel"></div>');
  global.document = dom.window.document;
  global.window = dom.window;
  stubApi({ auth: { status: 'NO_TOKEN' } }, []);
  await initPhotoPanelImmediate();
  const ph = dom.window.document.querySelector('#photo-panel .photo-placeholder');
  assert(ph && ph.textContent === 'Sign in required', 'unauth placeholder should show');
}

(async () => {
  await testImmediateDisplayWithPhotos();
  await testImmediatePlaceholderUnauth();
})();
