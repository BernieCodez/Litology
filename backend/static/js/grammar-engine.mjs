const TYPO_CORRECTIONS = new Map([
    ["acheive", "achieve"],
    ["adress", "address"],
    ["alot", "a lot"],
    ["arguement", "argument"],
    ["becuase", "because"],
    ["beleive", "believe"],
    ["calender", "calendar"],
    ["comming", "coming"],
    ["definately", "definitely"],
    ["embarass", "embarrass"],
    ["enviroment", "environment"],
    ["goverment", "government"],
    ["grammer", "grammar"],
    ["happend", "happened"],
    ["helo", "hello"],
    ["immediatly", "immediately"],
    ["independant", "independent"],
    ["neccessary", "necessary"],
    ["occured", "occurred"],
    ["publically", "publicly"],
    ["recieve", "receive"],
    ["relevent", "relevant"],
    ["seperate", "separate"],
    ["succesful", "successful"],
    ["teh", "the"],
    ["thier", "their"],
    ["tommorow", "tomorrow"],
    ["untill", "until"],
    ["wierd", "weird"],
    ["writting", "writing"],
]);

const COMMON_WORDS = new Set(`
a about above across act action after again against age air all almost along already also always am
among an and animal another answer any anyone anything appear are around art as ask at away back bad
be beautiful became because become been before began begin behind believe best better between big black
book both boy bring brought but by call came can cannot car care carry case cause change chapter character
child city clear close cold come common complete could country course cut day decide deep did different do
does dog done door down during each early earth easy eat end enough even ever every example eye face fact
family far fast father feel feet few find first follow food for form found four free friend from front full
gave get girl give go good got great group grow had half hand happen happy hard has have he head hear heard
heart help her here high him his history hold home hope house how however human idea if important in include
inside into is it its just keep kind knew know known land language large last late later learn leave left less
let letter life light like line little live long look made make man many may me mean men might mind more most
mother move much must my name near need never new next night no not nothing now number of off often old on
once one only open or order other our out over own page paper part people perhaps place point possible power
problem project put question quite read real really reason right room run said same saw say school see seem
sentence set she should show side since small so some something sound still story such take tell than that the
their them then there these they thing think this those thought three through time to together too took turn two
under understand until up us use very want was water way we well went were what when where which while white who
why will with without word work world would write writer writing year yes yet you young your
accept accurate add address advice affect almost answer argument arrive attention beginning believe business
calendar certain clarity clearly coming correct definitely describe dialogue dictionary disappear effect either
embarrass environment especially excellent experience explanation familiar finally foreign friend grammar
government happened hello immediately important incorrect independent interesting knowledge language misspelled necessary occasion occurred
paragraph perhaps receive recommend relevant remember separate similar spelling successful surprise tomorrow truly
until usually weird whether wrong
`.trim().split(/\s+/));

const fuzzyCorrectionCache = new Map();

function editDistance(left, right) {
    if (Math.abs(left.length - right.length) > 1) return 2;
    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
        let diagonal = previous[0];
        previous[0] = leftIndex;
        let rowMinimum = previous[0];
        for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
            const above = previous[rightIndex];
            previous[rightIndex] = Math.min(
                previous[rightIndex] + 1,
                previous[rightIndex - 1] + 1,
                diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
            );
            diagonal = above;
            rowMinimum = Math.min(rowMinimum, previous[rightIndex]);
        }
        if (rowMinimum > 1) return 2;
    }
    return previous[right.length];
}

function isAdjacentTransposition(left, right) {
    if (left.length !== right.length) return false;
    const differences = [];
    for (let index = 0; index < left.length; index += 1) {
        if (left[index] !== right[index]) differences.push(index);
        if (differences.length > 2) return false;
    }
    return differences.length === 2
        && differences[1] === differences[0] + 1
        && left[differences[0]] === right[differences[1]]
        && left[differences[1]] === right[differences[0]];
}

function fuzzyCorrection(word) {
    if (word.length < 4 || COMMON_WORDS.has(word)) return null;
    if (fuzzyCorrectionCache.has(word)) return fuzzyCorrectionCache.get(word);
    const candidates = [];
    COMMON_WORDS.forEach((candidate) => {
        if (
            Math.abs(candidate.length - word.length) <= 1
            && (editDistance(word, candidate) === 1 || isAdjacentTransposition(word, candidate))
        ) {
            candidates.push(candidate);
        }
    });
    const correction = candidates.length === 1 ? candidates[0] : null;
    fuzzyCorrectionCache.set(word, correction);
    return correction;
}

const PHRASE_RULES = [
    {
        id: "could-of",
        type: "grammar",
        pattern: /\b(could|should|would) of\b/gi,
        replacement: (match) => match.replace(/ of$/i, " have"),
        message: "Use “have” after a modal verb.",
    },
    {
        id: "more-better",
        type: "grammar",
        pattern: /\bmore better\b/gi,
        replacement: () => "better",
        message: "Avoid a double comparative.",
    },
    {
        id: "in-order-to",
        type: "clarity",
        pattern: /\bin order to\b/gi,
        replacement: () => "to",
        message: "This can be more direct.",
    },
    {
        id: "due-to-fact",
        type: "clarity",
        pattern: /\bdue to the fact that\b/gi,
        replacement: () => "because",
        message: "Use a shorter, clearer connection.",
    },
];

const CLARITY_WORDS = new Set(["actually", "basically", "just", "really", "suddenly", "very"]);

function matchCase(source, replacement) {
    if (!replacement || !source) return replacement;
    if (source === source.toUpperCase()) return replacement.toUpperCase();
    if (source[0] === source[0].toUpperCase()) {
        return replacement[0].toUpperCase() + replacement.slice(1);
    }
    return replacement;
}

function issueId(ruleId, text, match, start, end) {
    const context = text
        .slice(Math.max(0, start - 18), Math.min(text.length, end + 18))
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
    return `${ruleId}:${match.toLowerCase()}:${context}`;
}

function issueFromMatch(text, offset, ruleId, type, match, replacement, message) {
    const from = offset + match.index;
    const to = from + match[0].length;
    return {
        id: issueId(ruleId, text, match[0], match.index, match.index + match[0].length),
        ruleId,
        type,
        from,
        to,
        original: match[0],
        replacement,
        message,
        wordCount: Math.max(1, match[0].trim().split(/\s+/).length),
    };
}

export function analyzeText(text, { offset = 0, spellchecker = null } = {}) {
    if (!text) return [];
    const issues = [];

    PHRASE_RULES.forEach((rule) => {
        for (const match of text.matchAll(rule.pattern)) {
            issues.push(issueFromMatch(
                text,
                offset,
                rule.id,
                rule.type,
                match,
                matchCase(match[0], rule.replacement(match[0])),
                rule.message,
            ));
        }
    });

    for (const match of text.matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)*/g)) {
        const normalized = match[0].toLowerCase();
        const explicitCorrection = TYPO_CORRECTIONS.get(normalized);
        const dictionaryResult = !explicitCorrection && spellchecker
            ? spellchecker(match[0])
            : null;
        const isDictionaryMisspelling = Boolean(dictionaryResult && !dictionaryResult.correct);
        const correction = explicitCorrection
            || dictionaryResult?.suggestions?.[0]
            || (!spellchecker ? fuzzyCorrection(normalized) : null);
        if (explicitCorrection || correction || isDictionaryMisspelling) {
            issues.push(issueFromMatch(
                text,
                offset,
                `typo-${normalized}`,
                "spelling",
                match,
                correction ? matchCase(match[0], correction) : null,
                "This looks like a spelling mistake.",
            ));
        } else if (CLARITY_WORDS.has(normalized)) {
            issues.push(issueFromMatch(
                text,
                offset,
                `clarity-${normalized}`,
                "clarity",
                match,
                "",
                "Removing this word may make the sentence more direct.",
            ));
        }
    }

    for (const match of text.matchAll(/\b([A-Za-z]+)(\s+)\1\b/gi)) {
        issues.push(issueFromMatch(
            text,
            offset,
            "repeated-word",
            "grammar",
            match,
            match[1],
            "This word appears twice.",
        ));
    }

    const selected = [];
    issues
        .sort((left, right) => left.from - right.from || right.to - left.to)
        .forEach((issue) => {
            if (!selected.some((candidate) => issue.from < candidate.to && issue.to > candidate.from)) {
                selected.push(issue);
            }
        });
    return selected;
}

export function countWords(text) {
    return text.trim() ? (text.match(/\b[\p{L}\p{N}'’-]+\b/gu) || []).length : 0;
}

export function grammarQuality(text, unresolvedIssues) {
    const totalWords = countWords(text);
    if (!totalWords) return 100;
    const inaccurateWords = unresolvedIssues.reduce(
        (total, issue) => total + Math.max(1, Number(issue.wordCount) || 1),
        0,
    );
    return Math.max(0, Math.round(((totalWords - inaccurateWords) / totalWords) * 100));
}

export function suggestionLabel(issue) {
    if (issue.replacement === null || issue.replacement === undefined) {
        return `Check spelling of “${issue.original}”`;
    }
    return issue.replacement ? `Change to “${issue.replacement}”` : `Remove “${issue.original}”`;
}
