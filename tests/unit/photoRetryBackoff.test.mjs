import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { initPhotoPanelImmediate, _getRetryAttempts, _clearRetryTimer, _clearRefreshInterval, _setPhotos } from '../../src/public/js/photoRotator.js';

// We cannot directly control internal schedule array, but we can let the natural schedule run with reduced delays by faking timers.

// Stub global fetch to return empty photos first two times, then photos.
let call = 0;
function stubApi() {
  global.fetch = async (url) => {
    if (url.endsWith('/api/status')) {
      return { ok: true, json: async () => ({ auth: { status: 'OK' } }) };
    }
    if (url.includes('/api/photos')) {
      call++;
      if (call < 3) {
        return { ok: true, json: async () => [] };
      }
      return { ok: true, json: async () => [ { id:'x', url: 'http://x/photo.jpg', orientation: 'landscape' } ] };
    }
    if (url.endsWith('/api/config')) {
      return { ok: true, json: async () => ({ photoRotationSeconds: 90 }) };
    }
    throw new Error('unexpected ' + url);
  };
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const dom = new JSDOM('<div id="photo-panel"></div>');
  global.document = dom.window.document;
  global.window = dom.window;
  stubApi();
  await initPhotoPanelImmediate();
  // Initial attempt empty -> schedule retry chain. Wait progressively up to ~2s which should cover 1s + 2s delays (modified schedule lengths). We abort early when photo appears.
  const start = Date.now();
  let img;
  while (Date.now() - start < 5000) {
    img = dom.window.document.querySelector('#photo-panel img');
    if (img) break;
    await sleep(250);
  }
  assert(img, 'image should appear after retries');
  assert(_getRetryAttempts() >= 1, 'at least one retry attempt should have occurred');
  _clearRetryTimer();
  _clearRefreshInterval();
})();
