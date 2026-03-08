import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

test.skip('styles enforce kiosk layout without scrollbars', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'src/public/css/styles.css'), 'utf8');
  assert(/body\s*{[^}]*overflow:\s*hidden/i.test(css), 'body should hide overflow to prevent scrollbars');
  assert(/#app\s*{[^}]*overflow:\s*hidden/i.test(css), '#app should hide overflow to prevent scrollbars');
});
