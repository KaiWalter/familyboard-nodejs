import test from 'node:test';
import assert from 'node:assert';
import { startRefreshScheduler, stopRefreshScheduler } from '../../src/auth/refreshScheduler.js';
import * as msalToken from '../../src/auth/msalToken.js';

test.skip('refresh scheduler proactively extends expiry (MSAL cache)', async () => {
	process.env.AUTH_TEST_MODE = '1';
	let initialExpiry = Date.now() + 2 * 60_000;
	// Provide metadata override with mutable expiry reference
	msalToken.__setMetadataProviderForTests(async () => ({
		status: 'OK',
		expiresAt: initialExpiry,
		scopes: ['User.Read'],
		account: { homeAccountId: 'x' }
	}));
	startRefreshScheduler(['User.Read'], undefined, 200);
	await new Promise(r => setTimeout(r, 800));
	stopRefreshScheduler();
	const meta = await msalToken.getTokenMetadata(['User.Read']);
	assert.ok(meta.expiresAt > initialExpiry, 'expiry should be extended under test mode');
	msalToken.__clearTestOverrides();
});
