const WORD_PATTERN = /^[\p{L}]+(?:[-'’][\p{L}]+)*$/u;

function uniqueWords(words, query, limit = 16) {
    const seen = new Set([query.toLocaleLowerCase()]);
    return words.flatMap((value) => {
        const word = String(value || "").trim().replaceAll("_", " ");
        const key = word.toLocaleLowerCase();
        if (!word || seen.has(key)) return [];
        seen.add(key);
        return [word];
    }).slice(0, limit);
}

export function normalizeDictionaryQuery(value) {
    const word = String(value || "").trim().replace(/\s+/g, " ");
    return WORD_PATTERN.test(word) ? word.toLocaleLowerCase() : "";
}

function datamuseWords(results) {
    return Array.isArray(results) ? results.map(({ word }) => word) : [];
}

function dictionaryTerms(entries, key) {
    return entries.flatMap((entry) => (entry.meanings || []).flatMap((meaning) => [
        ...(meaning[key] || []),
        ...(meaning.definitions || []).flatMap((definition) => definition[key] || []),
    ]));
}

export function assembleDictionaryEntry(query, entries = [], relations = {}) {
    const primary = entries[0] || {};
    const phoneticWithAudio = (primary.phonetics || []).find(({ audio }) => audio);
    const meanings = entries.flatMap((entry) => entry.meanings || []).flatMap((meaning) => {
        const definitions = (meaning.definitions || []).slice(0, 3).map((definition) => ({
            definition: definition.definition || "",
            example: definition.example || "",
        })).filter(({ definition }) => definition);
        return definitions.length ? [{
            partOfSpeech: meaning.partOfSpeech || "meaning",
            definitions,
        }] : [];
    }).slice(0, 6);

    return {
        word: primary.word || query,
        phonetic: primary.phonetic || phoneticWithAudio?.text || "",
        audio: phoneticWithAudio?.audio || "",
        meanings,
        synonyms: uniqueWords([
            ...dictionaryTerms(entries, "synonyms"),
            ...datamuseWords(relations.synonyms),
        ], query),
        antonyms: uniqueWords([
            ...dictionaryTerms(entries, "antonyms"),
            ...datamuseWords(relations.antonyms),
        ], query),
    };
}

async function requestJson(fetchImpl, url, signal, { notFoundValue = null } = {}) {
    const response = await fetchImpl(url, { signal });
    if (response.status === 404 && notFoundValue !== null) return notFoundValue;
    if (!response.ok) throw new Error(`Dictionary request failed with status ${response.status}`);
    return response.json();
}

export async function fetchDictionaryEntry(value, options = {}) {
    const query = normalizeDictionaryQuery(value);
    if (!query) {
        const error = new Error("Enter a single word using letters, apostrophes, or hyphens.");
        error.code = "INVALID_QUERY";
        throw error;
    }

    const fetchImpl = options.fetchImpl || fetch;
    const encoded = encodeURIComponent(query);
    const requests = await Promise.allSettled([
        requestJson(
            fetchImpl,
            `https://api.dictionaryapi.dev/api/v2/entries/en/${encoded}`,
            options.signal,
            { notFoundValue: [] },
        ),
        requestJson(fetchImpl, `https://api.datamuse.com/words?rel_syn=${encoded}&max=40`, options.signal),
        requestJson(fetchImpl, `https://api.datamuse.com/words?rel_ant=${encoded}&max=40`, options.signal),
    ]);

    if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (requests.every(({ status }) => status === "rejected")) throw requests[0].reason;

    const entry = assembleDictionaryEntry(
        query,
        requests[0].status === "fulfilled" ? requests[0].value : [],
        {
            synonyms: requests[1].status === "fulfilled" ? requests[1].value : [],
            antonyms: requests[2].status === "fulfilled" ? requests[2].value : [],
        },
    );
    if (!entry.meanings.length && !entry.synonyms.length && !entry.antonyms.length) return null;
    return entry;
}
