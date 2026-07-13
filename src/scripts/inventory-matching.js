/**
 * Shared inventory-name matching helpers.
 * Keeps display names untouched while producing a canonical key for comparisons.
 */

const AQWT_WIKI_SUFFIX_PATTERN = /\s*\((Class|Armor|Helm|Cape|Weapon|Pet|Misc|Necklace|Sword|Dagger|Axe|Mace|Polearm|Staff|Wand|Bow|Gun|0 AC|AC|Legend|Non-Legend|Merge|Rare|VIP|Monster)\)/gi;

function stripWikiItemSuffix(itemName) {
    return String(itemName || "").replace(AQWT_WIKI_SUFFIX_PATTERN, "").trim();
}

function canonicalizeInventoryText(itemName) {
    return String(itemName || "")
        .normalize("NFKC")
        .replace(/[\u2018\u2019\u02BC\u0060\u00B4]/g, "'")
        .replace(/[\u2013\u2014\u2212]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function getInventoryKey(itemOrName) {
    if (itemOrName && typeof itemOrName === "object") {
        if (itemOrName.normalizedName) {
            return canonicalizeInventoryText(stripWikiItemSuffix(itemOrName.normalizedName));
        }
        itemOrName = itemOrName.name;
    }
    return canonicalizeInventoryText(stripWikiItemSuffix(itemOrName));
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { stripWikiItemSuffix, canonicalizeInventoryText, getInventoryKey };
}
