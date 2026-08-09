import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    createGoogleDocsShortcutMap,
    GOOGLE_DOCS_SHORTCUTS,
    shortcutLabel,
} from "../static/js/editor-shortcuts.mjs";

test("Google Docs formatting shortcuts include toolbar and paragraph actions", () => {
    assert.deepEqual(GOOGLE_DOCS_SHORTCUTS.bold.keys, ["Mod-b"]);
    assert.ok(GOOGLE_DOCS_SHORTCUTS.fontSizeIncrease.keys.includes("Mod->"));
    assert.ok(GOOGLE_DOCS_SHORTCUTS.fontSizeDecrease.keys.includes("Mod-<"));
    assert.deepEqual(GOOGLE_DOCS_SHORTCUTS.alignJustify.keys, ["Mod-Shift-j"]);
    assert.deepEqual(GOOGLE_DOCS_SHORTCUTS.orderedList.keys, ["Mod-Shift-7"]);
    assert.deepEqual(GOOGLE_DOCS_SHORTCUTS.bulletList.keys, ["Mod-Shift-8"]);
});

test("shortcut map connects every key alias to its supplied action", () => {
    const increase = () => true;
    const bold = () => true;
    const shortcuts = createGoogleDocsShortcutMap({ fontSizeIncrease: increase, bold });

    assert.equal(shortcuts["Mod->"], increase);
    assert.equal(shortcuts["Mod-Shift-."], increase);
    assert.equal(shortcuts["Mod-b"], bold);
    assert.equal(shortcuts["Mod-i"], undefined);
});

test("shortcut labels adapt the primary modifier to the platform", () => {
    assert.equal(shortcutLabel("bold", "Win32"), "Ctrl+B");
    assert.equal(shortcutLabel("bold", "MacIntel"), "Cmd+B");
    assert.equal(shortcutLabel("strikethrough", "MacIntel"), "Option+Shift+5");
    assert.equal(shortcutLabel("fontSizeIncrease", "Win32"), "Ctrl+Shift+.");
});

test("both manuscript editors install the shortcut layer and toolbar hints", async () => {
    const editorSource = await readFile(new URL("../static/js/editor.js", import.meta.url), "utf8");
    const editorTemplate = await readFile(
        new URL("../templates/pages/editor.html", import.meta.url),
        "utf8",
    );

    assert.equal(
        editorSource.match(/googleDocsShortcutsExtension,/g)?.length,
        2,
        "the chapter template and manuscript editors should both install the shortcuts",
    );
    assert.match(editorTemplate, /data-font-size-increase[\s\S]*?data-shortcut-action="fontSizeIncrease"/);
    assert.match(editorTemplate, /data-command="bold" data-shortcut-action="bold"/);
});
