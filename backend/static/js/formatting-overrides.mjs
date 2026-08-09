export const INLINE_FORMATS = Object.freeze({
    bold: Object.freeze({
        inheritedProperty: "bold",
        overrideAttribute: "boldOverride",
        dataAttribute: "data-bold-override",
        setCommand: "setBold",
        unsetCommand: "unsetBold",
    }),
    italic: Object.freeze({
        inheritedProperty: "italic",
        overrideAttribute: "italicOverride",
        dataAttribute: "data-italic-override",
        setCommand: "setItalic",
        unsetCommand: "unsetItalic",
    }),
    underline: Object.freeze({
        inheritedProperty: "underline",
        overrideAttribute: "underlineOverride",
        dataAttribute: "data-underline-override",
        setCommand: "setUnderline",
        unsetCommand: "unsetUnderline",
    }),
    strike: Object.freeze({
        inheritedProperty: "strikethrough",
        overrideAttribute: "strikeOverride",
        dataAttribute: "data-strike-override",
        setCommand: "setStrike",
        unsetCommand: "unsetStrike",
    }),
});

export function inheritedFormatIsActive(style, format) {
    const config = INLINE_FORMATS[format];
    return Boolean(config && style?.[config.inheritedProperty]);
}

export function effectiveFormatIsActive({ inherited = false, marked = false, override = null } = {}) {
    if (override === "off") return false;
    return Boolean(marked || inherited);
}
