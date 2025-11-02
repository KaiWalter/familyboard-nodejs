import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
// Dynamic import of app after env setup ensures msalClient uses test-mode/public path and picks up patches.
import { PublicClientApplication, ConfidentialClientApplication } from '@azure/msal-node';
import { __resetMsalClientForTests, clearMsalCache } from '../../src/auth/msalClient.js';

function snapshotAuthEnv() {
  return {
    clientId: process.env.AUTH_CLIENT_ID,
    clientSecret: process.env.AUTH_CLIENT_SECRET,
    testMode: process.env.AUTH_TEST_MODE,
    redirectUri: process.env.AUTH_REDIRECT_URI,
    scopes: process.env.AUTH_SCOPES,
    nodeEnv: process.env.NODE_ENV
  };
}

function restoreAuthEnv(snapshot) {
  if (snapshot.clientId === undefined) delete process.env.AUTH_CLIENT_ID; else process.env.AUTH_CLIENT_ID = snapshot.clientId;
  if (snapshot.clientSecret === undefined) delete process.env.AUTH_CLIENT_SECRET; else process.env.AUTH_CLIENT_SECRET = snapshot.clientSecret;
  if (snapshot.testMode === undefined) delete process.env.AUTH_TEST_MODE; else process.env.AUTH_TEST_MODE = snapshot.testMode;
  if (snapshot.redirectUri === undefined) delete process.env.AUTH_REDIRECT_URI; else process.env.AUTH_REDIRECT_URI = snapshot.redirectUri;
  if (snapshot.scopes === undefined) delete process.env.AUTH_SCOPES; else process.env.AUTH_SCOPES = snapshot.scopes;
  if (snapshot.nodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = snapshot.nodeEnv;
}

async function startServer() {
  const { default: app } = await import('../../src/server/app.js');
  return new Promise(resolve => {
    const server = http.createServer(app);
    server.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

test('manual rotate fails with 400 when no accounts', async () => {
  const envSnapshot = snapshotAuthEnv();
  process.env.NODE_ENV = 'test';
  // Ensure test mode bypass is disabled for this scenario
  delete process.env.AUTH_TEST_MODE;
  // Remove client secret so msalClient initializes public client without testMode bypass and without synthetic account injection
  delete process.env.AUTH_CLIENT_SECRET;
  delete process.env.AUTH_CLIENT_ID;
  clearMsalCache();
  __resetMsalClientForTests();
  const { server, port } = await startServer();
  try {
    const res = await fetch(`http://localhost:${port}/api/auth/rotate`, { method: 'POST' });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'no_user_session');
  } finally {
    restoreAuthEnv(envSnapshot);
    server.close();
  }
});

test('manual rotate succeeds under TEST_MODE', async () => {
  const envSnapshot = snapshotAuthEnv();
  process.env.NODE_ENV = 'test';
  process.env.AUTH_TEST_MODE = '1';
  process.env.AUTH_CLIENT_ID = 'client';
  process.env.AUTH_CLIENT_SECRET = 'secret';
  process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
  process.env.AUTH_SCOPES = 'User.Read';
  const originalPublic = PublicClientApplication.prototype.acquireTokenByCode;
  const originalConfidential = ConfidentialClientApplication.prototype.acquireTokenByCode;
  const fakeResult = { accessToken: 'rotate_access', refreshToken: 'rotate_refresh', expiresOn: new Date(Date.now()+3600_000), scopes: ['User.Read'] };
  PublicClientApplication.prototype.acquireTokenByCode = async () => fakeResult;
  ConfidentialClientApplication.prototype.acquireTokenByCode = async () => fakeResult;
  clearMsalCache();
  __resetMsalClientForTests();
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
    PublicClientApplication.prototype.acquireTokenByCode = originalPublic;
    ConfidentialClientApplication.prototype.acquireTokenByCode = originalConfidential;
    server.close();
    delete process.env.AUTH_TEST_MODE;
    restoreAuthEnv(envSnapshot);
  }
});
