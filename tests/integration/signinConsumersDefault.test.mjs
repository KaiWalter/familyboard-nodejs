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

// Ensure that when no AUTH_TENANT env is set, default authority uses /consumers/

test.skip('default tenant consumers reflected in authorization URL - deprecated', async () => {
  process.env.NODE_ENV = 'test';
  delete process.env.AUTH_TENANT;
  process.env.AUTH_CLIENT_ID = 'client';
  process.env.AUTH_CLIENT_SECRET = 'secret';
  process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
  process.env.AUTH_SCOPES = 'User.Read';
  const { server, port } = await startServer();
  try {
    const res = await fetch(`http://localhost:${port}/signin?format=json`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.match(body.authorizationUrl, /login.microsoftonline.com\/consumers\/oauth2\/v2.0\/authorize/);
  } finally { server.close(); }
});
