import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { applyLayout } from '../../src/public/js/layout.js';

(async () => {
  const dom = new JSDOM('<div id="app"><div id="photo-panel"></div><div id="calendar-panel"></div></div>', { pretendToBeVisual: true });
  global.document = dom.window.document;
  global.window = dom.window;
  // Simulate viewport width
  dom.window.innerWidth = 1618; // easy number for phi ratio testing
  applyLayout({ goldenRatio: true });
  const photoW = parseInt(dom.window.document.getElementById('photo-panel').style.width, 10);
  const calW = parseInt(dom.window.document.getElementById('calendar-panel').style.width, 10);
  const ratio = calW / photoW;
  assert(ratio > 1.55 && ratio < 1.68, 'ratio within tolerance');
})();
