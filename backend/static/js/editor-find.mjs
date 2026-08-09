const WORD_CHARACTER = /[\p{L}\p{N}_]/u;

function isWordCharacter(character) {
    return Boolean(character && WORD_CHARACTER.test(character));
}

function firstCharacter(text) {
    return text.match(/^./u)?.[0] || "";
}

function lastCharacter(text) {
    return text.match(/.$/u)?.[0] || "";
}

function escapedRegularExpression(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findTextMatches(text, query, {
    caseSensitive = false,
    wholeWord = false,
} = {}) {
    if (!query) return [];

    const matches = [];
    const expression = new RegExp(
        escapedRegularExpression(query),
        caseSensitive ? "gu" : "giu",
    );

    for (const match of text.matchAll(expression)) {
        const from = match.index;
        const to = from + match[0].length;
        const startsWithWord = isWordCharacter(firstCharacter(match[0]));
        const endsWithWord = isWordCharacter(lastCharacter(match[0]));
        const hasWholeWordBoundaries = (!startsWithWord || !isWordCharacter(lastCharacter(text.slice(0, from))))
            && (!endsWithWord || !isWordCharacter(firstCharacter(text.slice(to))));

        if (!wholeWord || hasWholeWordBoundaries) {
            matches.push({ from, to });
        }
    }

    return matches;
}

export function steppedMatchIndex(currentIndex, matchCount, direction) {
    if (matchCount <= 0) return -1;
    const start = currentIndex >= 0 ? currentIndex : (direction < 0 ? 0 : -1);
    return (start + direction + matchCount) % matchCount;
}

export function initialMatchIndex(matches, chapter, position = 0) {
    if (!matches.length) return -1;
    const afterSelection = matches.findIndex((match) => (
        match.chapter === chapter && match.from >= position
    ));
    if (afterSelection >= 0) return afterSelection;

    const laterChapter = matches.findIndex((match) => (
        Number(match.chapter?.number) > Number(chapter?.number)
    ));
    return laterChapter >= 0 ? laterChapter : 0;
}
