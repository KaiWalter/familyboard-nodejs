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

test('signin with forceConsent adds prompt=consent', async () => {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_CLIENT_ID = 'client';
  process.env.AUTH_CLIENT_SECRET = 'secret';
  process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
  process.env.AUTH_SCOPES = 'User.Read';
  const { server, port } = await startServer();
  try {
    const res = await fetch(`http://localhost:${port}/signin?format=json&forceConsent=1`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.authorizationUrl, /[?&]prompt=consent/);
  } finally {
    await stopServer(server);
  }
});
