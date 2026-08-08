import assert from "node:assert/strict";
import test from "node:test";

import { checkEnglishWord } from "../static/js/english-spellchecker.bundle.mjs";

test("the bundled dictionary recognizes advanced English vocabulary", () => {
    assert.equal(checkEnglishWord("perspicacious").correct, true);
    assert.equal(checkEnglishWord("ephemeral").correct, true);
    assert.equal(checkEnglishWord("idiosyncratic").correct, true);
    assert.equal(checkEnglishWord("juxtaposition").correct, true);
});

test("the bundled dictionary suggests corrections for harder misspellings", () => {
    const result = checkEnglishWord("ubiquituss");

    assert.equal(result.correct, false);
    assert.ok(result.suggestions.includes("ubiquitous"));
});
