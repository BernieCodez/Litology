import assert from "node:assert/strict";
import test from "node:test";

import {
    colorValue,
    hexToHsv,
    hsvToHex,
    parseColorValue,
} from "../static/js/color-picker.mjs";

test("color picker converts between hex and rgba values", () => {
    assert.deepEqual(parseColorValue("#d9825b"), { hex: "#d9825b", opacity: 100 });
    assert.deepEqual(parseColorValue("rgba(217, 130, 91, 0.45)"), {
        hex: "#d9825b",
        opacity: 45,
    });
    assert.equal(colorValue("#d9825b", 45), "rgba(217, 130, 91, 0.45)");
    assert.equal(colorValue("#d9825b", 100), "#d9825b");
});

test("color picker constrains opacity and rejects unsafe values", () => {
    assert.equal(colorValue("#fff", 150), "#ffffff");
    assert.deepEqual(parseColorValue("url(javascript:alert(1))", "#536b45"), {
        hex: "#536b45",
        opacity: 100,
    });
});

test("color wheel converts hue, saturation, and brightness", () => {
    assert.equal(hsvToHex(0, 1, 1), "#ff0000");
    assert.equal(hsvToHex(120, 1, 1), "#00ff00");
    assert.deepEqual(hexToHsv("#ffffff"), { hue: 0, saturation: 0, value: 1 });
    const orange = hexToHsv("#d9825b");
    assert.equal(hsvToHex(orange.hue, orange.saturation, orange.value), "#d9825b");
});
