const test = require('node:test');
const assert = require('node:assert/strict');

const { stripWikiItemSuffix, getInventoryKey } = require('../src/scripts/inventory-matching.js');

test('stripWikiItemSuffix removes AQW wiki disambiguation tags without changing display case', () => {
  assert.equal(stripWikiItemSuffix("Hero's Blade (Sword) (AC)"), "Hero's Blade");
});

test('getInventoryKey matches saved inventory objects and wiki labels canonically', () => {
  const savedItem = {
    name: 'Hero\u2019s Blade',
    normalizedName: "hero's blade",
  };

  assert.equal(getInventoryKey(savedItem), getInventoryKey("  HERO'S  BLADE (Sword) "));
});
