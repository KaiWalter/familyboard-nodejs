import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/server/app.js';
import { readTokens, clearTokens } from '../../src/auth/tokenStore.js';
import { ConfidentialClientApplication } from '@azure/msal-node';

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
	process.env.AUTH_SCOPES = 'User.Read'; // single scope; callback expects same
	// msal mandatory: monkey patch acquireTokenByCode for deterministic behavior
	const originalAcquireInvalid = ConfidentialClientApplication.prototype.acquireTokenByCode;
	ConfidentialClientApplication.prototype.acquireTokenByCode = async () => ({ accessToken: 'ignored', refreshToken: null, expiresOn: new Date(Date.now()+3600_000), scopes: ['User.Read'] });

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

test('callback accepts valid state, persists tokens, and redirects to root', async () => {
	process.env.NODE_ENV = 'test';
	process.env.AUTH_CLIENT_ID = 'client';
	process.env.AUTH_CLIENT_SECRET = 'secret';
	process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
	process.env.AUTH_SCOPES = 'User.Read'; // keep single scope to align with mocked acquireTokenByCode scopes
	const originalAcquireValid = ConfidentialClientApplication.prototype.acquireTokenByCode;
	ConfidentialClientApplication.prototype.acquireTokenByCode = async () => ({ accessToken: 'mock_access_xyz', refreshToken: 'mock_refresh_xyz', expiresOn: new Date(Date.now()+3600_000), scopes: ['User.Read'] });

	clearTokens();
	const { server, port } = await startServer();
	try {
		const signinRes = await fetch(`http://localhost:${port}/signin`);
		const signinBody = await signinRes.json();
		const { state } = signinBody;
		const cbRes = await fetch(`http://localhost:${port}/callback?code=xyz&state=${state}`, { redirect: 'manual' });
		// Expect redirect
		assert.equal(cbRes.status, 302);
		const loc = cbRes.headers.get('location');
		assert.equal(loc, '/', 'should redirect to root');
		const tokens = readTokens();
		assert.ok(tokens, 'tokens file written');
		assert.match(tokens.accessToken, /mock_access_xyz/);
	} finally {
		ConfidentialClientApplication.prototype.acquireTokenByCode = originalAcquireValid;
		server.close();
	}
});
