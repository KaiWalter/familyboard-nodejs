import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/server/app.js';
import { _resetCounters } from '../../src/services/cache.js';

// Helper to start ephemeral server
function startServer() {
	return new Promise(resolve => {
		const server = http.createServer(app);
		server.listen(0, () => {
			const { port } = server.address();
			resolve({ server, port });
		});
	});
}

test.skip('GET /signin returns authorizationUrl and state - deprecated interactive flow', async () => {
	process.env.NODE_ENV = 'test';
	// Provide minimal auth env so validation passes
	process.env.AUTH_CLIENT_ID = 'client';
	process.env.AUTH_CLIENT_SECRET = 'secret';
	process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
	process.env.AUTH_SCOPES = 'User.Read';
	process.env.AUTH_TEST_MODE = '1';

	const { server, port } = await startServer();
	try {
		const res = await fetch(`http://localhost:${port}/signin`);
		assert.equal(res.status, 200);
		const body = await res.json();
		assert.ok(body.authorizationUrl, 'authorizationUrl present');
		assert.ok(body.state, 'state present');
		assert.match(body.authorizationUrl, /state=/, 'url contains state');
	} finally {
		server.close();
	}
});

test.skip('Rate limiting triggers 429 after configured limit - deprecated interactive flow', async () => {
	process.env.NODE_ENV = 'test';
	process.env.AUTH_CLIENT_ID = 'client';
	process.env.AUTH_CLIENT_SECRET = 'secret';
	process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
	process.env.AUTH_SCOPES = 'User.Read';
	process.env.AUTH_TEST_MODE = '1';
	process.env.AUTH_RATE_LIMIT = '2';

	const { server, port } = await startServer();
	try {
		_resetCounters();
		const first = await fetch(`http://localhost:${port}/signin`);
		assert.equal(first.status, 200);
		const second = await fetch(`http://localhost:${port}/signin`);
		assert.equal(second.status, 200);
		const third = await fetch(`http://localhost:${port}/signin`);
		assert.equal(third.status, 429, 'third call should be rate limited');
	} finally {
		server.close();
	}
});
