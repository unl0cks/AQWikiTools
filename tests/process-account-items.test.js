const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeInventoryKey,
  setUnidentifiedTranslations,
  translateUnidentified,
  formatInventoryItems,
  fetchInventoryData,
} = require('../src/scripts/ProcessAcountItems.js');

test('normalizeInventoryKey canonicalizes punctuation, whitespace, unicode, and case', () => {
  assert.equal(
    normalizeInventoryKey('  Hero\u2019s   Blade\u2014Prime  '),
    "hero's blade-prime"
  );
});

test('translateUnidentified matches names case-insensitively', () => {
  setUnidentifiedTranslations({
    Names: ['unidentified 1'],
    Translation: ['trig buster'],
  });

  assert.equal(translateUnidentified('Unidentified 1'), 'trig buster');
  assert.equal(translateUnidentified('Regular Sword'), 'Regular Sword');
});

test('formatInventoryItems preserves display data and adds canonical matching metadata', () => {
  setUnidentifiedTranslations({
    Names: ['unidentified 1'],
    Translation: ['trig buster'],
  });

  const result = formatInventoryItems([
    {
      Name: 'Unidentified 1',
      Count: 7,
      Type: 'Item',
      Bank: 1,
      AC: 1,
      Member: 0,
    },
    {
      Name: 'Hero\u2019s Blade',
      Count: 1,
      Type: 'Sword',
      Bank: 0,
      AC: 0,
      Member: 1,
    },
  ]);

  assert.deepEqual(result, [
    {
      name: 'trig buster',
      normalizedName: 'trig buster',
      quantity: 7,
      location: 'Bank',
      rawName: 'Unidentified 1',
      type: 'Item',
      currency: 'AC',
      category: 'Free',
    },
    {
      name: 'Hero\u2019s Blade',
      normalizedName: "hero's blade",
      quantity: 1,
      location: 'Inv',
      rawName: 'Hero\u2019s Blade',
      type: 'Sword',
      currency: 'Gold',
      category: 'Member',
    },
  ]);
});

test('fetchInventoryData retrieves every API page and returns raw API rows', async () => {
  const calls = [];
  const pages = new Map([
    [0, { totalCount: 650, data: Array.from({ length: 300 }, (_, i) => ({ Name: `Item ${i}` })) }],
    [300, { totalCount: 650, data: Array.from({ length: 300 }, (_, i) => ({ Name: `Item ${300 + i}` })) }],
    [600, { totalCount: 650, data: Array.from({ length: 50 }, (_, i) => ({ Name: `Item ${600 + i}` })) }],
  ]);

  const fakeFetch = async (url, options) => {
    calls.push({ url, options });
    const skip = Number(new URL(url).searchParams.get('skip'));
    return {
      ok: true,
      async json() { return pages.get(skip); },
    };
  };

  const rows = await fetchInventoryData(fakeFetch, () => 123456);

  assert.equal(rows.length, 650);
  assert.deepEqual(calls.map(call => Number(new URL(call.url).searchParams.get('skip'))), [0, 300, 600]);
  assert.ok(calls.every(call => call.options.credentials === 'include'));
});
