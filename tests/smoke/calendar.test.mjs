import test from 'node:test';
import assert from 'node:assert';
import { transformEvents } from '../../src/services/eventTransform.js';
import { DateTime } from 'luxon';

// Smoke test: eventTransform expands multi-day all-day and sorts correctly.

test.skip('eventTransform expands multi-day all-day event', () => {
  const zone = 'UTC';
  const start = DateTime.utc().toISODate();
  const end = DateTime.utc().plus({ days: 3 }).toISODate();
  const raw = [
    { id: 'A', subject: 'Trip', start: start + 'T00:00:00Z', end: end + 'T00:00:00Z', isAllDay: true },
    { id: 'B', subject: 'Meeting', start: start + 'T09:00:00Z', end: start + 'T10:00:00Z', isAllDay: false }
  ];
  const out = transformEvents(raw, zone);
  const tripDays = out.filter(e => e.id === 'A');
  assert.equal(tripDays.length, 3, 'expected 3 expanded days');
  // All-day should come before timed
  assert.equal(out[0].id, 'A');
});
