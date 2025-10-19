import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/server/app.js';
import { clearTokens, readTokens } from '../../src/auth/tokenStore.js';
import { ConfidentialClientApplication } from '@azure/msal-node';

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer(app);
    server.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

test.skip('offline_access satisfied by refresh token even if omitted in scopes array - deprecated interactive flow', async () => {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_CLIENT_ID = 'client';
  process.env.AUTH_CLIENT_SECRET = 'secret';
  process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
  process.env.AUTH_SCOPES = 'User.Read,offline_access';
  // Override exchange to return scopes missing offline_access but include refresh token
  const originalAcquire = ConfidentialClientApplication.prototype.acquireTokenByCode;
  ConfidentialClientApplication.prototype.acquireTokenByCode = async () => ({
    accessToken: 'a', refreshToken: 'r', expiresOn: new Date(Date.now()+3600_000), scopes: ['User.Read']
  });
  clearTokens();
  const { server, port } = await startServer();
  try {
    const signinRes = await fetch(`http://localhost:${port}/signin?format=json`);
    const { state } = await signinRes.json();
    const cbRes = await fetch(`http://localhost:${port}/callback?code=abc&state=${state}`);
    assert.equal(cbRes.status, 200, 'callback should succeed');
    const tokens = readTokens();
    assert.ok(tokens && tokens.refreshToken, 'refresh token persisted');
  } finally {
  ConfidentialClientApplication.prototype.acquireTokenByCode = originalAcquire;
    server.close();
  }
});
