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

test('GET /signin from browser UA redirects (302)', async () => {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_CLIENT_ID = 'client';
  process.env.AUTH_CLIENT_SECRET = 'secret';
  process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
  process.env.AUTH_SCOPES = 'User.Read';
  process.env.AUTH_TEST_MODE = '1';

  const { server, port } = await startServer();
  try {
    const res = await fetch(`http://localhost:${port}/signin`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/118 Safari/537.36' }
    });
    assert.equal(res.status, 302);
    const loc = res.headers.get('location');
    assert.ok(loc, 'Location header present');
    assert.match(loc, /state=/);
  } finally {
    server.close();
  }
});

test('GET /signin with ?format=json returns JSON even for browser UA', async () => {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_CLIENT_ID = 'client';
  process.env.AUTH_CLIENT_SECRET = 'secret';
  process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
  process.env.AUTH_SCOPES = 'User.Read';
  process.env.AUTH_TEST_MODE = '1';

  const { server, port } = await startServer();
  try {
    const res = await fetch(`http://localhost:${port}/signin?format=json`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/118.0' }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.authorizationUrl);
    assert.ok(body.state);
  } finally {
    server.close();
  }
});
