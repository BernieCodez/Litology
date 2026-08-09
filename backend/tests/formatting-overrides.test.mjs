import assert from "node:assert/strict";
import test from "node:test";

import {
    effectiveFormatIsActive,
    inheritedFormatIsActive,
    INLINE_FORMATS,
} from "../static/js/formatting-overrides.mjs";

test("reusable styles provide inherited formatting state", () => {
    assert.equal(inheritedFormatIsActive({ bold: true }, "bold"), true);
    assert.equal(inheritedFormatIsActive({ italic: false }, "italic"), false);
    assert.equal(inheritedFormatIsActive({}, "strike"), false);
    assert.equal(INLINE_FORMATS.underline.overrideAttribute, "underlineOverride");
});

test("an explicit off override wins over inherited and marked formatting", () => {
    assert.equal(effectiveFormatIsActive({ inherited: true }), true);
    assert.equal(effectiveFormatIsActive({ marked: true }), true);
    assert.equal(effectiveFormatIsActive({
        inherited: true,
        marked: true,
        override: "off",
    }), false);
});
