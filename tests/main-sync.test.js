const test = require('node:test');
const assert = require('node:assert/strict');

const { synchronizeInventory } = require('../src/scripts/main.js');

test('synchronizeInventory stores the AQWikiTools inventory contract and sync metadata', async () => {
  const writes = [];
  const storage = {
    set(value, callback) {
      writes.push(value);
      if (callback) callback();
    },
  };

  const rawRows = [{ Name: 'Sword' }];
  const formattedRows = [{ name: 'Sword', normalizedName: 'sword', quantity: 1, location: 'Inv' }];

  const result = await synchronizeInventory({
    fetchInventoryDataImpl: async () => rawRows,
    formatInventoryItemsImpl: rows => {
      assert.equal(rows, rawRows);
      return formattedRows;
    },
    storage,
    now: () => 999,
  });

  assert.equal(result, formattedRows);
  assert.deepEqual(writes, [{
    savedInventory: formattedRows,
    inventorySyncMeta: {
      itemCount: 1,
      syncedAt: 999,
      source: 'account-api-v2',
    },
  }]);
});
