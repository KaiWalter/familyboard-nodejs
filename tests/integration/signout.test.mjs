import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/server/app.js';
import { readTokens } from '../../src/auth/tokenStore.js';

function startServer() {
	return new Promise(resolve => {
		const server = http.createServer(app);
		server.listen(0, () => {
			const { port } = server.address();
			resolve({ server, port });
		});
	});
}

test('signout clears persisted tokens', async () => {
	process.env.NODE_ENV = 'test';
	process.env.AUTH_CLIENT_ID = 'client';
	process.env.AUTH_CLIENT_SECRET = 'secret';
	process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
	process.env.AUTH_SCOPES = 'User.Read';
	process.env.AUTH_TEST_MODE = '1';

	const { server, port } = await startServer();
	try {
		// First complete a mock signin flow
		const signinRes = await fetch(`http://localhost:${port}/signin`);
		const { state } = await signinRes.json();
		const cbRes = await fetch(`http://localhost:${port}/callback?code=abc123&state=${state}`);
		assert.equal(cbRes.status, 200);
		assert.ok(readTokens(), 'tokens should exist after callback');
		const soRes = await fetch(`http://localhost:${port}/signout`, { method: 'POST' });
		assert.equal(soRes.status, 204);
		await new Promise(r => setTimeout(r, 25));
		assert.equal(readTokens(), null, 'tokens should be cleared after signout');
	} finally {
		server.close();
	}
});
