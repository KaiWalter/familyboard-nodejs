import test from 'node:test';
import assert from 'node:assert';
import { createPendingState, consumeState } from '../../src/auth/sessionStore.js';

test.skip('state single-use consumption', () => {
  const s = 'teststate123';
  createPendingState(s);
  assert.equal(consumeState(s), true, 'first consume succeeds');
  assert.equal(consumeState(s), false, 'second consume fails');
});
