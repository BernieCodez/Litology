export const STYLE_DEFINITIONS = [
    { key: "h1", label: "H1", node: "heading", level: 1 },
    { key: "h2", label: "H2", node: "heading", level: 2 },
    { key: "h3", label: "H3", node: "heading", level: 3 },
    { key: "h4", label: "H4", node: "heading", level: 4 },
    { key: "normal", label: "Normal", node: "paragraph" },
];

export const FONT_OPTIONS = ["Playfair Display", "Inter", "Georgia", "Arial", "Courier New"];

export const SCENE_SEPARATOR_PRESETS = {
    asterism: "\u2042",
    fleuron: "\u2766",
    diamonds: "\u25c6 \u25c6 \u25c6",
    dots: "\u2022 \u2022 \u2022",
    stars: "\u2726 \u2726 \u2726",
    classic: "* * *",
};

const DEFAULT_STYLE_SETTINGS = {
    h1: {
        fontFamily: "Playfair Display", fontSize: 44, color: "#14131f",
        alignment: "left", bold: true, italic: false, underline: false, lineHeight: 1.08,
    },
    h2: {
        fontFamily: "Playfair Display", fontSize: 30, color: "#536b45",
        alignment: "left", bold: true, italic: false, underline: false, lineHeight: 1.18,
    },
    h3: {
        fontFamily: "Playfair Display", fontSize: 26, color: "#14131f",
        alignment: "left", bold: true, italic: false, underline: false, lineHeight: 1.2,
    },
    h4: {
        fontFamily: "Playfair Display", fontSize: 22, color: "#14131f",
        alignment: "left", bold: true, italic: false, underline: false, lineHeight: 1.25,
    },
    normal: {
        fontFamily: "Playfair Display", fontSize: 17, color: "#14131f",
        alignment: "left", bold: false, italic: false, underline: false, lineHeight: 1.86,
    },
};

export const DEFAULT_CHAPTER_TEMPLATE_CONTENT = {
    type: "doc",
    content: [
        {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Chapter Name" }],
        },
        { type: "paragraph" },
    ],
};

export const DEFAULT_CHAPTER_SETTINGS = {
    numberLabel: "CHAPTER {chapter_number}",
    templateNumberLabel: "CHAPTER @chapter_number",
    templateContent: DEFAULT_CHAPTER_TEMPLATE_CONTENT,
    chapterName: "Chapter Name",
    numberLabelStyle: {
        fontFamily: "Inter", fontSize: 9, color: "#d9825b", letterSpacing: 2,
        spacing: 22, alignment: "left", bold: true, italic: false, uppercase: true,
    },
    styles: DEFAULT_STYLE_SETTINGS,
    sceneSeparator: { preset: "asterism", custom: "\u25c6" },
    opening: {
        mode: "none", layout: "drop", fontFamily: "Playfair Display", fontSize: 3.4,
        color: "#d9825b", bold: true, italic: false, uppercase: false, letterSpacing: 0,
    },
};

const LEGACY_STYLE_KEYS = {
    h1: "title",
    h2: "subtitle",
    h3: "heading1",
    h4: "heading2",
    normal: "body",
};

function boundedNumber(value, fallback, minimum, maximum) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function color(value, fallback) {
    const candidate = String(value || "").trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/i.test(candidate)) return candidate;
    const rgba = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?)\s*\)$/i.exec(candidate);
    if (!rgba || rgba.slice(1, 4).some((part) => Number(part) > 255)) return fallback;
    return `rgba(${Number(rgba[1])}, ${Number(rgba[2])}, ${Number(rgba[3])}, ${Number(rgba[4])})`;
}

export function isSafeFontFamily(value) {
    return typeof value === "string"
        && value.length <= 80
        && /^[\p{L}\p{N}][\p{L}\p{N} .&'_-]*$/u.test(value);
}

function fontFamily(value, fallback) {
    return isSafeFontFamily(value) ? value : fallback;
}

function numberLabel(value) {
    if (typeof value !== "string") return "";
    return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80).trim();
}

function chapterName(value) {
    if (typeof value !== "string") return DEFAULT_CHAPTER_SETTINGS.chapterName;
    const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
    return cleaned.slice(0, 80).trim() || DEFAULT_CHAPTER_SETTINGS.chapterName;
}

function templateDocument(value) {
    if (!value || typeof value !== "object" || value.type !== "doc" || !Array.isArray(value.content)) {
        return structuredClone(DEFAULT_CHAPTER_TEMPLATE_CONTENT);
    }
    try {
        const cloned = JSON.parse(JSON.stringify(value));
        return cloned && cloned.type === "doc" && Array.isArray(cloned.content)
            ? cloned
            : structuredClone(DEFAULT_CHAPTER_TEMPLATE_CONTENT);
    } catch {
        return structuredClone(DEFAULT_CHAPTER_TEMPLATE_CONTENT);
    }
}

function styleSettings(value, fallback) {
    const source = value && typeof value === "object" ? value : {};
    return {
        fontFamily: fontFamily(source.fontFamily, fallback.fontFamily),
        fontSize: boundedNumber(source.fontSize, fallback.fontSize, 8, 96),
        color: color(source.color, fallback.color),
        alignment: ["left", "center", "right", "justify"].includes(source.alignment)
            ? source.alignment : fallback.alignment,
        bold: typeof source.bold === "boolean" ? source.bold : fallback.bold,
        italic: typeof source.italic === "boolean" ? source.italic : fallback.italic,
        underline: typeof source.underline === "boolean" ? source.underline : fallback.underline,
        lineHeight: boundedNumber(source.lineHeight, fallback.lineHeight, 0.8, 3),
    };
}

function numberLabelStyle(value) {
    const source = value && typeof value === "object" ? value : {};
    const fallback = DEFAULT_CHAPTER_SETTINGS.numberLabelStyle;
    return {
        fontFamily: fontFamily(source.fontFamily, fallback.fontFamily),
        fontSize: boundedNumber(source.fontSize, fallback.fontSize, 7, 48),
        color: color(source.color, fallback.color),
        letterSpacing: boundedNumber(source.letterSpacing, fallback.letterSpacing, -2, 12),
        spacing: boundedNumber(source.spacing, fallback.spacing, 0, 160),
        alignment: ["left", "center", "right"].includes(source.alignment)
            ? source.alignment : fallback.alignment,
        bold: typeof source.bold === "boolean" ? source.bold : fallback.bold,
        italic: typeof source.italic === "boolean" ? source.italic : fallback.italic,
        uppercase: typeof source.uppercase === "boolean" ? source.uppercase : fallback.uppercase,
    };
}

export function normalizeChapterSettings(value) {
    const source = value && typeof value === "object" ? value : {};
    const styles = {};
    STYLE_DEFINITIONS.forEach(({ key }) => {
        const sourceStyle = source.styles?.[key] ?? source.styles?.[LEGACY_STYLE_KEYS[key]];
        styles[key] = styleSettings(sourceStyle, DEFAULT_STYLE_SETTINGS[key]);
    });
    const preset = Object.hasOwn(SCENE_SEPARATOR_PRESETS, source.sceneSeparator?.preset)
        || source.sceneSeparator?.preset === "custom"
        ? source.sceneSeparator.preset : DEFAULT_CHAPTER_SETTINGS.sceneSeparator.preset;
    const custom = String(source.sceneSeparator?.custom || "\u25c6").trim().slice(0, 24) || "\u25c6";
    const openingMode = ["none", "character", "word", "sentence"].includes(source.opening?.mode)
        ? source.opening.mode : "none";
    return {
        numberLabel: numberLabel(source.numberLabel ?? DEFAULT_CHAPTER_SETTINGS.numberLabel),
        templateNumberLabel: numberLabel(
            source.templateNumberLabel ?? source.numberLabel ?? DEFAULT_CHAPTER_SETTINGS.templateNumberLabel,
        ),
        templateContent: templateDocument(source.templateContent),
        chapterName: chapterName(source.chapterName),
        numberLabelStyle: numberLabelStyle(source.numberLabelStyle),
        styles,
        sceneSeparator: { preset, custom },
        opening: {
            mode: openingMode,
            layout: ["drop", "raised", "inline"].includes(source.opening?.layout)
                ? source.opening.layout : "drop",
            fontFamily: fontFamily(source.opening?.fontFamily, "Playfair Display"),
            fontSize: boundedNumber(source.opening?.fontSize, 3.4, 0.8, 8),
            color: color(source.opening?.color, "#d9825b"),
            bold: typeof source.opening?.bold === "boolean" ? source.opening.bold : true,
            italic: typeof source.opening?.italic === "boolean" ? source.opening.italic : false,
            uppercase: typeof source.opening?.uppercase === "boolean" ? source.opening.uppercase : false,
            letterSpacing: boundedNumber(source.opening?.letterSpacing, 0, -1, 12),
        },
    };
}

export function chapterContentFromTemplate(value, chapterNumber) {
    const document = templateDocument(value);
    const number = Number.isInteger(chapterNumber) && chapterNumber > 0 ? chapterNumber : 1;
    const replaceVariables = (node) => {
        if (Array.isArray(node)) return node.map(replaceVariables);
        if (!node || typeof node !== "object") return node;
        const next = { ...node };
        if (typeof next.text === "string") {
            next.text = next.text
                .replaceAll("{chapter_number}", String(number))
                .replaceAll("@chapter_number", String(number));
        }
        if (Array.isArray(next.content)) next.content = next.content.map(replaceVariables);
        return next;
    };
    return replaceVariables(document);
}

export function chapterNumberLabel(settings, chapterNumber) {
    const customLabel = numberLabel(settings?.numberLabel);
    const number = Number.isInteger(chapterNumber) && chapterNumber > 0 ? chapterNumber : 1;
    return (customLabel || DEFAULT_CHAPTER_SETTINGS.numberLabel)
        .replaceAll("{chapter_number}", String(number))
        .replaceAll("@chapter_number", String(number));
}

export function sceneSeparatorSymbol(settings) {
    const normalized = normalizeChapterSettings(settings);
    return normalized.sceneSeparator.preset === "custom"
        ? normalized.sceneSeparator.custom
        : SCENE_SEPARATOR_PRESETS[normalized.sceneSeparator.preset];
}

export function openingTextRange(text, mode) {
    if (!["character", "word", "sentence"].includes(mode)) return null;
    const value = String(text || "");
    const firstCharacter = /\S/u.exec(value);
    if (!firstCharacter) return null;
    const from = firstCharacter.index;
    const remainder = value.slice(from);
    const match = mode === "sentence"
        ? /^(?:.*?[.!?](?=\s|$)|.*$)/u.exec(remainder)
        : mode === "word" ? /^\S+/u.exec(remainder) : /^\S/u.exec(remainder);
    return match?.[0] ? { from, to: from + match[0].length } : null;
}

export function styleKeyForAttributes(attributes = {}) {
    if (!attributes.level) return "normal";
    return ({ 1: "h1", 2: "h2", 3: "h3", 4: "h4" })[attributes.level] || "normal";
}

export function settingsWithMatchedTextStyle(value, styleKey, selection = {}) {
    const settings = normalizeChapterSettings(value);
    if (!Object.hasOwn(settings.styles, styleKey)) return settings;
    const current = settings.styles[styleKey];
    const textStyle = selection.textStyle && typeof selection.textStyle === "object"
        ? selection.textStyle : {};
    const block = selection.blockAttributes && typeof selection.blockAttributes === "object"
        ? selection.blockAttributes : {};
    const marks = new Set(Array.isArray(selection.marks) ? selection.marks : []);
    const parsedFontSize = Number.parseFloat(textStyle.fontSize);
    settings.styles[styleKey] = {
        ...current,
        fontFamily: textStyle.fontFamily || current.fontFamily,
        fontSize: Number.isFinite(parsedFontSize) ? parsedFontSize : current.fontSize,
        color: textStyle.color || current.color,
        alignment: block.textAlign || current.alignment,
        lineHeight: Number(textStyle.lineHeight) || current.lineHeight,
        bold: marks.has("bold") || current.bold,
        italic: marks.has("italic") || current.italic,
        underline: marks.has("underline") || current.underline,
    };
    return normalizeChapterSettings(settings);
}

export function chapterVariableQuery(value, cursorPosition) {
    const text = String(value || "");
    const cursor = Math.max(0, Math.min(text.length, Number(cursorPosition) || 0));
    const match = /@([a-z_]*)$/i.exec(text.slice(0, cursor));
    if (!match) return null;
    return { from: cursor - match[0].length, to: cursor, query: match[1].toLowerCase() };
}

export function insertChapterNumberVariable(value, cursorPosition) {
    const text = String(value || "");
    const query = chapterVariableQuery(text, cursorPosition);
    if (!query) return null;
    const token = "@chapter_number";
    return {
        value: `${text.slice(0, query.from)}${token}${text.slice(query.to)}`,
        cursor: query.from + token.length,
    };
}

export function applyChapterSettings(article, value) {
    const settings = normalizeChapterSettings(value);
    const label = settings.numberLabelStyle;
    article.style.setProperty("--chapter-label-family", `"${label.fontFamily}"`);
    article.style.setProperty("--chapter-label-size", `${label.fontSize}px`);
    article.style.setProperty("--chapter-label-color", label.color);
    article.style.setProperty("--chapter-label-tracking", `${label.letterSpacing}px`);
    article.style.setProperty("--chapter-label-gap", `${label.spacing}px`);
    article.style.setProperty("--chapter-label-align", label.alignment);
    article.style.setProperty("--chapter-label-weight", label.bold ? "700" : "400");
    article.style.setProperty("--chapter-label-style", label.italic ? "italic" : "normal");
    article.style.setProperty("--chapter-label-transform", label.uppercase ? "uppercase" : "none");
    STYLE_DEFINITIONS.forEach(({ key }) => {
        const style = settings.styles[key];
        const prefix = `--chapter-${key}`;
        article.style.setProperty(`${prefix}-family`, `"${style.fontFamily}"`);
        article.style.setProperty(`${prefix}-size`, `${style.fontSize}px`);
        article.style.setProperty(`${prefix}-color`, style.color);
        article.style.setProperty(`${prefix}-align`, style.alignment);
        article.style.setProperty(`${prefix}-weight`, style.bold ? "700" : "400");
        article.style.setProperty(`${prefix}-style`, style.italic ? "italic" : "normal");
        article.style.setProperty(`${prefix}-decoration`, style.underline ? "underline" : "none");
        article.style.setProperty(`${prefix}-line-height`, String(style.lineHeight));
    });
    const opening = settings.opening;
    article.dataset.openingLayout = opening.layout;
    article.dataset.openingMode = opening.mode;
    article.style.setProperty("--chapter-scene-symbol", JSON.stringify(sceneSeparatorSymbol(settings)));
    article.style.setProperty("--chapter-opening-family", `"${opening.fontFamily}"`);
    article.style.setProperty("--chapter-opening-size", `${opening.fontSize}em`);
    article.style.setProperty("--chapter-opening-color", opening.color);
    article.style.setProperty("--chapter-opening-weight", opening.bold ? "700" : "400");
    article.style.setProperty("--chapter-opening-style", opening.italic ? "italic" : "normal");
    article.style.setProperty("--chapter-opening-transform", opening.uppercase ? "uppercase" : "none");
    article.style.setProperty("--chapter-opening-tracking", `${opening.letterSpacing}px`);
    return settings;
}
