import test from 'node:test';
import assert from 'node:assert';
import { acquireAppToken, invalidateAppToken } from '../../src/auth/clientCredentials.js';
import { setTokenPath, clearTokens, readTokens } from '../../src/auth/tokenStore.js';

// Basic test for client credentials acquisition & caching behavior

test('client credentials acquires and caches token', async () => {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_TENANT = 'common';
  // Provide fake client details (acquireTokenByClientCredential will likely fail unless monkey patched)
  process.env.AUTH_CLIENT_ID = 'client';
  process.env.AUTH_CLIENT_SECRET = 'secret';
  setTokenPath('data/tokens_client_credentials.json');
  clearTokens();
  // Monkey patch MSAL client method by importing after first call builds client
  const { ConfidentialClientApplication } = await import('@azure/msal-node');
  const original = ConfidentialClientApplication.prototype.acquireTokenByClientCredential;
  ConfidentialClientApplication.prototype.acquireTokenByClientCredential = async () => ({ accessToken: 'app_token_123', expiresOn: new Date(Date.now()+3600_000) });
  try {
    const first = await acquireAppToken(['https://graph.microsoft.com/.default']);
    assert.match(first.accessToken, /app_token_123/);
    const persisted = readTokens();
    assert.ok(persisted && persisted.accessToken === 'app_token_123');
    const second = await acquireAppToken(['https://graph.microsoft.com/.default']);
    assert.strictEqual(second.accessToken, first.accessToken, 'should reuse cached token');
    invalidateAppToken();
    const third = await acquireAppToken(['https://graph.microsoft.com/.default']);
    assert.ok(third.accessToken === 'app_token_123', 'reacquired after invalidation');
  } finally {
    ConfidentialClientApplication.prototype.acquireTokenByClientCredential = original;
  }
});
