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
const editorCss = await readFile(
    new URL("../static/css/editor.css", import.meta.url),
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
    assert.match(editorTemplate, /data-scene-divider-presets/);
    assert.match(editorTemplate, /data-opening-mode/);
    assert.match(editorScript, /openChapterCustomizer/);
    assert.match(editorScript, /applyChapterTemplate/);
    assert.match(editorScript, /chapterContentFromTemplate/);
    assert.doesNotMatch(editorTemplate, /data-template-number-label/);
    assert.doesNotMatch(editorScript, /chapter-number-label-input/);
});

test("chapter settings expose automatic opening text and custom scene dividers", () => {
    assert.match(editorTemplate, /data-open-chapter-settings/);
    assert.match(editorTemplate, /data-chapter-settings-dialog/);
    assert.match(editorTemplate, /<option value="opening">Opening text<\/option>/);
    assert.match(editorTemplate, />First letter<\/button>/);
    assert.match(editorTemplate, />First whole word<\/button>/);
    assert.match(editorTemplate, />First sentence<\/button>/);
    assert.match(editorTemplate, /data-opening-layout/);
    assert.match(editorTemplate, />Drop cap<\/button>/);
    assert.match(editorTemplate, />Raised<\/button>/);
    assert.match(editorTemplate, />Inline<\/button>/);
    assert.match(editorTemplate, /data-custom-scene-divider/);
    assert.match(editorTemplate, /> Create your own<\/button>/);
    assert.doesNotMatch(editorTemplate, /Live preview/);
    assert.doesNotMatch(editorTemplate, /data-opening-font-family/);
    assert.doesNotMatch(editorTemplate, /data-opening-color/);
    assert.match(editorScript, /function openChapterSettings/);
    assert.match(editorScript, /function saveChapterSettings/);
    assert.match(editorScript, /chapterSettingsChanged/);
    assert.match(editorScript, /selectionUsesOpeningStyle/);
    assert.match(editorScript, /prepareOpeningStyleOverride/);
});

test("scene breaks have safe toolbar insertion, preset controls, and toolbar styling", () => {
    assert.match(editorTemplate, /data-insert-scene-break/);
    assert.match(editorTemplate, /data-scene-break-popover/);
    assert.doesNotMatch(editorTemplate, /data-scene-break-color/);
    assert.doesNotMatch(editorTemplate, /data-scene-break-thickness/);
    assert.match(editorTemplate, /class="scene-break-popover"[\s\S]*data-value="custom"/);
    assert.doesNotMatch(editorTemplate, /class="scene-break-popover"[\s\S]*data-custom-scene-divider/);
    assert.match(editorScript, /Node\.create\(\{\s*name: "horizontalRule"/s);
    assert.match(editorScript, /sceneBreakAttributes\(sceneBreakSettingsForEditor\(editor\)\)/);
    assert.match(editorScript, /insertContent\(\[\s*\{ type: "horizontalRule", attrs: attributes \},\s*\{ type: "paragraph" \}/s);
    assert.match(editorScript, /function selectedSceneBreak/);
    assert.match(editorScript, /updateSelectedSceneBreak\(editor, \{ color \}\)/);
    assert.match(editorScript, /sceneBreakSettingsForEditor\(activeSceneBreak\.chapter\.editor\)/);
    assert.match(editorScript, /document\.addEventListener\("contextmenu"/);
    assert.match(editorCss, /hr\[data-scene-preset="dotted"\]::after/);
    assert.match(editorCss, /\.chapter-section \.tiptap hr\s*\{[^}]*width:\s*100%;/s);
    assert.match(editorCss, /data:image\/svg\+xml/);
    assert.match(editorCss, /data-scene-preset="double"[\s\S]*linear-gradient/);
    assert.match(editorCss, /hr\.ProseMirror-selectednode/);
});

test("title text has no automatic divider line", () => {
    assert.match(editorCss, /\.tiptap h1\s*\{[^}]*border-bottom:\s*0;/s);
});
