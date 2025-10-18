import test from 'node:test';
import assert from 'node:assert';
import { writeTokens, readTokens } from '../../src/auth/tokenStore.js';
import { startRefreshScheduler, stopRefreshScheduler } from '../../src/auth/refreshScheduler.js';

test('refresh scheduler proactively extends expiry', async () => {
  process.env.AUTH_TEST_MODE = '1';
  const startExp = Date.now() + 2 * 60_000;
  writeTokens({ account: { homeAccountId: 'x' }, expiresAt: startExp, scopes: ['User.Read'] });
  startRefreshScheduler(['User.Read'], undefined, 200);
  await new Promise(r => setTimeout(r, 800));
  stopRefreshScheduler();
  const updated = readTokens();
  assert.ok(updated, 'updated tokens should exist');
  const exp = updated.expiresAt || updated.expiresOn;
  assert.ok(exp > startExp, 'expiry should be extended');
});
