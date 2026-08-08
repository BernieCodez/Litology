/*!
 * Local English spellchecking powered by nspell (MIT) and dictionary-en
 * (MIT AND BSD). Sources and complete license texts are available in the
 * installed npm packages and at https://github.com/wooorm/nspell and
 * https://github.com/wooorm/dictionaries/tree/main/dictionaries/en.
 */
import nspell from "nspell";
import aff from "../../node_modules/dictionary-en/index.aff";
import dic from "../../node_modules/dictionary-en/index.dic";

const english = nspell(aff, dic);
const resultCache = new Map();

export function checkEnglishWord(word) {
    const normalized = String(word || "").replace(/’/g, "'");
    const lowercase = normalized.toLowerCase();
    if (resultCache.has(lowercase)) return resultCache.get(lowercase);
    const correct = english.correct(normalized) || english.correct(lowercase);
    const result = {
        correct,
        suggestions: correct ? [] : english.suggest(normalized).slice(0, 5),
    };
    resultCache.set(lowercase, result);
    return result;
}
