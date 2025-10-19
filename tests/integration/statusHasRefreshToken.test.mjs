import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/server/app.js';
import { clearTokens } from '../../src/auth/tokenStore.js';
import { ConfidentialClientApplication } from '@azure/msal-node';

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer(app);
    server.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

test.skip('status reports hasRefreshToken=false before auth - deprecated', async () => {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_CLIENT_ID = 'client';
  process.env.AUTH_CLIENT_SECRET = 'secret';
  process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
  process.env.AUTH_SCOPES = 'User.Read';
  clearTokens();
  const { server, port } = await startServer();
  try {
    const res = await fetch(`http://localhost:${port}/api/status`);
    const body = await res.json();
    assert.equal(body.auth.hasRefreshToken, false);
  } finally {
    server.close();
  }
});

test.skip('status reports hasRefreshToken=true after auth with refresh token - deprecated', async () => {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_CLIENT_ID = 'client';
  process.env.AUTH_CLIENT_SECRET = 'secret';
  process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
  process.env.AUTH_SCOPES = 'User.Read,offline_access';
  // Override exchange to return refresh token
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
    assert.equal(cbRes.status, 200);
    const statusRes = await fetch(`http://localhost:${port}/api/status`);
    const statusBody = await statusRes.json();
    assert.equal(statusBody.auth.hasRefreshToken, true);
  } finally {
  ConfidentialClientApplication.prototype.acquireTokenByCode = originalAcquire;
    server.close();
  }
});
