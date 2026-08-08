import assert from "node:assert/strict";
import test from "node:test";

import {
    filterFontCatalog,
    googleFontPreviewStylesheetUrl,
    googleFontStylesheetUrl,
    loadImportedFonts,
    saveImportedFonts,
} from "../static/js/font-library.mjs";

function memoryStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
    };
}

test("Google Font stylesheet URLs safely encode family names", () => {
    assert.equal(
        googleFontStylesheetUrl("Libre Baskerville"),
        "https://fonts.googleapis.com/css2?family=Libre+Baskerville&display=swap"
    );
    assert.equal(googleFontStylesheetUrl('Bad"Font'), "");
    assert.equal(
        googleFontStylesheetUrl("Literata", "Literata"),
        "https://fonts.googleapis.com/css2?family=Literata&text=Literata&display=swap"
    );
});

test("preview URLs batch multiple families into one subset request", () => {
    const url = googleFontPreviewStylesheetUrl(["Literata", "Roboto Slab"]);

    assert.match(url, /family=Literata&family=Roboto\+Slab/);
    assert.match(url, /&text=/);
    assert.match(url, /&display=swap$/);
});

test("imported fonts are validated, deduplicated, sorted, and restored", () => {
    const storage = memoryStorage();
    const saved = saveImportedFonts(
        ["Zilla Slab", "Alegreya", "Zilla Slab", "Font); color:red"],
        storage
    );

    assert.deepEqual(saved, ["Alegreya", "Zilla Slab"]);
    assert.deepEqual(loadImportedFonts(storage), saved);
});

test("font search prioritizes prefix matches and respects its result limit", () => {
    const fonts = [
        { family: "Roboto Slab", popularity: 20 },
        { family: "Bodoni Moda", popularity: 2 },
        { family: "Roboto", popularity: 10 },
    ];

    assert.deepEqual(
        filterFontCatalog(fonts, "rob", 2).map((font) => font.family),
        ["Roboto", "Roboto Slab"]
    );
});
