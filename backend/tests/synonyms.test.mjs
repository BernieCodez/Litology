import assert from "node:assert/strict";
import test from "node:test";

import {
    fetchContextualSynonyms,
    isSingleSelectedWord,
    matchWordForm,
    neighboringWords,
} from "../static/js/synonyms.mjs";

test("synonym actions are limited to one selected word", () => {
    assert.equal(isSingleSelectedWord("ephemeral"), true);
    assert.equal(isSingleSelectedWord("don't"), true);
    assert.equal(isSingleSelectedWord("two words"), false);
});

test("synonym replacements preserve tense and capitalization", () => {
    assert.equal(matchWordForm("Running", "sprint"), "Sprinting");
    assert.equal(matchWordForm("liked", "enjoy"), "enjoyed");
    assert.equal(matchWordForm("WALKED", "stroll"), "STROLLED");
});

test("neighboring words capture only immediate local context", () => {
    const documentNode = {
        content: { size: 80 },
        textBetween(from, to) {
            return to <= 20 ? "she had always " : " music yesterday";
        },
    };
    assert.deepEqual(neighboringWords(documentNode, 15, 20), {
        left: "always",
        right: "music",
    });
});

test("contextual synonyms pass sentence hints and keep matching verb forms", async () => {
    let requestedUrl = "";
    const fetchImpl = async (url) => {
        requestedUrl = url;
        return {
            ok: true,
            json: async () => [
                { word: "sprint", score: 100, tags: ["v"] },
                { word: "operation", score: 90, tags: ["n"] },
            ],
        };
    };
    const synonyms = await fetchContextualSynonyms(
        "running",
        { left: "was", right: "quickly" },
        { fetchImpl },
    );

    assert.match(requestedUrl, /rel_syn=running/);
    assert.match(requestedUrl, /lc=was/);
    assert.match(requestedUrl, /rc=quickly/);
    assert.deepEqual(synonyms.map(({ word }) => word), ["sprinting"]);
});
