import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const editorJavaScript = await readFile(
    new URL("../static/js/editor.js", import.meta.url),
    "utf8",
);
const editorCss = await readFile(
    new URL("../static/css/editor.css", import.meta.url),
    "utf8",
);
const editorTemplate = await readFile(
    new URL("../templates/pages/editor.html", import.meta.url),
    "utf8",
);

test("the manuscript disables competing native and extension spellcheckers", () => {
    assert.match(editorJavaScript, /spellcheck:\s*"false"/);
    assert.match(editorJavaScript, /"data-gramm":\s*"false"/);
    assert.match(editorJavaScript, /"data-enable-grammarly":\s*"false"/);
});

test("Litology spelling highlights use a straight underline", () => {
    assert.match(
        editorCss,
        /\.grammar-highlight--spelling\s*\{[^}]*text-decoration-style:\s*solid;/s,
    );
});

test("grammar highlights open the correction popover directly on hover", () => {
    assert.doesNotMatch(editorCss, /\.grammar-highlight::after/);
    assert.doesNotMatch(editorJavaScript, /data-grammar-preview/);
    assert.match(editorJavaScript, /addEventListener\("pointerover"/);
    assert.match(editorJavaScript, /openGrammarPopover\(chapter, issue, highlight\)/);
});

test("grammar highlights do not use a click handler and popovers animate both ways", () => {
    assert.doesNotMatch(editorJavaScript, /document\.addEventListener\("click"/);
    assert.match(editorJavaScript, /classList\.add\("is-visible"\)/);
    assert.match(editorJavaScript, /classList\.add\("is-leaving"\)/);
    assert.match(editorCss, /\.grammar-popover\.is-visible/);
    assert.match(editorCss, /\.grammar-popover\.is-leaving/);
});

test("selected manuscript text exposes comment and contextual synonym actions", () => {
    assert.match(editorTemplate, /data-selection-comment/);
    assert.match(editorTemplate, /data-selection-synonyms/);
    assert.match(editorJavaScript, /addEventListener\("contextmenu"/);
    assert.match(editorJavaScript, /fetchContextualSynonyms/);
    assert.match(editorCss, /\.selection-popover\.is-visible/);
});

test("selected text can update its project-wide reusable style", () => {
    assert.match(editorTemplate, /data-selection-update-style/);
    assert.match(editorJavaScript, /settingsWithMatchedTextStyle/);
    assert.match(editorJavaScript, /chapterStates\.forEach\(\(chapter\) =>/);
    assert.match(editorJavaScript, /applyChapterSettings\(chapter\.article, chapter\.settings\)/);
});

test("color formatting keeps its original text range and exact picker value", () => {
    assert.match(editorJavaScript, /function rememberColorFormattingSelection/);
    assert.match(editorJavaScript, /function restoreColorFormattingSelection/);
    assert.match(editorJavaScript, /TextSelection\.create\(editor\.state\.doc, saved\.from, saved\.to\)/);
    assert.match(editorJavaScript, /const color = highlightColorControl\.value;/);
    assert.match(editorJavaScript, /setBackgroundColor\(color\)/);
    assert.match(editorJavaScript, /setColorPickerValue\(highlightColorControl, color\)/);
});

test("temporary toolbar formatting visibly overrides the generated opening text style", () => {
    assert.match(editorJavaScript, /function openingRangeHasStyleOverride/);
    assert.match(editorJavaScript, /chapter-opening-text has-style-override/);
    assert.match(editorCss, /\.chapter-opening-text:not\(\.has-style-override\)/);
});

test("the block style dropdown previews each reusable text style", () => {
    assert.match(editorJavaScript, /function syncBlockStylePreviews/);
    assert.match(editorJavaScript, /option\.dataset\.previewColor = style\.color/);
    assert.match(editorJavaScript, /option\.dataset\.previewFontFamily = style\.fontFamily/);
    assert.match(editorJavaScript, /syncBlockStylePreviews\(chapterTemplateDraft\)/);
    assert.match(editorCss, /\.custom-select-option\.has-style-preview/);
});
