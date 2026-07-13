/**
 * @file AQWikiTools account-page inventory synchronization.
 * @description Integrates the updated AqwDoIHave inventory API helpers while
 *   preserving AQWikiTools' savedInventory storage contract.
 */

function setLocalStorage(storage, value) {
    return new Promise((resolve, reject) => {
        storage.set(value, () => {
            const runtimeError = typeof chrome !== "undefined" ? chrome.runtime?.lastError : null;
            if (runtimeError) reject(new Error(runtimeError.message));
            else resolve();
        });
    });
}

async function synchronizeInventory({
    fetchInventoryDataImpl = fetchInventoryData,
    formatInventoryItemsImpl = formatInventoryItems,
    storage = chrome.storage.local,
    now = Date.now,
} = {}) {
    const rawItems = await fetchInventoryDataImpl();
    const savedInventory = formatInventoryItemsImpl(rawItems);

    await setLocalStorage(storage, {
        savedInventory,
        inventorySyncMeta: {
            itemCount: savedInventory.length,
            syncedAt: now(),
            source: "account-api-v2",
        },
    });

    console.log(`AQWikiTools: synchronized ${savedInventory.length} inventory items.`);
    return savedInventory;
}

async function startInventorySync() {
    try {
        if (typeof accountDataReady !== "undefined") await accountDataReady;
        await synchronizeInventory();
    } catch (error) {
        console.error("AQWikiTools: inventory synchronization failed", error);
    }
}

if (typeof window !== "undefined") {
    const isInventoryPage = window.location.hostname === "account.aq.com"
        && window.location.pathname.replace(/\/$/, "").toLowerCase() === "/aqw/inventory";

    if (isInventoryPage) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", startInventorySync, { once: true });
        } else {
            startInventorySync();
        }
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { synchronizeInventory, startInventorySync };
}
