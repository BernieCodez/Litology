export const EDITOR_ZOOM_LEVELS = [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200];

export function normalizeEditorZoom(value, fallback = 100) {
    const numericValue = Number(value);
    return EDITOR_ZOOM_LEVELS.includes(numericValue) ? numericValue : fallback;
}

export function stepEditorZoom(value, direction) {
    const current = normalizeEditorZoom(value);
    const currentIndex = EDITOR_ZOOM_LEVELS.indexOf(current);
    const nextIndex = Math.max(
        0,
        Math.min(EDITOR_ZOOM_LEVELS.length - 1, currentIndex + Math.sign(direction)),
    );
    return EDITOR_ZOOM_LEVELS[nextIndex];
}

export function editorZoomShortcutDirection(event) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return 0;

    if (["+", "=", "Add"].includes(event.key) || event.code === "NumpadAdd") return 1;
    if (["-", "_", "Subtract"].includes(event.key) || event.code === "NumpadSubtract") return -1;
    return 0;
}
