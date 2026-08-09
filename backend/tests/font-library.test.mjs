import assert from "node:assert/strict";
import test from "node:test";

import {
    filterFontCatalog,
    googleFontPreviewStylesheetUrl,
    googleFontStylesheetUrl,
    isBuiltInFont,
    loadLocalFont,
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

test("Times New Roman is a local built-in only when the browser can load it", async () => {
    const addedFaces = [];
    class AvailableFontFace {
        constructor(family, source) {
            this.family = family;
            this.source = source;
        }

        async load() {
            return this;
        }
    }

    assert.equal(isBuiltInFont("Times New Roman"), true);
    assert.equal(await loadLocalFont(
        "Times New Roman",
        AvailableFontFace,
        { add: (fontFace) => addedFaces.push(fontFace) },
    ), true);
    assert.equal(addedFaces[0].family, "Times New Roman");
    assert.equal(addedFaces[0].source, 'local("Times New Roman")');
});

test("an unavailable local font remains hidden", async () => {
    class UnavailableFontFace {
        async load() {
            throw new Error("Font is not installed");
        }
    }

    assert.equal(await loadLocalFont(
        "Times New Roman",
        UnavailableFontFace,
        { add: () => assert.fail("An unavailable font must not be registered") },
    ), false);
});
