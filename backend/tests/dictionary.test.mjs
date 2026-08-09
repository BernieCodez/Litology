import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    assembleDictionaryEntry,
    fetchDictionaryEntry,
    normalizeDictionaryQuery,
} from "../static/js/dictionary.mjs";

const editorTemplate = await readFile(
    new URL("../templates/pages/editor.html", import.meta.url),
    "utf8",
);

test("dictionary searches accept a single natural-language word", () => {
    assert.equal(normalizeDictionaryQuery("  Luminous "), "luminous");
    assert.equal(normalizeDictionaryQuery("mother-in-law"), "mother-in-law");
    assert.equal(normalizeDictionaryQuery("two words"), "");
    assert.equal(normalizeDictionaryQuery("word123"), "");
});

test("the dictionary launcher opens the dictionary panel", () => {
    assert.match(
        editorTemplate,
        /<button class="assistant-tool" type="button" data-open-dictionary>\s*<span class="tool-icon dictionary-icon"/,
    );
    assert.match(editorTemplate, /data-dictionary-panel/);
});

test("dictionary entries combine definitions and unique thesaurus terms", () => {
    const entry = assembleDictionaryEntry("bright", [{
        word: "bright",
        phonetic: "/braɪt/",
        meanings: [{
            partOfSpeech: "adjective",
            synonyms: ["radiant"],
            definitions: [{
                definition: "Giving out much light.",
                example: "A bright star.",
                synonyms: ["luminous"],
                antonyms: ["dim"],
            }],
        }],
    }], {
        synonyms: [{ word: "radiant" }, { word: "vivid" }],
        antonyms: [{ word: "dark" }],
    });

    assert.equal(entry.meanings[0].definitions[0].example, "A bright star.");
    assert.deepEqual(entry.synonyms, ["radiant", "luminous", "vivid"]);
    assert.deepEqual(entry.antonyms, ["dim", "dark"]);
});

test("dictionary lookup requests definitions, synonyms, and antonyms", async () => {
    const urls = [];
    const fetchImpl = async (url) => {
        urls.push(url);
        return {
            ok: true,
            status: 200,
            json: async () => url.includes("dictionaryapi")
                ? [{ word: "quiet", meanings: [{ partOfSpeech: "adjective", definitions: [{ definition: "Making little noise." }] }] }]
                : [],
        };
    };

    const entry = await fetchDictionaryEntry("quiet", { fetchImpl });
    assert.equal(entry.word, "quiet");
    assert.equal(urls.length, 3);
    assert.ok(urls.some((url) => url.includes("rel_syn=quiet")));
    assert.ok(urls.some((url) => url.includes("rel_ant=quiet")));
});
