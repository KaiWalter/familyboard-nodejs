import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/server/app.js';
import { readTokens, clearTokens } from '../../src/auth/tokenStore.js';

function startServer() {
	return new Promise(resolve => {
		const server = http.createServer(app);
		server.listen(0, () => {
			const { port } = server.address();
			resolve({ server, port });
		});
	});
}

test('callback rejects invalid state', async () => {
	process.env.NODE_ENV = 'test';
	process.env.AUTH_CLIENT_ID = 'client';
	process.env.AUTH_CLIENT_SECRET = 'secret';
	process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
	process.env.AUTH_SCOPES = 'User.Read';
	process.env.AUTH_TEST_MODE = '1';

	const { server, port } = await startServer();
	try {
		const res = await fetch(`http://localhost:${port}/callback?code=abc&state=bogus`);
		assert.equal(res.status, 400);
		const body = await res.json();
		assert.equal(body.error, 'invalid_state');
	} finally {
		server.close();
	}
});

test('callback accepts valid state and persists tokens', async () => {
	process.env.NODE_ENV = 'test';
	process.env.AUTH_CLIENT_ID = 'client';
	process.env.AUTH_CLIENT_SECRET = 'secret';
	process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
	process.env.AUTH_SCOPES = 'User.Read';
	process.env.AUTH_TEST_MODE = '1';

	clearTokens();
	const { server, port } = await startServer();
	try {
		const signinRes = await fetch(`http://localhost:${port}/signin`);
		const signinBody = await signinRes.json();
		const { state } = signinBody;
		const cbRes = await fetch(`http://localhost:${port}/callback?code=xyz&state=${state}`);
		assert.equal(cbRes.status, 200);
		const cbBody = await cbRes.json();
		assert.equal(cbBody.success, true);
		const tokens = readTokens();
		assert.ok(tokens, 'tokens file written');
		assert.match(tokens.accessToken, /mock_access_xyz/);
	} finally {
		server.close();
	}
});
