import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    EDITOR_ZOOM_LEVELS,
    editorZoomShortcutDirection,
    normalizeEditorZoom,
    stepEditorZoom,
} from "../static/js/editor-zoom.mjs";

test("editor zoom normalizes and steps through supported levels", () => {
    assert.equal(normalizeEditorZoom("125"), 125);
    assert.equal(normalizeEditorZoom("123"), 100);
    assert.equal(stepEditorZoom(100, 1), 110);
    assert.equal(stepEditorZoom(100, -1), 90);
    assert.equal(stepEditorZoom(EDITOR_ZOOM_LEVELS[0], -1), EDITOR_ZOOM_LEVELS[0]);
    assert.equal(stepEditorZoom(EDITOR_ZOOM_LEVELS.at(-1), 1), EDITOR_ZOOM_LEVELS.at(-1));
});

test("Ctrl or Command plus and minus map to zoom directions", () => {
    assert.equal(editorZoomShortcutDirection({ ctrlKey: true, key: "+" }), 1);
    assert.equal(editorZoomShortcutDirection({ ctrlKey: true, shiftKey: true, key: "=" }), 1);
    assert.equal(editorZoomShortcutDirection({ metaKey: true, key: "-" }), -1);
    assert.equal(editorZoomShortcutDirection({ ctrlKey: true, code: "NumpadSubtract" }), -1);
    assert.equal(editorZoomShortcutDirection({ ctrlKey: false, metaKey: false, key: "+" }), 0);
    assert.equal(editorZoomShortcutDirection({ ctrlKey: true, altKey: true, key: "+" }), 0);
});

test("the editor exposes status-bar zoom controls", async () => {
    const template = await readFile(new URL("../templates/pages/editor.html", import.meta.url), "utf8");
    const source = await readFile(new URL("../static/js/editor.js", import.meta.url), "utf8");

    assert.match(template, /data-zoom-out[\s\S]*data-zoom-trigger[\s\S]*data-zoom-in/);
    assert.match(source, /editorZoomShortcutDirection\(event\)/);
    assert.match(source, /--book-zoom/);
});
