import test from 'node:test';

const skip = { skip: 'External MSAL flows verified via manual smoke tests per 2025-11-02 policy (MSAL client instantiation keeps event loop alive).' };

test.skip('signin authorizationUrl reflects configured scopes only (manual coverage)', skip, () => {});
