import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    findTextMatches,
    initialMatchIndex,
    steppedMatchIndex,
} from "../static/js/editor-find.mjs";

test("findTextMatches finds non-overlapping matches without case sensitivity by default", () => {
    assert.deepEqual(findTextMatches("One one ONE", "one"), [
        { from: 0, to: 3 },
        { from: 4, to: 7 },
        { from: 8, to: 11 },
    ]);
    assert.deepEqual(findTextMatches("aaaa", "aa"), [
        { from: 0, to: 2 },
        { from: 2, to: 4 },
    ]);
    assert.deepEqual(findTextMatches("Cost is $5. ($5)", "$5"), [
        { from: 8, to: 10 },
        { from: 13, to: 15 },
    ]);
});

test("findTextMatches supports case-sensitive and Unicode whole-word matching", () => {
    assert.deepEqual(findTextMatches("Cat cat catalog", "Cat", { caseSensitive: true }), [
        { from: 0, to: 3 },
    ]);
    assert.deepEqual(findTextMatches("cat catfish cat_cafe cat—café", "cat", { wholeWord: true }), [
        { from: 0, to: 3 },
        { from: 21, to: 24 },
    ]);
});

test("match navigation wraps in either direction", () => {
    assert.equal(steppedMatchIndex(-1, 3, 1), 0);
    assert.equal(steppedMatchIndex(2, 3, 1), 0);
    assert.equal(steppedMatchIndex(0, 3, -1), 2);
    assert.equal(steppedMatchIndex(0, 0, 1), -1);
});

test("initial selection starts after the writer cursor and wraps across chapters", () => {
    const first = { number: 1 };
    const second = { number: 2 };
    const matches = [
        { chapter: first, from: 3 },
        { chapter: first, from: 12 },
        { chapter: second, from: 2 },
    ];

    assert.equal(initialMatchIndex(matches, first, 10), 1);
    assert.equal(initialMatchIndex(matches, first, 20), 2);
    assert.equal(initialMatchIndex(matches, second, 20), 0);
});

test("the manuscript installs its in-editor find UI and autosaves replacement transactions", async () => {
    const source = await readFile(new URL("../static/js/editor.js", import.meta.url), "utf8");
    const template = await readFile(new URL("../templates/pages/editor.html", import.meta.url), "utf8");

    assert.match(template, /data-find-replace[\s\S]*data-find-previous[\s\S]*data-replace-all/);
    assert.doesNotMatch(template, /<section[^>]*data-find-replace[^>]*data-book-only/);
    assert.match(template, /data-find-case-sensitive[\s\S]*data-find-whole-word[\s\S]*data-find-scope/);
    assert.match(source, /event\.key\.toLocaleLowerCase\(\) === "f"/);
    assert.match(source, /findReplaceExtension\(chapter\)/);
    assert.match(source, /transaction\.insertText\(replaceInput\.value, match\.from, match\.to\)/);
    assert.match(source, /onUpdate:[\s\S]*scheduleChapterSave\(chapter\);[\s\S]*scheduleFindResultsSync\(\);/);
    assert.match(source, /chapter\.editor\.commands\.focus\(\);/);
});
