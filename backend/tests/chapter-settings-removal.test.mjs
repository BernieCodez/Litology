import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const editorTemplate = await readFile(
    new URL("../templates/pages/editor.html", import.meta.url),
    "utf8",
);
const editorScript = await readFile(
    new URL("../static/js/editor.js", import.meta.url),
    "utf8",
);

test("the edit chapter template button opens a freeform Tiptap template editor", () => {
    assert.match(editorTemplate, /class="header-settings-button"/);
    assert.match(editorTemplate, />Edit chapter template<\/span>/);
    assert.match(editorTemplate, /data-open-chapter-customizer/);
    assert.match(editorTemplate, /data-chapter-customizer/);
    assert.match(editorTemplate, /data-apply-chapter-template/);
    assert.match(editorTemplate, /data-chapter-template-editor/);
    assert.match(editorTemplate, /data-template-toolbar-actions/);
    assert.match(editorTemplate, /class="document-scroll chapter-template-page"/);
    assert.match(editorTemplate, /data-insert-chapter-variable/);
    assert.doesNotMatch(editorTemplate, /chapter-template-header/);
    assert.doesNotMatch(editorTemplate, /template-canvas-label/);
    assert.doesNotMatch(editorTemplate, /data-scene-divider-presets/);
    assert.doesNotMatch(editorTemplate, /data-opening-mode/);
    assert.match(editorScript, /openChapterCustomizer/);
    assert.match(editorScript, /applyChapterTemplate/);
    assert.match(editorScript, /chapterContentFromTemplate/);
    assert.doesNotMatch(editorTemplate, /data-template-number-label/);
    assert.doesNotMatch(editorScript, /chapter-number-label-input/);
});
