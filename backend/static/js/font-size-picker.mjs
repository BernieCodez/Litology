export const FONT_SIZE_PRESETS = Object.freeze([
    6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96,
]);

export const MIN_FONT_SIZE = 1;
export const MAX_FONT_SIZE = 400;

export function parseFontSize(value) {
    const match = String(value ?? "").trim().match(/^(\d+(?:\.\d+)?)\s*(?:px)?$/i);
    if (!match) return null;
    const size = Number(match[1]);
    return Number.isFinite(size) ? size : null;
}

export function normalizeFontSize(value, fallback = 12) {
    const parsed = parseFontSize(value);
    const fallbackSize = parseFontSize(fallback) ?? 12;
    const size = parsed ?? fallbackSize;
    return Math.round(Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, size)) * 10) / 10;
}

export function formatFontSize(value) {
    return String(normalizeFontSize(value));
}

export function stepFontSize(value, direction, fallback = 12) {
    const current = normalizeFontSize(value, fallback);
    return normalizeFontSize(current + (direction < 0 ? -1 : 1), current);
}
