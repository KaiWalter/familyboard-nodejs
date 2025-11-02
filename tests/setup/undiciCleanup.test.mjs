import { after } from 'node:test';
import { getGlobalDispatcher } from 'undici';

after(async () => {
  const dispatcher = getGlobalDispatcher();
  if (dispatcher && typeof dispatcher.close === 'function') {
    try {
      await dispatcher.close({ closeActive: true });
    } catch (err) {
      // swallow shutdown errors from already-closed dispatcher
    }
  }
  if (dispatcher && typeof dispatcher.destroy === 'function') {
    try {
      dispatcher.destroy();
    } catch (err) {
      // ignore destroy errors as well
    }
  }
});
