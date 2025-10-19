import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/server/app.js';
// tokenStore removed; rely on MSAL accounts and TEST_MODE

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer(app);
    server.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

test('manual rotate fails with 400 when no accounts', async () => {
  process.env.NODE_ENV = 'test';
  const { server, port } = await startServer();
  try {
    const res = await fetch(`http://localhost:${port}/api/auth/rotate`, { method: 'POST' });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'no_user_session');
  } finally { server.close(); }
});

import { PublicClientApplication } from '@azure/msal-node';
test('manual rotate succeeds under TEST_MODE', async () => {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_TEST_MODE = '1';
  process.env.AUTH_CLIENT_ID = 'client';
  process.env.AUTH_CLIENT_SECRET = 'secret';
  process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
  process.env.AUTH_SCOPES = 'User.Read';
  const originalAcquire = PublicClientApplication.prototype.acquireTokenByCode;
  // Patch the PublicClientApplication used by msalClient to simulate successful code exchange
  PublicClientApplication.prototype.acquireTokenByCode = async () => ({ accessToken: 'rotate_access', refreshToken: 'rotate_refresh', expiresOn: new Date(Date.now()+3600_000), scopes: ['User.Read'] });
  const { server, port } = await startServer();
  try {
    const signinRes = await fetch(`http://localhost:${port}/signin`);
    const { state } = await signinRes.json();
    const resCb = await fetch(`http://localhost:${port}/callback?code=rotatetest&state=${state}`, { redirect: 'manual' });
    assert.ok([200,302].includes(resCb.status));
    const rotateRes = await fetch(`http://localhost:${port}/api/auth/rotate`, { method: 'POST' });
    assert.equal(rotateRes.status, 200);
    const body = await rotateRes.json();
    assert.ok(body.success);
  } finally {
    PublicClientApplication.prototype.acquireTokenByCode = originalAcquire;
    server.close();
  }
});
