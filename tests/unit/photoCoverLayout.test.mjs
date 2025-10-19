import assert from 'assert';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

// Basic test: image element should have object-fit: cover via computed CSS class rules

const css = fs.readFileSync(path.resolve('src/public/css/styles.css'),'utf8');

const html = `<!DOCTYPE html><html><head><style>${css}</style></head><body><div id="photo-panel" style="width:800px;height:600px;"></div><script></script></body></html>`;
const dom = new JSDOM(html, { pretendToBeVisual: true });
const { window } = dom;

// Simulate adding an image as photoRotator would (landscape)
const img = window.document.createElement('img');
img.className = 'photo photo-landscape';
window.document.getElementById('photo-panel').appendChild(img);

// JSDOM can't fully compute layout, but we can check style attributes resolved from stylesheet by scanning css
assert(css.includes('object-fit: cover'), 'CSS should include object-fit: cover');
assert(css.includes('.photo-landscape') && css.includes('.photo-portrait'), 'Orientation classes should exist');

console.log('photoCoverLayout test passed');
