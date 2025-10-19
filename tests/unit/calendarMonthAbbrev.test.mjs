import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { DateTime } from 'luxon';
global.fetch = () => { throw new Error('unexpected fetch'); };
import { renderGrid, dayRange21 } from '../../src/public/js/calendarView.js';

function buildDom() {
  const html = '<div id="calendar-panel"></div>';
  const dom = new JSDOM(html, { pretendToBeVisual: true });
  global.document = dom.window.document;
  global.window = dom.window;
  return dom;
}

(async () => {
  const dom = buildDom();
  const days = dayRange21('UTC');
  const cfg = { locale: 'en-US', timezone: 'UTC', weekdayAbbrevOverride: {} };
  renderGrid(days, cfg);
  const headers = Array.from(dom.window.document.querySelectorAll('.cell-header')).map(h => h.textContent);
  const dayOneHeaders = headers.filter(h => /^1 /.test(h));
  assert(dayOneHeaders.length >= 1, 'should have at least one month boundary in 21-day span');
  // Verify every header representing day-of-month 1 includes a three-letter month abbreviation
  for (const h of dayOneHeaders) {
    assert(/^(1) [A-Z][a-z]{2}$/.test(h), `header '${h}' should have month abbreviation`);
  }
})();
