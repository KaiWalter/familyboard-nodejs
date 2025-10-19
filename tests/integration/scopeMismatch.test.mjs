import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/server/app.js';
import { readTokens, clearTokens } from '../../src/auth/tokenStore.js';
import { ConfidentialClientApplication } from '@azure/msal-node';

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer(app);
    server.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

test.skip('scope mismatch returns 400 without revealing differences - deprecated interactive flow', async () => {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_CLIENT_ID = 'client';
  process.env.AUTH_CLIENT_SECRET = 'secret';
  process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
  process.env.AUTH_SCOPES = 'User.Read';
  // Force codeExchange to return different scopes via global hook
  const originalAcquire = ConfidentialClientApplication.prototype.acquireTokenByCode;
  ConfidentialClientApplication.prototype.acquireTokenByCode = async () => ({
    accessToken: 't', refreshToken: 'r', expiresOn: new Date(Date.now()+3600_000), scopes: ['Calendars.Read']
  });
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
  ConfidentialClientApplication.prototype.acquireTokenByCode = originalAcquire;
    server.close();
  }
});
