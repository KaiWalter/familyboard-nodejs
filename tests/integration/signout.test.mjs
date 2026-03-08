import test from 'node:test';

const skip = { skip: 'External MSAL flows verified via manual smoke tests per 2025-11-02 policy.' };

test.skip('signout clears persisted tokens (manual coverage)', skip, () => {});
