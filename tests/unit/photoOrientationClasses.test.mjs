import test from 'node:test';
import assert from 'node:assert';
import { mock } from 'node:test';
import { JSDOM } from 'jsdom';

const fixtureHtml = `
  <main id="app">
    <section id="photo-panel"></section>
    <section id="calendar-panel"></section>
  </main>
`;

test.skip('photo rotator applies orientation-specific classes', async (t) => {
  const dom = new JSDOM(fixtureHtml, { pretendToBeVisual: true, url: 'http://localhost' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;

  const apiClient = await import('../../src/public/js/apiClient.js');
  const responses = {
    '/api/status': { auth: { status: 'OK' } },
    '/api/photos': [
      { id: 'portrait', url: 'http://example/portrait.jpg', orientation: 'portrait' }
    ],
    '/api/config': { photoRotationSeconds: 90 }
  };
  const restoreApi = mock.method(apiClient, 'apiGet', async (path) => {
    return responses[path];
  });

  const photoRotator = await import('../../src/public/js/photoRotator.js');
  t.after(() => {
    restoreApi.mock.restore();
    photoRotator._clearInterval();
    photoRotator._clearRefreshInterval();
    delete global.window;
    delete global.document;
    delete global.navigator;
  });

  await photoRotator.initPhotoPanelImmediate();
  const img = document.querySelector('#photo-panel img');
  assert(img, 'image should be rendered');
  assert(img.classList.contains('photo-portrait'), 'portrait orientation class should be applied');
});
