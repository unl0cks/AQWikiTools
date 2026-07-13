const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const contentScript = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'scripts', 'content.js'),
  'utf8'
);

test('hover preview parses fetched wiki HTML as an inert template fragment', () => {
  assert.match(contentScript, /document\.createElement\(["']template["']\)/);
  assert.match(contentScript, /template\.innerHTML\s*=\s*response\.html/);
  assert.match(contentScript, /const doc\s*=\s*template\.content/);
  assert.doesNotMatch(contentScript, /new\s+DOMParser\s*\(/);
});
