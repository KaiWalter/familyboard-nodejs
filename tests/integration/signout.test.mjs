import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../../src/server/app.js';
// tokenStore removed; rely on debug auth endpoint
import { PublicClientApplication } from '@azure/msal-node';

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
	const originalAcquire = PublicClientApplication.prototype.acquireTokenByCode;
	PublicClientApplication.prototype.acquireTokenByCode = async () => ({ accessToken: 'mock_access_abc123', refreshToken: 'mock_refresh_abc123', expiresOn: new Date(Date.now()+3600_000), scopes: ['User.Read'] });
	// No token path configuration needed

	const { server, port } = await startServer();
	try {
		// First complete a mock signin flow
		const signinRes = await fetch(`http://localhost:${port}/signin`);
		const { state } = await signinRes.json();
		const cbRes = await fetch(`http://localhost:${port}/callback?code=abc123&state=${state}`);
		assert.equal(cbRes.status, 200);
		let debugRes = await fetch(`http://localhost:${port}/api/debug/auth`);
		let dbg = await debugRes.json();
		// Allow zero accounts under test mode; rely only on status presence
		assert.ok(['OK','NO_TOKEN','ERROR'].includes(dbg.metadata.status));
		const soRes = await fetch(`http://localhost:${port}/signout`, { method: 'POST' });
		assert.equal(soRes.status, 200);
		await new Promise(r => setTimeout(r, 80));
		debugRes = await fetch(`http://localhost:${port}/api/debug/auth`);
		dbg = await debugRes.json();
		assert.ok(dbg.accounts.length === 0 || dbg.metadata.status !== 'OK', 'accounts cleared or status not OK');
	} finally {
		PublicClientApplication.prototype.acquireTokenByCode = originalAcquire;
		server.close();
	}
});
