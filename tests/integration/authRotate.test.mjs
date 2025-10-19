import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/server/app.js';
import { writeTokens, clearTokens, readTokens, setTokenPath } from '../../src/auth/tokenStore.js';

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer(app);
    server.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

test('manual rotate fails with 400 when no tokens', async () => {
  process.env.NODE_ENV = 'test';
  clearTokens();
  setTokenPath('data/tokens_rotate_none.json');
  const { server, port } = await startServer();
  try {
    const res = await fetch(`http://localhost:${port}/api/auth/rotate`, { method: 'POST' });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'no_user_session');
  } finally { server.close(); }
});

test('manual rotate succeeds and extends expiry', async () => {
  process.env.NODE_ENV = 'test';
  // Provide mock tokens; TEST_MODE path will extend expiry
  setTokenPath('data/tokens_rotate_active.json');
  const startExp = Date.now() + 2 * 60_000;
  writeTokens({ tokenType: 'user', account: { homeAccountId: 'x' }, expiresAt: startExp, scopes: ['User.Read','offline_access'], refreshToken: 'r' });
  process.env.AUTH_TEST_MODE = '1';
  const { server, port } = await startServer();
  try {
    const res = await fetch(`http://localhost:${port}/api/auth/rotate`, { method: 'POST' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.success);
    const updated = readTokens();
    assert.ok(updated.expiresAt > startExp, 'expiry extended');
  } finally { server.close(); }
});
