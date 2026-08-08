import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const editorCss = await readFile(new URL("../static/css/editor.css", import.meta.url), "utf8");
const editorTemplate = await readFile(new URL("../templates/pages/editor.html", import.meta.url), "utf8");

test("editor search labels are visually hidden without occupying layout space", () => {
    assert.match(editorTemplate, /class="sr-only" for="google-font-search"/);
    assert.match(
        editorCss,
        /\.sr-only\s*\{[^}]*position:\s*absolute;[^}]*overflow:\s*hidden;/s,
    );
});
