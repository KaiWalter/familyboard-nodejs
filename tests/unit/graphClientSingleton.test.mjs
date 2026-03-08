import test from 'node:test';
import assert from 'node:assert';
import { mock } from 'node:test';

const captured = {
  authProvider: null,
  initCalls: 0
};

mock.module('@microsoft/microsoft-graph-client', () => ({
  Client: {
    init(options) {
      captured.initCalls += 1;
      captured.authProvider = options.authProvider;
      return {
        api() {
          return {
            get: async () => ({ value: [] })
          };
        }
      };
    }
  }
}));

test.skip('graph client initializes once and injects msal token', async (t) => {
  const graph = await import('../../src/services/graphClient.js');
  const msalToken = await import('../../src/auth/msalToken.js');
  graph.__test.__resetClient();

  let tokenCalls = 0;
  const restoreToken = mock.method(msalToken, 'getAccessToken', async () => {
    tokenCalls += 1;
    return `fake-token-${tokenCalls}`;
  });

  t.after(() => {
    restoreToken.mock.restore();
    graph.__test.__resetClient();
    mock.restoreAll();
  });

  const clientA = graph.getGraphClient();
  const clientB = graph.getGraphClient();
  assert.strictEqual(clientA, clientB, 'should reuse singleton client instance');
  assert.strictEqual(graph.getInitCount(), 1, 'should initialize client only once');

  const token = await new Promise((resolve, reject) => {
    captured.authProvider((err, value) => {
      if (err) reject(err);
      else resolve(value);
    });
  });
  assert.strictEqual(token, 'fake-token-1', 'auth provider should supply token from msal');
  assert.strictEqual(tokenCalls, 1, 'token acquisition invoked exactly once');
});
