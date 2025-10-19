import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

// Verify photo panel is left and calendar panel right per layout specification.
(async () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'src/public/index.html'), 'utf8');
  const dom = new JSDOM(html, { pretendToBeVisual: true });
  const app = dom.window.document.getElementById('app');
  assert(app, 'app container exists');
  const children = Array.from(app.children).map(c => c.id);
  assert.equal(children[0], 'photo-panel', 'photo panel should be first (left)');
  assert.equal(children[1], 'calendar-panel', 'calendar panel should be second (right)');
})();
