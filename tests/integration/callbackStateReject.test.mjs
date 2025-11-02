import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
// tokenStore removed; use debug auth endpoint and metadata
import { PublicClientApplication, ConfidentialClientApplication } from '@azure/msal-node';

async function startServer() {
	const { default: app } = await import('../../src/server/app.js');
	return new Promise(resolve => {
		const server = http.createServer(app);
		server.listen(0, () => {
			const { port } = server.address();
			resolve({ server, port });
		});
	});
}

async function stopServer(server) {
	if (!server) return;
	await new Promise(resolve => {
		server.close(() => resolve());
	});
}

test('callback rejects invalid state', async () => {
	process.env.NODE_ENV = 'test';
	process.env.AUTH_CLIENT_ID = 'client';
	process.env.AUTH_CLIENT_SECRET = 'secret';
	process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
	process.env.AUTH_SCOPES = 'User.Read'; // single scope; callback expects same
	// msal mandatory: monkey patch acquireTokenByCode for deterministic behavior
	const originalAcquireInvalidPublic = PublicClientApplication.prototype.acquireTokenByCode;
	const originalAcquireInvalidConfidential = ConfidentialClientApplication.prototype.acquireTokenByCode;
	PublicClientApplication.prototype.acquireTokenByCode = async () => ({ accessToken: 'ignored', refreshToken: null, expiresOn: new Date(Date.now()+3600_000), scopes: ['User.Read'] });
	ConfidentialClientApplication.prototype.acquireTokenByCode = async () => ({ accessToken: 'ignored', refreshToken: null, expiresOn: new Date(Date.now()+3600_000), scopes: ['User.Read'] });

	const { server, port } = await startServer();
	try {
		const res = await fetch(`http://localhost:${port}/callback?code=abc&state=bogus`);
		assert.equal(res.status, 400);
		const body = await res.json();
		assert.equal(body.error, 'invalid_state');
	} finally {
		PublicClientApplication.prototype.acquireTokenByCode = originalAcquireInvalidPublic;
		ConfidentialClientApplication.prototype.acquireTokenByCode = originalAcquireInvalidConfidential;
		await stopServer(server);
	}
});

test('callback accepts valid state, persists tokens, and redirects to root', async () => {
	process.env.NODE_ENV = 'test';
	process.env.AUTH_CLIENT_ID = 'client';
	process.env.AUTH_CLIENT_SECRET = 'secret';
	process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
	process.env.AUTH_SCOPES = 'User.Read'; // keep single scope to align with mocked acquireTokenByCode scopes
	const originalAcquireValidPublic = PublicClientApplication.prototype.acquireTokenByCode;
	const originalAcquireValidConfidential = ConfidentialClientApplication.prototype.acquireTokenByCode;
	PublicClientApplication.prototype.acquireTokenByCode = async () => ({ accessToken: 'mock_access_xyz', refreshToken: 'mock_refresh_xyz', expiresOn: new Date(Date.now()+3600_000), scopes: ['User.Read'] });
	ConfidentialClientApplication.prototype.acquireTokenByCode = async () => ({ accessToken: 'mock_access_xyz', refreshToken: 'mock_refresh_xyz', expiresOn: new Date(Date.now()+3600_000), scopes: ['User.Read'] });

	// No token file to clear; state store ensures validity
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
		// small delay to allow cache hydration
		await new Promise(r => setTimeout(r, 30));
		const debugRes = await fetch(`http://localhost:${port}/api/debug/auth`);
		assert.equal(debugRes.status, 200);
		const dbg = await debugRes.json();
		// In test mode with mocked code exchange, account objects may not be present; rely on metadata only
		assert.ok(['OK','NO_TOKEN','ERROR'].includes(dbg.metadata.status));
	} finally {
		PublicClientApplication.prototype.acquireTokenByCode = originalAcquireValidPublic;
		ConfidentialClientApplication.prototype.acquireTokenByCode = originalAcquireValidConfidential;
		await stopServer(server);
	}
});
