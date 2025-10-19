import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/server/app.js';
import { clearTokens, readTokens, setTokenPath } from '../../src/auth/tokenStore.js';
import { ConfidentialClientApplication } from '@azure/msal-node';

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer(app);
    server.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

test.skip('space-delimited scope string normalizes and passes validation - deprecated', async () => {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_CLIENT_ID = 'client';
  process.env.AUTH_CLIENT_SECRET = 'secret';
  process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
  process.env.AUTH_SCOPES = 'User.Read,offline_access';
  setTokenPath('data/tokens_scopestring.json');
  const originalAcquire = ConfidentialClientApplication.prototype.acquireTokenByCode;
  ConfidentialClientApplication.prototype.acquireTokenByCode = async () => ({
    accessToken: 'a', refreshToken: 'r', expiresOn: new Date(Date.now()+3600_000), scopes: 'User.Read offline_access'
  });
  clearTokens();
  const { server, port } = await startServer();
  try {
    const signinRes = await fetch(`http://localhost:${port}/signin?format=json`);
    const { state } = await signinRes.json();
    const cbRes = await fetch(`http://localhost:${port}/callback?code=abc&state=${state}`);
    assert.equal(cbRes.status, 200);
    const tokens = readTokens();
    assert.ok(tokens && tokens.scopes.includes('User.Read'));
  } finally {
  ConfidentialClientApplication.prototype.acquireTokenByCode = originalAcquire;
    server.close();
  }
});
