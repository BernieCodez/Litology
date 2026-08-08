import { FONT_OPTIONS, isSafeFontFamily } from "./chapter-customization.mjs?v=20260807-2";

export const IMPORTED_FONT_STORAGE_KEY = "litology.googleFonts";

export function loadImportedFonts(storage = window.localStorage) {
    try {
        const fonts = JSON.parse(storage.getItem(IMPORTED_FONT_STORAGE_KEY) || "[]");
        return [...new Set(fonts.filter(isSafeFontFamily))].sort((a, b) => a.localeCompare(b));
    } catch {
        return [];
    }
}

export function saveImportedFonts(fonts, storage = window.localStorage) {
    const safeFonts = [...new Set(fonts.filter(isSafeFontFamily))].sort((a, b) => a.localeCompare(b));
    storage.setItem(IMPORTED_FONT_STORAGE_KEY, JSON.stringify(safeFonts));
    return safeFonts;
}

export function googleFontStylesheetUrl(family, previewText = "") {
    if (!isSafeFontFamily(family)) return "";
    const encodedFamily = encodeURIComponent(family).replaceAll("%20", "+");
    const textQuery = previewText ? `&text=${encodeURIComponent(previewText)}` : "";
    return `https://fonts.googleapis.com/css2?family=${encodedFamily}${textQuery}&display=swap`;
}

export function googleFontPreviewStylesheetUrl(families) {
    const safeFamilies = [...new Set(families.filter(isSafeFontFamily))];
    if (!safeFamilies.length) return "";
    const familyQuery = safeFamilies
        .map((family) => `family=${encodeURIComponent(family).replaceAll("%20", "+")}`)
        .join("&");
    const previewCharacters = [...new Set(safeFamilies.join(""))].join("");
    return `https://fonts.googleapis.com/css2?${familyQuery}&text=${encodeURIComponent(previewCharacters)}&display=swap`;
}

export function isBuiltInFont(family) {
    return FONT_OPTIONS.includes(family);
}

export function filterFontCatalog(fonts, query, limit = 80) {
    const normalizedQuery = String(query || "").trim().toLocaleLowerCase();
    return fonts
        .filter((font) => !normalizedQuery || font.family.toLocaleLowerCase().includes(normalizedQuery))
        .sort((left, right) => {
            if (normalizedQuery) {
                const leftStarts = left.family.toLocaleLowerCase().startsWith(normalizedQuery);
                const rightStarts = right.family.toLocaleLowerCase().startsWith(normalizedQuery);
                if (leftStarts !== rightStarts) return leftStarts ? -1 : 1;
            }
            return (left.popularity || 9999) - (right.popularity || 9999)
                || left.family.localeCompare(right.family);
        })
        .slice(0, limit);
}
