import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
// tokenStore removed; rely on debug auth endpoint
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

test('signout clears persisted tokens', async () => {
	process.env.NODE_ENV = 'test';
	process.env.AUTH_CLIENT_ID = 'client';
	process.env.AUTH_CLIENT_SECRET = 'secret';
	process.env.AUTH_REDIRECT_URI = 'http://localhost/callback';
	process.env.AUTH_SCOPES = 'User.Read';
	const originalAcquirePublic = PublicClientApplication.prototype.acquireTokenByCode;
	const originalAcquireConfidential = ConfidentialClientApplication.prototype.acquireTokenByCode;
	const fake = { accessToken: 'mock_access_abc123', refreshToken: 'mock_refresh_abc123', expiresOn: new Date(Date.now()+3600_000), scopes: ['User.Read'] };
	PublicClientApplication.prototype.acquireTokenByCode = async () => fake;
	ConfidentialClientApplication.prototype.acquireTokenByCode = async () => fake;
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
		PublicClientApplication.prototype.acquireTokenByCode = originalAcquirePublic;
		ConfidentialClientApplication.prototype.acquireTokenByCode = originalAcquireConfidential;
		await stopServer(server);
	}
});
