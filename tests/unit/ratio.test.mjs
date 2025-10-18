import test from 'node:test';
import assert from 'node:assert';
import { applyGoldenRatio, withinTolerance } from '../../src/util/ratio.js';

test('golden ratio width calculation within tolerance', () => {
  const total = 1618; // easy test number
  const { photoWidth, calendarWidth } = applyGoldenRatio(total);
  const expectedCalendar = Math.round(photoWidth * 1.618);
  assert.ok(withinTolerance(calendarWidth, expectedCalendar, 5));
});