import assert from "node:assert/strict";
import test from "node:test";

import {
    formatPickerDate,
    formatPickerTime,
    parseTypedDate,
    workspacePickerMarkup,
} from "../static/js/workspace-pickers.mjs";

test("workspace date and time fields avoid native browser picker inputs", () => {
    const date = workspacePickerMarkup({ name: "date", label: "Story date", type: "date" }, "2026-08-07");
    const time = workspacePickerMarkup({ name: "time", label: "Story time", type: "time" }, "13:15");

    assert.match(date, /data-date-picker/);
    assert.match(time, /data-time-picker/);
    assert.match(date, /type="hidden" name="date"/);
    assert.match(time, /type="hidden" name="time"/);
    assert.doesNotMatch(date, /type="date"/);
    assert.doesNotMatch(time, /type="time"/);
});

test("workspace picker labels handle empty and saved values", () => {
    assert.equal(formatPickerDate(""), "Choose a date");
    assert.equal(formatPickerTime(""), "Choose a time");
    assert.notEqual(formatPickerDate("2026-08-07"), "Choose a date");
    assert.notEqual(formatPickerTime("13:15"), "Choose a time");
});

test("typed story dates normalize historical, future, and written values", () => {
    assert.equal(parseTypedDate("0044-03-15"), "0044-03-15");
    assert.equal(parseTypedDate("12/31/2999"), "2999-12-31");
    assert.equal(parseTypedDate("12045-08-07"), "12045-08-07");
    assert.equal(parseTypedDate("February 30, 1842"), null);
    assert.equal(parseTypedDate(""), "");
});
