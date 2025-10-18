import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/server/app.js';
import { readTokens, clearTokens } from '../../src/auth/tokenStore.js';
import * as codeExchange from '../../src/auth/codeExchange.js';

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer(app);
    server.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

test('scope mismatch returns 400 without revealing differences', async () => {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_CLIENT_ID = 'client';
  process.env.AUTH_CLIENT_SECRET = 'secret';
  process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
  process.env.AUTH_SCOPES = 'User.Read';
  // Force codeExchange to return different scopes via global hook
  const originalHook = global.__EXCHANGE_OVERRIDE__;
  global.__EXCHANGE_OVERRIDE__ = async (code) => ({ accessToken: 't', refreshToken: 'r', expiresAt: Date.now()+3600_000, scopes: ['Calendars.Read'], provider: 'mock'});
  clearTokens();
  const { server, port } = await startServer();
  try {
    const signinRes = await fetch(`http://localhost:${port}/signin`);
    const { state } = await signinRes.json();
    const cbRes = await fetch(`http://localhost:${port}/callback?code=mmm&state=${state}`);
    assert.equal(cbRes.status, 400);
    const body = await cbRes.json();
    assert.equal(body.error, 'scope_mismatch');
    assert.ok(!readTokens(), 'tokens should not be persisted on mismatch');
  } finally {
    if (originalHook) global.__EXCHANGE_OVERRIDE__ = originalHook; else delete global.__EXCHANGE_OVERRIDE__;
    server.close();
  }
});
