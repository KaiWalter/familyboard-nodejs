import test from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

const fixtureHtml = `
  <body>
    <main id="app">
      <section id="calendar-panel"></section>
      <section id="photo-panel"></section>
    </main>
  </body>
`;

test.skip('offline banner does not disturb golden ratio layout widths', async (t) => {
  const dom = new JSDOM(fixtureHtml, { pretendToBeVisual: true, url: 'http://localhost' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  window.innerWidth = 1920;

  const layout = await import('../../src/public/js/layout.js');
  const offlineBanner = await import('../../src/public/js/offlineBanner.js');

  t.after(() => {
    delete global.window;
    delete global.document;
    delete global.navigator;
  });

  const cfg = { goldenRatio: true };
  layout.initResponsive(cfg);
  const calendar = document.getElementById('calendar-panel');
  const photos = document.getElementById('photo-panel');
  const calendarWidthBefore = calendar.style.width;
  const photoWidthBefore = photos.style.width;

  Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
  offlineBanner.initOfflineBanner();
  window.dispatchEvent(new window.Event('offline'));

  const banner = document.getElementById('offline-banner');
  assert(banner, 'offline banner should be injected');
  assert.strictEqual(banner.style.position, 'fixed', 'banner should be fixed to avoid layout shifts');
  assert.strictEqual(banner.style.display, 'block', 'offline event should display banner');

  assert.strictEqual(calendar.style.width, calendarWidthBefore, 'calendar width unchanged when offline banner visible');
  assert.strictEqual(photos.style.width, photoWidthBefore, 'photo width unchanged when offline banner visible');

  Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
});
