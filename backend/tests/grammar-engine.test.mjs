import assert from "node:assert/strict";
import test from "node:test";

import {
    analyzeText,
    countWords,
    grammarQuality,
    suggestionLabel,
} from "../static/js/grammar-engine.mjs";

test("grammar analysis finds spelling, grammar, and clarity issues without overlaps", () => {
    const issues = analyzeText("Teh hero could of really done better better.", { offset: 10 });

    assert.deepEqual(issues.map(({ type }) => type), ["spelling", "grammar", "clarity", "grammar"]);
    assert.equal(issues[0].from, 10);
    assert.equal(issues[0].replacement, "The");
    assert.equal(issues.at(-1).replacement, "better");
});

test("grammar analysis suggests ordinary misspellings beyond its explicit typo list", () => {
    const [issue] = analyzeText("Please corect this sentence.");

    assert.equal(issue.type, "spelling");
    assert.equal(issue.original, "corect");
    assert.equal(issue.replacement, "correct");
});

test("grammar analysis recognizes adjacent transposition typos", () => {
    const [issue] = analyzeText("Thsi needs attention.");

    assert.equal(issue.original, "Thsi");
    assert.equal(issue.replacement, "This");
});

test("grammar analysis uses a full dictionary provider when available", () => {
    const dictionary = (word) => ({
        correct: word.toLowerCase() === "sesquipedalian",
        suggestions: word.toLowerCase() === "sesquipedallian" ? ["sesquipedalian"] : [],
    });
    const valid = analyzeText("sesquipedalian", { spellchecker: dictionary });
    const [misspelled] = analyzeText("sesquipedallian", { spellchecker: dictionary });

    assert.equal(valid.length, 0);
    assert.equal(misspelled.replacement, "sesquipedalian");
});

test("grammar quality represents the percentage of words without open issues", () => {
    const text = "One two three four five";
    const issues = [{ wordCount: 1 }, { wordCount: 1 }];

    assert.equal(countWords(text), 5);
    assert.equal(grammarQuality(text, issues), 60);
    assert.equal(grammarQuality("", issues), 100);
});

test("suggestion labels support replacements and removals", () => {
    assert.equal(suggestionLabel({ original: "teh", replacement: "the" }), "Change to “the”");
    assert.equal(suggestionLabel({ original: "very", replacement: "" }), "Remove “very”");
});
