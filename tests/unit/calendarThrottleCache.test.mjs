import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { mock } from 'node:test';

import { setCache } from '../../src/services/cache.js';

const TMP_DIR = path.join(process.cwd(), '.tmp-tests');
const TMP_EVENTS = path.join(TMP_DIR, 'events.json');

function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
}

test.skip('calendar fetch falls back to cache then recovers after throttling', async (t) => {
  ensureTmpDir();
  const calendarService = await import('../../src/services/calendarService.js');
  const store = await import('../../src/config/store.js');

  const restoreConfig = mock.method(store, 'loadConfig', () => ({
    calendarIds: ['primary'],
    timezone: 'UTC'
  }));

  calendarService.__resetEventsCacheForTests();
  calendarService.__setEventsCachePath(TMP_EVENTS);

  t.after(() => {
    restoreConfig.mock.restore();
    calendarService.__setFetchCalendarView(undefined);
    calendarService.__resetEventsCacheForTests();
    calendarService.__setEventsCachePath(undefined);
    try {
      if (fs.existsSync(TMP_DIR)) fs.rmSync(TMP_DIR, { recursive: true, force: true });
    } catch {}
  });

  const cached = [{
    id: 'cached-1',
    subject: 'Cached Event',
    start: '2025-01-01T00:00:00Z',
    end: '2025-01-01T01:00:00Z',
    isAllDay: false,
    calendarId: 'primary'
  }];
  setCache('events', cached, Date.now() - 1000);

  let fetchCalls = 0;
  calendarService.__setFetchCalendarView(async () => {
    fetchCalls += 1;
    if (fetchCalls === 1) {
      const err = new Error('TooManyRequests');
      err.statusCode = 429;
      throw err;
    }
    return [{
      id: 'graph-1',
      subject: 'Graph Event',
      start: { dateTime: '2025-10-18T10:00:00', timeZone: 'UTC' },
      end: { dateTime: '2025-10-18T11:00:00', timeZone: 'UTC' },
      isAllDay: false
    }];
  });

  const first = await calendarService.fetchEvents();
  assert.deepStrictEqual(first, cached, 'throttled fetch should return cached events');

  const second = await calendarService.fetchEvents();
  assert.strictEqual(second.length, 1, 'successful retry should return new event');
  assert.strictEqual(second[0].id, 'graph-1');
  assert.strictEqual(fetchCalls, 2, 'fetch called twice (initial + retry)');
});
