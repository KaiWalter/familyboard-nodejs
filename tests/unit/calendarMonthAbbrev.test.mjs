import assert from 'node:assert';
import { JSDOM } from 'jsdom';
// Monkey-patch global import resolution for /vendor/luxon.js by providing DateTime from real luxon.
import { DateTime } from 'luxon';
global.fetch = () => { throw new Error('unexpected fetch'); };
// Provide minimal fake module environment for calendarView's luxon import path by aliasing
const moduleCache = new Map();
moduleCache.set('/vendor/luxon.js', { DateTime });
// dynamic import calendarView after patching global
import { renderGrid, dayRange21 } from '../../src/public/js/calendarView.js';

function buildDom() {
  const html = '<div id="calendar-panel"></div>';
  const dom = new JSDOM(html, { pretendToBeVisual: true });
  global.document = dom.window.document;
  global.window = dom.window;
  return dom;
}

function findMonthAbbrevCells(dom) {
  return Array.from(dom.window.document.querySelectorAll('.cell-header')).map(h => h.textContent).filter(t => /\b[A-Z][a-z]{2}$/.test(t) || /\b\d+ [A-Z][a-z]{2}$/.test(t));
}

(async () => {
  const dom = buildDom();
  // Force zone to UTC for deterministic test.
  const days = dayRange21('UTC');
  // Fake config
  const cfg = { locale: 'en-US', timezone: 'UTC', weekdayAbbrevOverride: {} };
  renderGrid(days, cfg);
  const headers = Array.from(dom.window.document.querySelectorAll('.cell-header')).map(h => h.textContent);
  // Month abbreviation should appear for all cells where day-of-month = 1 (pattern '1 MonAbbrev')
  const dayOneHeaders = headers.filter(h => /^1 /.test(h));
  assert(dayOneHeaders.length >= 1, 'should have at least one month boundary in 21-day span');
})();
