const WORD_PATTERN = /^[\p{L}]+(?:['’][\p{L}]+)?$/u;
const TOKEN_PATTERN = /[\p{L}]+(?:['’][\p{L}]+)?/gu;
const IRREGULAR_FORMS = new Map([
    ["began", { lemma: "begin", form: "past" }],
    ["brought", { lemma: "bring", form: "past" }],
    ["came", { lemma: "come", form: "past" }],
    ["did", { lemma: "do", form: "past" }],
    ["felt", { lemma: "feel", form: "past" }],
    ["found", { lemma: "find", form: "past" }],
    ["gave", { lemma: "give", form: "past" }],
    ["got", { lemma: "get", form: "past" }],
    ["had", { lemma: "have", form: "past" }],
    ["knew", { lemma: "know", form: "past" }],
    ["left", { lemma: "leave", form: "past" }],
    ["made", { lemma: "make", form: "past" }],
    ["ran", { lemma: "run", form: "past" }],
    ["said", { lemma: "say", form: "past" }],
    ["saw", { lemma: "see", form: "past" }],
    ["took", { lemma: "take", form: "past" }],
    ["went", { lemma: "go", form: "past" }],
    ["wrote", { lemma: "write", form: "past" }],
]);

const IRREGULAR_PAST = new Map([
    ["begin", "began"], ["bring", "brought"], ["come", "came"], ["do", "did"],
    ["feel", "felt"], ["find", "found"], ["give", "gave"], ["get", "got"],
    ["go", "went"], ["have", "had"], ["know", "knew"], ["leave", "left"],
    ["make", "made"], ["run", "ran"], ["say", "said"], ["see", "saw"],
    ["take", "took"], ["write", "wrote"],
]);

function isConsonant(character) {
    return Boolean(character && /[bcdfghjklmnpqrstvwxyz]/i.test(character));
}

function hasShortFinalSyllable(word) {
    const length = word.length;
    return length >= 3
        && isConsonant(word[length - 3])
        && /[aeiou]/i.test(word[length - 2])
        && isConsonant(word[length - 1])
        && !/[wxy]/i.test(word[length - 1]);
}

export function isSingleSelectedWord(value) {
    return WORD_PATTERN.test(String(value || "").trim());
}

export function neighboringWords(documentNode, from, to) {
    const before = documentNode.textBetween(Math.max(0, from - 100), from, " ", " ");
    const after = documentNode.textBetween(to, Math.min(documentNode.content.size, to + 100), " ", " ");
    const leftMatches = [...before.matchAll(TOKEN_PATTERN)];
    return {
        left: leftMatches.at(-1)?.[0]?.toLowerCase() || "",
        right: after.match(TOKEN_PATTERN)?.[0]?.toLowerCase() || "",
    };
}

export function analyzeWordForm(value) {
    const word = String(value || "").toLowerCase().replace(/’/g, "'");
    const irregular = IRREGULAR_FORMS.get(word);
    if (irregular) return irregular;

    if (word.length > 5 && word.endsWith("ing")) {
        let lemma = word.slice(0, -3);
        if (lemma.at(-1) === lemma.at(-2)) lemma = lemma.slice(0, -1);
        return { lemma, alternateLemma: `${word.slice(0, -3)}e`, form: "presentParticiple" };
    }
    if (word.length > 4 && word.endsWith("ied")) {
        return { lemma: `${word.slice(0, -3)}y`, form: "past" };
    }
    if (word.length > 4 && word.endsWith("ed")) {
        let lemma = word.slice(0, -2);
        if (lemma.at(-1) === lemma.at(-2)) lemma = lemma.slice(0, -1);
        return { lemma, alternateLemma: `${word.slice(0, -1)}`, form: "past" };
    }
    if (word.length > 4 && word.endsWith("ies")) {
        return { lemma: `${word.slice(0, -3)}y`, form: "thirdPerson" };
    }
    if (word.length > 3 && word.endsWith("es")) {
        return { lemma: word.slice(0, -2), alternateLemma: word.slice(0, -1), form: "thirdPerson" };
    }
    if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) {
        return { lemma: word.slice(0, -1), form: "thirdPerson" };
    }
    return { lemma: word, form: "base" };
}

function inflectSingleWord(word, form) {
    if (form === "presentParticiple") {
        if (word.endsWith("ie")) return `${word.slice(0, -2)}ying`;
        if (word.endsWith("e") && !word.endsWith("ee")) return `${word.slice(0, -1)}ing`;
        return `${hasShortFinalSyllable(word) ? word + word.at(-1) : word}ing`;
    }
    if (form === "past") {
        if (IRREGULAR_PAST.has(word)) return IRREGULAR_PAST.get(word);
        if (word.endsWith("e")) return `${word}d`;
        if (word.endsWith("y") && isConsonant(word.at(-2))) return `${word.slice(0, -1)}ied`;
        return `${hasShortFinalSyllable(word) ? word + word.at(-1) : word}ed`;
    }
    if (form === "thirdPerson") {
        if (word.endsWith("y") && isConsonant(word.at(-2))) return `${word.slice(0, -1)}ies`;
        if (/(?:s|x|z|ch|sh|o)$/i.test(word)) return `${word}es`;
        return `${word}s`;
    }
    return word;
}

function matchCapitalization(source, replacement) {
    if (source === source.toUpperCase()) return replacement.toUpperCase();
    if (source[0] === source[0].toUpperCase()) {
        return replacement[0].toUpperCase() + replacement.slice(1);
    }
    return replacement;
}

export function matchWordForm(source, candidate, form = analyzeWordForm(source).form) {
    const words = String(candidate || "").toLowerCase().split(/\s+/);
    if (form !== "base") words[0] = inflectSingleWord(words[0], form);
    return matchCapitalization(String(source), words.join(" "));
}

export function inferPartOfSpeech(word, left = "", right = "") {
    const normalized = word.toLowerCase();
    if (normalized.endsWith("ly")) return "adv";
    if (/^(?:to|can|could|did|do|does|may|might|must|shall|should|will|would)$/.test(left)) return "v";
    if (/(?:ing|ed)$/i.test(normalized)) return "v";
    if (/^(?:a|an|the|this|that|my|your|his|her|our|their)$/.test(left)) return "n";
    if (/^(?:is|am|are|was|were|be|been|seem|seems|feel|feels)$/.test(left)) return "adj";
    if (/^(?:ly)$/.test(right)) return "v";
    return "";
}

function contextParameters({ left = "", right = "" }) {
    const parameters = new URLSearchParams({ md: "p", max: "1000" });
    if (left) parameters.set("lc", left);
    if (right) parameters.set("rc", right);
    return parameters;
}

async function requestSynonyms(queryWord, context, fetchImpl, signal) {
    const parameters = contextParameters(context);
    parameters.set("rel_syn", queryWord);
    const response = await fetchImpl(`https://api.datamuse.com/words?${parameters}`, { signal });
    if (!response.ok) throw new Error(`Synonym request failed with status ${response.status}`);
    return response.json();
}

export async function fetchContextualSynonyms(word, context = {}, options = {}) {
    const fetchImpl = options.fetchImpl || fetch;
    const form = analyzeWordForm(word);
    let results = await requestSynonyms(word.toLowerCase(), context, fetchImpl, options.signal);
    if (!results.length && form.lemma !== word.toLowerCase()) {
        results = await requestSynonyms(form.lemma, context, fetchImpl, options.signal);
    }
    if (!results.length && form.alternateLemma) {
        results = await requestSynonyms(form.alternateLemma, context, fetchImpl, options.signal);
    }

    const expectedPart = inferPartOfSpeech(word, context.left, context.right);
    const partMatched = expectedPart
        ? results.filter((result) => result.tags?.includes(expectedPart))
        : results;
    const ranked = partMatched.length ? partMatched : results;
    const seen = new Set([word.toLowerCase()]);
    return ranked.flatMap((result) => {
        const replacement = matchWordForm(word, result.word.replace(/_/g, " "), form.form);
        const key = replacement.toLowerCase();
        if (!replacement || seen.has(key)) return [];
        seen.add(key);
        return [{ word: replacement, score: result.score || 0, tags: result.tags || [] }];
    });
}
