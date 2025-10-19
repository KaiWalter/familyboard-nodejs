import assert from 'node:assert';
import { fetchPhotoItems, fetchCalendarView, getGraphClient } from '../../src/services/graphClient.js';
import { audit } from '../../src/util/log.js';

// Basic smoke tests for pagination & retry logic by monkey-patching client.api().get()
// NOTE: These tests are simplified and do not hit real Graph; they simulate nextLink chaining.

function patchClientSequence(sequence) {
  const client = getGraphClient();
  let call = 0;
  const origApi = client.api.bind(client);
  client.api = (path) => {
    const builder = origApi(path);
    const origGet = builder.get.bind(builder);
    builder.get = async () => {
      if (call >= sequence.length) return { value: [] };
      const step = sequence[call++];
      if (step.error) {
        const err = new Error(step.error.message);
        err.statusCode = step.error.code;
        throw err;
      }
      return step;
    };
    return builder;
  };
  return () => { client.api = origApi; };
}

async function testPhotoPagination() {
  const restore = patchClientSequence([
    { value: [{ id: '1', name: 'a.jpg', '@microsoft.graph.downloadUrl': 'http://x/a', photo: { width: 800, height: 600 } }], '@odata.nextLink': 'next1' },
    { value: [{ id: '2', name: 'b.jpg', '@microsoft.graph.downloadUrl': 'http://x/b', photo: { width: 600, height: 800 } }] }
  ]);
  const items = await fetchPhotoItems('Folder');
  assert.equal(items.length, 2, 'should aggregate pages');
  restore();
}

async function testCalendarRetry() {
  const restore = patchClientSequence([
    { error: { code: 429, message: 'TooManyRequests' } },
    { value: [{ id: 'e1', subject: 'Event', start: { dateTime: '2025-10-19T10:00:00' }, end: { dateTime: '2025-10-19T11:00:00' }, isAllDay: false }] }
  ]);
  const events = await fetchCalendarView('cal1', '2025-10-19T00:00:00Z', '2025-10-20T00:00:00Z');
  assert.equal(events.length, 1, 'should succeed after retry');
  restore();
}

(async () => {
  await testPhotoPagination();
  await testCalendarRetry();
})();
