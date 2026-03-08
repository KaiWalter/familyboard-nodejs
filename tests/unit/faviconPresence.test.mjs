import test from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

test.skip('index.html includes favicon link element', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'src/public/index.html'), 'utf8');
  const dom = new JSDOM(html);
  const link = dom.window.document.querySelector('link[rel="icon"]');
  assert(link, 'favicon link should exist');
  assert(link.getAttribute('href'), 'favicon href should be set');
});
