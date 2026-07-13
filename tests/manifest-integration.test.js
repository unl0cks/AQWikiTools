const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

for (const manifestName of ['manifest.json', 'manifest-firefox.json']) {
  test(`${manifestName} loads the ported account scripts in dependency order`, () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', manifestName), 'utf8'));
    const accountBlock = manifest.content_scripts.find(block =>
      block.matches.some(match => match.includes('account.aq.com'))
    );

    assert.ok(accountBlock);
    assert.deepEqual(accountBlock.js, [
      'src/scripts/inventory-matching.js',
      'src/scripts/content.js',
      'src/scripts/ProcessAcountItems.js',
      'src/scripts/main.js',
    ]);

    const resources = manifest.web_accessible_resources.flatMap(block => block.resources || []);
    assert.ok(resources.includes('data/Unidentified_Translation.json'));
  });
}
