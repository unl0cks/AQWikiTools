/**
 * @file Account inventory API helpers ported from the updated AqwDoIHave.
 * @description Loads unidentified-item translations, fetches every inventory
 *   page from account.aq.com, and converts API rows into AQWikiTools' storage
 *   format without losing the newer metadata.
 */

let unidentifiedTranslationMap = new Map();

function normalizeInventoryKey(itemName) {
    return String(itemName || "")
        .normalize("NFKC")
        .replace(/[\u2018\u2019\u02BC\u0060\u00B4]/g, "'")
        .replace(/[\u2013\u2014\u2212]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function setUnidentifiedTranslations(data) {
    const names = Array.isArray(data?.Names) ? data.Names : [];
    const translations = Array.isArray(data?.Translation) ? data.Translation : [];
    unidentifiedTranslationMap = new Map();

    for (let i = 0; i < Math.min(names.length, translations.length); i++) {
        unidentifiedTranslationMap.set(normalizeInventoryKey(names[i]), translations[i]);
    }
}

function translateUnidentified(itemName) {
    if (!itemName) return itemName;
    const key = normalizeInventoryKey(itemName);
    if (!key.includes("unidentified")) return itemName;
    return unidentifiedTranslationMap.get(key) || itemName;
}

const accountDataReady = (async function loadUnidentifiedTranslations() {
    if (typeof chrome === "undefined" || !chrome.runtime?.getURL || typeof fetch === "undefined") {
        return;
    }

    try {
        const response = await fetch(chrome.runtime.getURL("data/Unidentified_Translation.json"));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setUnidentifiedTranslations(await response.json());
    } catch (error) {
        console.error("AQWikiTools: failed to load unidentified-item translations", error);
    }
})();

function getApiValue(item, apiName, legacyName, fallback) {
    if (item && item[apiName] !== undefined && item[apiName] !== null) return item[apiName];
    if (item && item[legacyName] !== undefined && item[legacyName] !== null) return item[legacyName];
    return fallback;
}

function formatInventoryItems(itemsArray) {
    if (!Array.isArray(itemsArray)) return [];

    const formattedItems = [];

    for (const item of itemsArray) {
        let rawName = String(getApiValue(item, "Name", "ItemName", "") || "").trim();
        if (!rawName) continue;

        const itemType = String(getApiValue(item, "Type", "Type", "") || "");
        let quantity = Number(getApiValue(item, "Count", "Quantity", 1)) || 1;

        const isStackable = ["Item", "Resource", "Quest Item", "Wall Item", "Floor Item"].includes(itemType);
        const stackMatch = rawName.match(/^(.*?)\s+x\s*(\d+)$/i);
        if (isStackable && stackMatch) {
            rawName = stackMatch[1].trim();
            if (quantity === 1) quantity = Number(stackMatch[2]) || 1;
        }

        const translatedName = translateUnidentified(rawName);
        const bankValue = getApiValue(item, "Bank", "Location", 0);
        const acValue = getApiValue(item, "AC", "Currency", 0);
        const memberValue = getApiValue(item, "Member", "Category", 0);

        const location = bankValue === 1 || bankValue === true || String(bankValue).toLowerCase().includes("bank")
            ? "Bank"
            : "Inv";
        const currency = acValue === 1 || acValue === true || String(acValue).toUpperCase() === "AC"
            ? "AC"
            : "Gold";
        const category = memberValue === 1 || memberValue === true || String(memberValue).toLowerCase() === "member"
            ? "Member"
            : "Free";

        formattedItems.push({
            name: translatedName,
            normalizedName: normalizeInventoryKey(translatedName),
            quantity,
            location,
            rawName: getApiValue(item, "Name", "ItemName", rawName),
            type: itemType,
            currency,
            category,
        });
    }

    return formattedItems;
}

async function fetchInventoryData(fetchImpl = fetch, now = Date.now) {
    const take = 300;
    const requestOptions = {
        headers: {
            accept: "application/json, text/javascript, */*; q=0.01",
            "x-requested-with": "XMLHttpRequest",
        },
        credentials: "include",
    };

    const makeUrl = (skip, stamp) =>
        `https://account.aq.com/myapi/inventory/InventoryData?skip=${skip}&take=${take}` +
        `&requireTotalCount=true&sort=[{"selector":"Added","desc":true}]&_=${stamp}`;

    const firstResponse = await fetchImpl(makeUrl(0, now()), requestOptions);
    if (!firstResponse.ok) throw new Error(`Inventory API request failed: HTTP ${firstResponse.status}`);

    const firstPage = await firstResponse.json();
    const firstRows = Array.isArray(firstPage?.data) ? firstPage.data : [];
    const totalCount = Number(firstPage?.totalCount ?? firstRows.length) || firstRows.length;
    const allItems = [...firstRows];

    const remainingSkips = [];
    for (let skip = take; skip < totalCount; skip += take) remainingSkips.push(skip);

    const remainingPages = await Promise.all(remainingSkips.map(async (skip, index) => {
        const response = await fetchImpl(makeUrl(skip, now() + index + 1), requestOptions);
        if (!response.ok) throw new Error(`Inventory API request failed at skip ${skip}: HTTP ${response.status}`);
        return response.json();
    }));

    for (const page of remainingPages) {
        if (Array.isArray(page?.data)) allItems.push(...page.data);
    }

    return allItems;
}

/**
 * Compatibility output matching the updated AqwDoIHave helper.
 * AQWikiTools itself stores the richer object array from formatInventoryItems().
 */
function ProcessAccountItems(itemsArray) {
    const formatted = formatInventoryItems(itemsArray);
    const Items = [];
    const Where = [];
    const Type = [];
    const Buy = [];
    const Category = [];

    for (const item of formatted) {
        Items.push(item.normalizedName);
        const stackable = ["Item", "Resource", "Quest Item", "Wall Item", "Floor Item"].includes(item.type);
        Type.push(stackable ? [item.type, item.quantity] : item.type);
        Where.push(item.location);
        Buy.push(item.currency);
        Category.push(item.category);
    }

    return [Items, Where, Type, Buy, Category];
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        normalizeInventoryKey,
        setUnidentifiedTranslations,
        translateUnidentified,
        accountDataReady,
        fetchInventoryData,
        formatInventoryItems,
        ProcessAccountItems,
    };
}
