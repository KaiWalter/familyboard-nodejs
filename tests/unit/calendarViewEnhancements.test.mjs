import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// We import the module after setting up DOM globals so that it can access document.
async function loadModule() {
  const mod = await import('../../src/public/js/calendarView.js');
  return mod;
}

function setupDom() {
  const dom = new JSDOM(`<!DOCTYPE html><div id="calendar-panel"></div>`);
  global.window = dom.window;
  global.document = dom.window.document;
  return dom;
}

// Mock apiGet used inside calendarView.js
const eventsMock = [
  // unsorted intentionally: timed earlier comes after later, all-day mixed
  { subject: 'Zebra AllDay', isAllDay: true, start: '2025-10-19T00:00:00.000Z', end: '2025-10-19T23:59:59.000Z' },
  { subject: 'Alpha AllDay', isAllDay: true, start: '2025-10-19T00:00:00.000Z', end: '2025-10-19T23:59:59.000Z' },
  { subject: 'Later Meeting', isAllDay: false, start: '2025-10-19T15:00:00.000Z', end: '2025-10-19T16:00:00.000Z' },
  { subject: 'Earlier Meeting', isAllDay: false, start: '2025-10-19T08:00:00.000Z', end: '2025-10-19T09:00:00.000Z' }
];

let apiGetCalls = [];
function mockApiGet(path) {
  apiGetCalls.push(path);
  if (path === '/api/config') {
    return Promise.resolve({ timezone: 'UTC', locale: 'en-US' });
  }
  if (path === '/api/events') {
    return Promise.resolve(eventsMock);
  }
  return Promise.resolve({});
}

// Inject the mock by defining a module alias via dynamic import interception.
// ESM interception is non-trivial; instead we temporarily monkey patch global fetch layer used by apiClient if needed.
// Simpler: stub global.fetch and rely on apiClient.js using fetch.

// However calendarView imports apiClient directly; we will create a manual shim by placing apiGet on globalThis before import.

globalThis.apiGet = mockApiGet; // calendarView uses named import though; cannot override easily without loader hooks.
// Workaround: We'll dynamically import apiClient.js and replace its export after import of calendarView.

// Instead: create a proxy module via dynamic import with data URL (skipped for brevity). For now we test renderGrid & attachEvents directly.

import { DateTime } from 'luxon';

await test('week numbers, month abbreviations, event sorting', async () => {
  setupDom();
  const { dayRange21, renderGrid, attachEvents } = await loadModule();
  const tz = 'UTC';
  const days = dayRange21(tz);
  renderGrid(days, { timezone: tz, locale: 'en-US', weekdayAbbrevOverride: {} });

  // Check week number headers (3 rows)
  const weekHeaders = [...document.querySelectorAll('.row-header')];
  assert.strictEqual(weekHeaders.length, 3, 'should have 3 week number headers');
  weekHeaders.forEach(w => assert.ok(/^[0-9]{1,2}$/.test(w.textContent)));

  // Month abbreviation present in first Monday cell header and any day-of-month=1 headers
  const headers = [...document.querySelectorAll('.cell-header')];
  const firstMondayHeader = headers[0].textContent;
  assert.ok(/\b[A-Za-z]{3}\b/.test(firstMondayHeader), 'first Monday cell header includes month abbreviation');
  const dom1Headers = headers.filter(h => h.textContent.startsWith('1 '));
  dom1Headers.forEach(h => assert.ok(/1 [A-Za-z]{3}/.test(h.textContent), 'day-of-month=1 header includes month abbreviation'));

  // Attach events and verify ordering within target date cell
  const targetDate = DateTime.fromISO(eventsMock[0].start).toISODate();
  attachEvents(eventsMock, tz);
  const cell = document.querySelector(`.cell[data-date="${targetDate}"]`);
  const eventDivs = [...cell.querySelectorAll('.event')];
  const texts = eventDivs.map(d => d.textContent);
  // Expected order: Alpha AllDay, Zebra AllDay, Earlier Meeting, Later Meeting
  assert.strictEqual(texts[0].startsWith('Alpha AllDay'), true, 'Alpha first (all-day alphabetical)');
  assert.strictEqual(texts[1].startsWith('Zebra AllDay'), true, 'Zebra second (all-day alphabetical)');
  assert.strictEqual(texts[2].includes('Earlier Meeting'), true, 'Earlier timed meeting before later');
  assert.strictEqual(texts[3].includes('Later Meeting'), true, 'Later meeting last');
});
