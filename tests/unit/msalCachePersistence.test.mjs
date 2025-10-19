import assert from 'node:assert/strict';
import { cacheLoad, cacheSave } from '../../src/auth/tokenCacheStore.js';
import { loadMsalClient } from '../../src/auth/msalClient.js';

// Roundtrip test: serialize current (empty) MSAL cache, persist via plugin helpers, reload client and ensure access to accounts works without error.

const client = loadMsalClient();
const initialSerialized = client.getTokenCache().serialize();
cacheSave(initialSerialized);
const loaded = cacheLoad();
assert.equal(loaded, initialSerialized, 'cache roundtrip should be identical for empty state');
const accounts = await client.getTokenCache().getAllAccounts();
assert.ok(Array.isArray(accounts), 'accounts should be an array');
console.log('msal cache roundtrip empty state OK');
