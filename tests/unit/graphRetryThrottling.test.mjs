import test from 'node:test';
import assert from 'node:assert';
import { __test } from '../../src/services/graphClient.js';

// Simple fake error object constructor
function makeError(code, message='err') { return { statusCode: code, message }; }

// Capture audits via injected audit function
function runRetrySequence(errors) {
  const audits = [];
  const capture = (type, data) => audits.push({ type, data });
  __test.__setAudit(capture);
  let idx = 0;
  const fn = async () => {
    if (idx < errors.length) throw errors[idx++];
    return 'OK';
  };
  return __test.graphRequestWithRetry(fn, 'test:throttle', { maxRetries: 5, baseDelayMs: 5 })
    .then(result => ({ result, audits }))
    .catch(e => ({ result: e, audits }))
    .finally(() => __test.__setAudit(undefined));
}

// Happy path: 2 throttles then success
test('graph retry handles throttle then success', async () => {
  const { result, audits } = await runRetrySequence([makeError(429), makeError(429)]);
  assert.equal(result, 'OK');
  const backoffs = audits.filter(a => a.type === 'graph.retry.backoff');
  assert.ok(backoffs.length >= 2, 'should have at least two backoff entries');
  assert.ok(backoffs.every(b => b.data.category === 'throttle'), 'all backoffs categorized throttle');
});

// Give up after exceeding retries
test('graph retry gives up on repeated 503', async () => {
  const { result, audits } = await runRetrySequence([makeError(503), makeError(503), makeError(503), makeError(503), makeError(503), makeError(503)]);
  assert.ok(result.statusCode === 503, 'final error should be 503');
  const giveup = audits.find(a => a.type === 'graph.retry.giveup');
  assert.ok(giveup, 'giveup audit present');
  assert.equal(giveup.data.category, 'transient');
});
