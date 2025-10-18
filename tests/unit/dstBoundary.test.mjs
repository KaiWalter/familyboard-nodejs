import test from 'node:test';
import assert from 'node:assert';
import { DateTime } from 'luxon';

test('DST boundary conversion does not throw', () => {
  // Example: US DST start 2025-03-09
  const before = DateTime.fromISO('2025-03-09T01:30:00', { zone: 'America/New_York' });
  const after = before.plus({ hours: 2 }); // crosses 2am skip
  assert.ok(after.hour === 3 || after.hour === 4, 'hour should advance past missing hour');
});