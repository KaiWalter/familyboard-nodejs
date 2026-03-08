import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

// Target modules
import { startRefreshScheduler, stopRefreshScheduler, performSingleRefresh } from '../../src/auth/refreshScheduler.js';
import { setCache, getCache } from '../../src/services/cache.js';
import * as msalToken from '../../src/auth/msalToken.js';

// We'll stub acquireTokenSilent via dependency injection to performSingleRefresh/startRefreshScheduler

let currentToken = 'access_old_1234567890';
let expiresAt = Date.now() + 5 * 60_000;

beforeEach(() => {
  currentToken = 'access_old_' + Math.random().toString(36).slice(2);
  expiresAt = Date.now() + 5 * 60_000;
  stopRefreshScheduler();
});

afterEach(() => { stopRefreshScheduler(); });

// Mock acquire function returning a new token with longer expiry
async function mockAcquire(scopes) {
  currentToken = 'access_new_' + Math.random().toString(36).slice(2);
  expiresAt = Date.now() + 60 * 60_000;
  return {
    account: { homeAccountId: 'test.account' },
    accessToken: currentToken,
    expiresOn: new Date(expiresAt)
  };
}

// Use test override hook
msalToken.__setMetadataProviderForTests(async () => ({
  status: 'OK',
  expiresAt,
  scopes: ['Calendars.Read'],
  account: { homeAccountId: 'test.account', username: 'user@example.com' }
}));

// Helper to await a condition within timeout
async function waitFor(cond, timeoutMs = 2000, intervalMs = 50) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (cond()) return true;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}

test.skip('performSingleRefresh updates token via MSAL-only flow', async () => {
  const beforeToken = currentToken;
  const res = await performSingleRefresh(['Calendars.Read'], mockAcquire);
  assert.equal(res.updated, true, 'manual refresh should report updated');
  assert.notEqual(currentToken, beforeToken, 'token should change');
  assert.ok(expiresAt - Date.now() > 50 * 60_000, 'expiry extended ~60min');
});

test.skip('scheduler triggers refresh when <10m remaining and invalidates caches', async () => {
  setCache('photos', [{ id: 'p1' }]);
  setCache('events', [{ id: 'e1' }]);
  // Force imminent expiry
  expiresAt = Date.now() + 2 * 60_000;
  startRefreshScheduler(['Calendars.Read'], mockAcquire, 200);
  const ok = await waitFor(() => currentToken.startsWith('access_new_'), 3000);
  assert.ok(ok, 'scheduler performed refresh');
  const photosCache = getCache('photos');
  const eventsCache = getCache('events');
  assert.ok(photosCache === null || photosCache.data === null, 'photos cache invalidated');
  assert.ok(eventsCache === null || eventsCache.data === null, 'events cache invalidated');
});
