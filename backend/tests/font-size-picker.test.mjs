import assert from "node:assert/strict";
import test from "node:test";

import {
    formatFontSize,
    normalizeFontSize,
    parseFontSize,
    stepFontSize,
} from "../static/js/font-size-picker.mjs";

test("parses plain and pixel font sizes", () => {
    assert.equal(parseFontSize("18"), 18);
    assert.equal(parseFontSize(" 12.5px "), 12.5);
    assert.equal(parseFontSize("large"), null);
});

test("normalizes custom sizes to the supported range", () => {
    assert.equal(normalizeFontSize(0), 1);
    assert.equal(normalizeFontSize(999), 400);
    assert.equal(normalizeFontSize("12.56"), 12.6);
    assert.equal(normalizeFontSize("invalid", 18), 18);
});

test("steps the current value and formats it for the input", () => {
    assert.equal(stepFontSize("12px", 1), 13);
    assert.equal(stepFontSize("12", -1), 11);
    assert.equal(formatFontSize(14), "14");
});
