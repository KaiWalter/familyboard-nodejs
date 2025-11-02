import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/server/app.js';

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer(app);
    server.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

async function stopServer(server) {
  if (!server) return;
  await new Promise(resolve => {
    server.close(() => resolve());
  });
}

// Verify no implicit offline_access scope is added when it is not configured.

test('signin authorizationUrl reflects configured scopes only (no implicit offline_access)', async () => {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_CLIENT_ID = 'client';
  process.env.AUTH_CLIENT_SECRET = 'secret';
  process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
  process.env.AUTH_SCOPES = 'User.Read'; // omit offline_access deliberately
  const { server, port } = await startServer();
  try {
    const res = await fetch(`http://localhost:${port}/signin?format=json`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(/scope=User.Read(?!.*offline_access)/.test(body.authorizationUrl), 'authorizationUrl should not add offline_access implicitly');
  } finally {
    await stopServer(server);
  }
});
