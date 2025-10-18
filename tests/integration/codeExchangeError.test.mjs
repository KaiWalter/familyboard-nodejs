import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/server/app.js';
import { clearTokens } from '../../src/auth/tokenStore.js';

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer(app);
    server.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

test('code exchange failure returns 500 and no tokens', async () => {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_CLIENT_ID = 'client';
  process.env.AUTH_CLIENT_SECRET = 'secret';
  process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
  process.env.AUTH_SCOPES = 'User.Read';
  delete process.env.AUTH_TEST_MODE; // real branch (will still use override)
  const original = global.__EXCHANGE_OVERRIDE__;
  global.__EXCHANGE_OVERRIDE__ = async () => { throw new Error('forced_fail'); };
  clearTokens();
  const { server, port } = await startServer();
  try {
    const signinRes = await fetch(`http://localhost:${port}/signin`);
    const { state } = await signinRes.json();
    const cbRes = await fetch(`http://localhost:${port}/callback?code=bad&state=${state}`);
    assert.equal(cbRes.status, 500);
    const body = await cbRes.json();
    assert.equal(body.error, 'exchange_failed');
  } finally {
    if (original) global.__EXCHANGE_OVERRIDE__ = original; else delete global.__EXCHANGE_OVERRIDE__;
    server.close();
  }
});
